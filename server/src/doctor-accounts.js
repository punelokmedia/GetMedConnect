import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const accountView = account => ({ doctorId: account.doctorId, loginEmail: account.loginEmail, loginEnabled: account.loginEnabled, mustChangePassword: account.mustChangePassword });
const fail = (status, message) => Object.assign(new Error(message), { status });
const temporaryPassword = () => `Gmc!${randomBytes(18).toString('base64url')}`;
const idSchema = z.uuid();

export function createDoctorAccountService({ accounts, auth }) {
  function ready() { if (!accounts || !auth) throw fail(503, 'Doctor login setup is incomplete. Configure Firebase Admin credentials and apply database migrations.'); }
  async function requireAccount(id) { ready(); const account = await accounts.getByDoctor(id); if (!account) throw fail(404, 'Create a doctor login first.'); return account; }
  return {
    async list() { if (!accounts) return []; return (await accounts.list()).map(accountView); },
    async create(id) {
      ready();
      const doctor = await accounts.doctor(id);
      if (!doctor) throw fail(404, 'Doctor not found.');
      if (await accounts.getByDoctor(id)) throw fail(409, 'This doctor already has a login. Use Reset password.');
      const password = temporaryPassword();
      const user = await auth.createUser({ uid: `gmc-doctor-${id}`, email: doctor.email, displayName: doctor.name, password, disabled: true });
      try { await accounts.create({ doctorId: id, firebaseUid: user.uid, loginEmail: doctor.email.toLowerCase() }); }
      catch (error) { await auth.deleteUser(user.uid).catch(() => {}); throw error; }
      // Fail closed if either activation step fails; admin can reset/enable the linked account.
      await auth.updateUser(user.uid, { disabled: false });
      await accounts.setEnabled(id, true);
      return { email: doctor.email, temporaryPassword: password };
    },
    async reset(id) {
      const account = await requireAccount(id);
      const password = temporaryPassword();
      await accounts.requirePasswordChange(id);
      await auth.updateUser(account.firebaseUid, { password });
      await auth.revokeRefreshTokens(account.firebaseUid);
      return { email: account.loginEmail, temporaryPassword: password };
    },
    async setEnabled(id, enabled) {
      const account = await requireAccount(id);
      if (!enabled) await accounts.setEnabled(id, false);
      await auth.updateUser(account.firebaseUid, { disabled: !enabled });
      if (enabled) await accounts.setEnabled(id, true);
      else await auth.revokeRefreshTokens(account.firebaseUid);
      return { success: true };
    },
  };
}

function accountError(error, _req, res, _next) {
  const messages = { 'auth/email-already-exists': 'That email already has a Firebase account. Use a different doctor email or contact the administrator.', 'auth/uid-already-exists': 'A Firebase account already exists for this doctor. Contact the administrator to reconcile it.', 'auth/insufficient-permission': 'Firebase service account needs permission to manage Authentication users.' };
  const message = error.status ? error.message : messages[error.code] || 'Doctor account operation failed. Please retry or check the server configuration.';
  res.status(error.status || (error.code === '23505' ? 409 : 503)).json({ error: message });
}

// Mount only after the admin authorization middleware.
export function doctorAccountAdminRouter(service) {
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/doctor-accounts', async (_req, res) => res.json({ accounts: await service.list() }));
  router.use('/doctors/:doctorId/account', (req, res, next) => { if (!idSchema.safeParse(req.params.doctorId).success) return res.status(400).json({ error: 'Invalid doctor ID.' }); next(); });
  router.post('/doctors/:id/account', async (req, res) => res.status(201).json(await service.create(req.params.id)));
  router.post('/doctors/:id/account/reset', async (req, res) => res.json(await service.reset(req.params.id)));
  router.patch('/doctors/:id/account', async (req, res) => {
    const parsed = z.object({ enabled: z.boolean() }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Provide an enabled value.' });
    res.json(await service.setEnabled(req.params.id, parsed.data.enabled));
  });
  router.use(accountError);
  return router;
}

export function createDoctorPortalRouter({ accounts, auth }) {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(async (req, res, next) => {
    if (!accounts || !auth) return res.status(503).json({ error: 'Doctor login is not configured on the server.' });
    const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in with your admin-provided account.' });
    let identity;
    try { identity = await auth.verifyIdToken(token, true); }
    catch { return res.status(401).json({ error: 'Your session expired or access was disabled. Sign in again.' }); }
    const account = await accounts.getByUid(identity.uid);
    if (!account?.loginEnabled) return res.status(403).json({ error: 'No enabled doctor account is linked to this login. Contact your administrator.' });
    if (!identity.auth_time || identity.auth_time * 1000 < new Date(account.credentialsIssuedAt).getTime()) return res.status(401).json({ error: 'Your credentials changed. Wait a moment and sign in again.' });
    req.doctorAccount = account;
    next();
  });
  router.get('/me', async (req, res) => {
    const doctor = await accounts.doctor(req.doctorAccount.doctorId);
    res.json({ doctor, account: accountView(req.doctorAccount) });
  });
  router.post('/password', async (req, res) => {
    const parsed = z.object({ password: z.string().min(12).max(128) }).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Use a password with 12–128 characters.' });
    await accounts.requirePasswordChange(req.doctorAccount.doctorId);
    await auth.updateUser(req.doctorAccount.firebaseUid, { password: parsed.data.password });
    await auth.revokeRefreshTokens(req.doctorAccount.firebaseUid);
    await accounts.passwordChanged(req.doctorAccount.doctorId);
    res.json({ success: true, signInAgain: true });
  });
  router.use((req, res, next) => {
    if (req.doctorAccount.mustChangePassword) return res.status(403).json({ error: 'Change your temporary password before accessing patients.', code: 'PASSWORD_CHANGE_REQUIRED' });
    next();
  });
  router.get('/appointments', async (req, res) => res.json({ appointments: await accounts.appointments(req.doctorAccount.doctorId) }));
  router.patch('/appointments/:id', async (req, res) => {
    const parsed = z.object({ status: z.enum(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-show']), outcome: z.enum(['Pending', 'Converted', 'Not converted']) }).strict().safeParse(req.body);
    if (!idSchema.safeParse(req.params.id).success || !parsed.success || (parsed.data.outcome !== 'Pending' && parsed.data.status !== 'Completed')) return res.status(400).json({ error: 'Check appointment status and conversion.' });
    const updated = await accounts.updateAppointment(req.doctorAccount.doctorId, req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Appointment not found.' });
    res.json(updated);
  });
  router.use(accountError);
  return router;
}
