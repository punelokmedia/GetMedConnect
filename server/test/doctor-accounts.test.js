import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { createAdminRouter } from '../src/admin.js';
import { createDoctorAccountService, createDoctorPortalRouter } from '../src/doctor-accounts.js';

test('admin provisions doctor logins, requires password replacement, enforces ownership, and revokes disabled access', async () => {
  const doctorA = { id: randomUUID(), name: 'Doctor A', email: 'a@example.invalid', phone: '9876543210' };
  const doctorB = { id: randomUUID(), name: 'Doctor B', email: 'b@example.invalid' };
  const rows = [];
  const appointments = [{ id: randomUUID(), doctorId: doctorA.id, status: 'Scheduled', outcome: 'Pending' }, { id: randomUUID(), doctorId: doctorB.id, status: 'Scheduled', outcome: 'Pending' }];
  const users = new Map();
  let revocations = 0;
  let phoneIdentity = null;
  const accounts = {
    list: async () => rows,
    doctor: async id => [doctorA, doctorB].find(row => row.id === id),
    getByDoctor: async id => rows.find(row => row.doctorId === id),
    getByUid: async uid => rows.find(row => row.firebaseUid === uid),
    create: async data => rows.push({ ...data, loginEnabled: false, mustChangePassword: true, credentialsIssuedAt: new Date(0) }),
    setEnabled: async (id, enabled) => { rows.find(row => row.doctorId === id).loginEnabled = enabled; },
    requirePasswordChange: async id => { rows.find(row => row.doctorId === id).mustChangePassword = true; },
    passwordChanged: async id => { rows.find(row => row.doctorId === id).mustChangePassword = false; },
    appointments: async id => appointments.filter(row => row.doctorId === id),
    updateAppointment: async (doctorId, id, change) => { const row = appointments.find(row => row.doctorId === doctorId && row.id === id); if (row) Object.assign(row, change); return row; },
  };
  const auth = {
    createUser: async data => { users.set(data.uid, { ...data }); return { uid: data.uid }; },
    updateUser: async (uid, change) => Object.assign(users.get(uid), change),
    deleteUser: async uid => users.delete(uid),
    revokeRefreshTokens: async () => { revocations++; },
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(checkRevoked, true);
      if (!users.has(token) || users.get(token).disabled) throw new Error('Unauthorized');
      return { ...(phoneIdentity || {}), uid: token, auth_time: Math.floor(Date.now() / 1000) };
    },
  };
  const emails = [];
  const notifyEmail = async payload => { emails.push(payload); if (payload.event === 'reset') throw new Error('provider failure'); return { status: 'accepted' }; };
  const app = express();
  app.use(express.json());
  app.use('/api/admin', createAdminRouter({ store: { read: async () => ({ doctors: [doctorA, doctorB] }) }, token: 'admin-test', accountService: createDoctorAccountService({ accounts, auth, notifyEmail }) }));
  app.use('/api/doctor', createDoctorPortalRouter({ accounts, auth, notifyEmail }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, token, body, method = 'GET') {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  }
  try {
    const route = `/api/admin/doctors/${doctorA.id}/account`;
    assert.equal((await request(route, 'wrong', {}, 'POST')).status, 401);
    assert.equal((await request('/api/admin/doctors/bad-id/account', 'admin-test', {}, 'POST')).status, 400);
    const created = await request(route, 'admin-test', {}, 'POST');
    assert.equal(created.status, 201);
    assert.equal(created.data.email, doctorA.email);
    assert.equal(emails[0].email, doctorA.email);
    assert.equal(emails[0].temporaryPassword, created.data.temporaryPassword);
    assert.equal(created.data.emailNotification.status, 'accepted');
    assert.ok(created.data.temporaryPassword.length > 20);
    assert.equal((await request(route, 'admin-test', {}, 'POST')).status, 409);
    assert.equal(JSON.stringify(rows).includes(created.data.temporaryPassword), false);
    const uid = `gmc-doctor-${doctorA.id}`;
    assert.equal(users.get(uid).phoneNumber, '+919876543210');
    assert.equal((await request(`${route}/phone`, 'wrong', {}, 'POST')).status, 401);
    assert.equal((await request(`${route}/phone`, 'admin-test', {}, 'POST')).status, 200);
    phoneIdentity = { firebase: { sign_in_provider: 'phone' }, phone_number: '+919876543211' };
    assert.equal((await request('/api/doctor/me', uid)).status, 403);
    phoneIdentity.phone_number = '+919876543210';
    assert.equal((await request('/api/doctor/me', uid)).status, 200);
    phoneIdentity = null;
    assert.equal((await request('/api/doctor/me', 'unregistered-user')).status, 401);
    users.set('self-created-account', {});
    assert.equal((await request('/api/doctor/me', 'self-created-account')).status, 403);
    assert.equal((await request('/api/doctor/me', uid)).data.account.mustChangePassword, true);
    assert.equal((await request('/api/doctor/appointments', uid)).data.code, 'PASSWORD_CHANGE_REQUIRED');
    const short = await request('/api/doctor/password', uid, { password: 'short' }, 'POST');
    assert.equal(short.status, 400);
    assert.equal(short.data.error, 'Password must contain at least 8 characters.');
    assert.equal((await request('/api/doctor/password', uid, { password: '12345678' }, 'POST')).status, 400);
    assert.equal((await request('/api/doctor/password', uid, { password: 'Replacement-password-123!' }, 'POST')).status, 200);
    const own = await request(`/api/doctor/appointments?doctorId=${doctorB.id}`, uid);
    assert.equal(own.data.appointments.length, 1);
    assert.equal(own.data.appointments[0].id, appointments[0].id);
    assert.equal((await request(`/api/doctor/appointments/${appointments[1].id}`, uid, { status: 'Completed', outcome: 'Converted' }, 'PATCH')).status, 404);
    assert.equal((await request(`/api/doctor/appointments/${appointments[0].id}`, uid, { status: 'Completed', outcome: 'Converted' }, 'PATCH')).status, 200);
    const reset = await request(`${route}/reset`, 'admin-test', {}, 'POST');
    assert.equal(reset.status, 200);
    assert.equal(reset.data.emailNotification.status, 'failed');
    assert.equal(emails.at(-1).email, doctorA.email);
    assert.equal((await request('/api/doctor/appointments', uid)).status, 403);
    assert.equal((await request(route, 'admin-test', { enabled: false }, 'PATCH')).status, 200);
    assert.equal((await request('/api/doctor/me', uid)).status, 401);
    assert.equal((await request(route, 'admin-test', { enabled: true }, 'PATCH')).status, 200);
    const summary = await request('/api/admin/doctor-accounts', 'admin-test');
    assert.equal(summary.data.accounts[0].firebaseUid, undefined);
    assert.equal(summary.data.accounts[0].loginEnabled, true);
    assert.ok(revocations >= 3);
    rows[0].credentialsIssuedAt = new Date(Date.now() + 10000);
    assert.equal((await request('/api/doctor/me', uid)).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
