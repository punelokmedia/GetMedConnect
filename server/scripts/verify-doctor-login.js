import '../src/env.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import { createPool } from '../src/database.js';
import { getDoctorAuth } from '../src/firebase-admin.js';

const web = dotenv.parse(await readFile(new URL('../../doctor/.env', import.meta.url), 'utf8'));
const auth = getDoctorAuth();
assert.ok(auth && process.env.DATABASE_URL && web.VITE_FIREBASE_API_KEY, 'Configure Firebase Admin, doctor web config and Neon first.');
assert.equal(web.VITE_FIREBASE_PROJECT_ID, process.env.FIREBASE_PROJECT_ID, 'Doctor web app must use the same Firebase project as the server.');
const pool = createPool();
const tag = randomUUID();
const adminToken = randomBytes(32).toString('hex');
const port = process.env.DOCTOR_TEST_PORT || '4112';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [fileURLToPath(new URL('../src/index.js', import.meta.url))], { env: { ...process.env, PORT: port, ADMIN_API_TOKEN: adminToken }, stdio: 'ignore', windowsHide: true });
const ids = { doctors: [], appointments: [] };
let uid;
async function api(path, { token = adminToken, body, method = 'GET', expected = 200 } = {}) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, expected, `${method} ${path} returned HTTP ${response.status}`);
  return response.json();
}
async function firebase(method, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${web.VITE_FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}
async function signIn(email, password) {
  const result = await firebase('signInWithPassword', { email, password, returnSecureToken: true });
  assert.ok(result.ok, `Firebase sign-in failed: ${result.data.error?.message || result.status}`);
  return result.data.idToken;
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('API exited before startup.');
    try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, 'API startup failed.');
  const signup = await firebase('signUp', { email: `qa-signup-${tag}@example.com`, password: randomBytes(24).toString('base64url'), returnSecureToken: true });
  if (signup.data.localId) await auth.deleteUser(signup.data.localId);
  assert.equal(signup.ok, false, 'End-user signup must be blocked.');
  assert.match(signup.data.error?.message || '', /ADMIN_ONLY_OPERATION|OPERATION_NOT_ALLOWED|USER_SIGNUP_DISABLED/);
  console.log('PASS: Firebase rejects direct end-user self-registration.');

  const lead = await api('/admin/leads', { method: 'POST', expected: 201, body: { name: `QA patient ${tag}`, phone: '0000000000', specialty: 'QA care', city: 'Test city' } });
  ids.lead = lead.id;
  for (const suffix of ['a', 'b']) {
    const doctor = await api('/admin/doctors', { method: 'POST', expected: 201, body: { name: `QA Doctor ${suffix} ${tag}`, email: `qa-${suffix}-${tag}@example.com`, phone: '0000000000', specialty: 'QA care', city: 'Test city', registrationNumber: `QA-${suffix}-${tag}`, status: 'Active' } });
    ids.doctors.push(doctor.id);
    const appointment = await api('/admin/appointments', { method: 'POST', expected: 201, body: { leadId: lead.id, doctorId: doctor.id, scheduledAt: new Date(Date.now() + 86400000).toISOString() } });
    ids.appointments.push(appointment.id);
  }
  // Deterministic uid also lets cleanup remove an account if provisioning fails after creation.
  uid = `gmc-doctor-${ids.doctors[0]}`;
  const credentials = await api(`/admin/doctors/${ids.doctors[0]}/account`, { method: 'POST', expected: 201, body: {} });
  await delay(1100);
  const temporaryToken = await signIn(credentials.email, credentials.temporaryPassword);
  const first = await api('/doctor/me', { token: temporaryToken });
  assert.equal(first.doctor.id, ids.doctors[0]);
  assert.equal(first.account.mustChangePassword, true);
  await api('/doctor/appointments', { token: temporaryToken, expected: 403 });
  console.log('PASS: admin creates Firebase credentials; real sign-in requires temporary-password replacement.');

  const password = `QA!${randomBytes(24).toString('base64url')}`;
  await api('/doctor/password', { token: temporaryToken, method: 'POST', body: { password } });
  await delay(1100);
  const token = await signIn(credentials.email, password);
  const records = await api('/doctor/appointments', { token });
  assert.equal(records.appointments.length, 1);
  assert.equal(records.appointments[0].id, ids.appointments[0]);
  await api(`/doctor/appointments/${ids.appointments[1]}`, { token, method: 'PATCH', expected: 404, body: { status: 'Completed', outcome: 'Converted' } });
  await api(`/doctor/appointments/${ids.appointments[0]}`, { token, method: 'PATCH', body: { status: 'Completed', outcome: 'Converted' } });
  const stored = await pool.query('SELECT outcome FROM gmc.appointments WHERE id = $1', [ids.appointments[0]]);
  assert.equal(stored.rows[0].outcome, 'Converted');
  console.log('PASS: doctor sees only assigned appointments, cannot modify another doctor’s appointment, and saves conversion.');

  await api(`/admin/doctors/${ids.doctors[0]}/account`, { method: 'PATCH', body: { enabled: false } });
  await api('/doctor/me', { token, expected: 401 });
  const disabledSignIn = await firebase('signInWithPassword', { email: credentials.email, password, returnSecureToken: true });
  assert.equal(disabledSignIn.ok, false);
  await api(`/admin/doctors/${ids.doctors[0]}/account`, { method: 'PATCH', body: { enabled: true } });
  const reset = await api(`/admin/doctors/${ids.doctors[0]}/account/reset`, { method: 'POST', body: {} });
  await api('/doctor/me', { token, expected: 401 });
  await delay(1100);
  const resetToken = await signIn(reset.email, reset.temporaryPassword);
  assert.equal((await api('/doctor/me', { token: resetToken })).account.mustChangePassword, true);
  await api('/doctor/appointments', { token: resetToken, expected: 403 });
  console.log('PASS: admin disable blocks Firebase sign-in; reset invalidates old sessions and requires a new password.');
} finally {
  try {
    if (uid) await auth.deleteUser(uid).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
    for (const doctorId of ids.doctors) await pool.query('DELETE FROM gmc.doctor_accounts WHERE doctor_id = $1', [doctorId]);
    for (const appointmentId of ids.appointments) await pool.query('DELETE FROM gmc.appointments WHERE id = $1', [appointmentId]);
    for (const doctorId of ids.doctors) await pool.query('DELETE FROM gmc.doctors WHERE id = $1', [doctorId]);
    if (ids.lead) await pool.query('DELETE FROM gmc.leads WHERE id = $1', [ids.lead]);
    console.log('Synthetic Firebase account and Neon test records removed.');
  } finally { await pool.end(); child.kill(); }
}
process.exit(0);
