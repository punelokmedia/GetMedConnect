import '../src/env.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createRealtimeClient } from '@neon/realtime/client';
import { createPool } from '../src/database.js';

// Creates synthetic records in the configured branch and deletes only those IDs.
if (!process.env.DATABASE_URL || !process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) {
  throw new Error('Neon environment is missing. Sign in and run neon deploy before the live test.');
}
const token = randomBytes(32).toString('hex');
const port = process.env.NEON_TEST_PORT || '4109';
const base = `http://127.0.0.1:${port}/api/admin`;
const processHandle = spawn(process.execPath, [fileURLToPath(new URL('../src/index.js', import.meta.url))], {
  env: { ...process.env, PORT: port, ADMIN_API_TOKEN: token }, stdio: 'ignore', windowsHide: true,
});
const pool = createPool();
const ids = {};
let realtime;
async function request(path, body, method = 'POST', expected = 201) {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, expected, `${method} ${path} returned ${response.status}`);
  return response.json();
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (processHandle.exitCode !== null) throw new Error('API process exited before startup.');
    try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, 'API did not start.');
  assert.equal((await fetch(`${base}/records`)).status, 401);
  assert.equal((await fetch(`${base}/live/leads`)).status, 401);
  console.log('PASS: running Express app rejects unauthenticated records and live-query requests.');

  const queries = {};
  for (const collection of ['leads', 'doctors', 'appointments']) queries[collection] = await request(`/live/${collection}`, undefined, 'GET', 200);
  realtime = createRealtimeClient({ url: queries.leads.url });
  const subscriptions = Object.fromEntries(Object.entries(queries).map(([key, value]) => [key, realtime.subscribe(value.sealedQuery)]));
  await Promise.all(Object.values(subscriptions).map(subscription => subscription.awaitRows(() => true, 30000)));
  console.log('PASS: all three authenticated Neon Realtime subscriptions received initial rows.');

  const tag = randomUUID();
  const lead = await request('/leads', { name: `Synthetic QA ${tag}`, phone: '0000000000', specialty: 'QA consultation', city: 'Test city', source: 'Automated verification' });
  ids.lead = lead.id;
  await subscriptions.leads.awaitRows(rows => rows.some(row => row.id === lead.id), 20000);
  const doctor = await request('/doctors', { name: `Synthetic QA Doctor ${tag}`, email: `qa-${tag}@example.invalid`, phone: '0000000000', specialty: 'QA consultation', city: 'Test city', registrationNumber: `QA-${tag}`, status: 'Active' });
  ids.doctor = doctor.id;
  await subscriptions.doctors.awaitRows(rows => rows.some(row => row.id === doctor.id), 20000);
  const booking = { leadId: lead.id, doctorId: doctor.id, scheduledAt: new Date(Date.now() + 86400000).toISOString() };
  const appointment = await request('/appointments', booking);
  ids.appointment = appointment.id;
  await subscriptions.appointments.awaitRows(rows => rows.some(row => row.id === appointment.id), 20000);
  console.log('PASS: API-created lead, doctor and appointment arrived through live WebSocket queries.');

  await request('/appointments', booking, 'POST', 400);
  await request(`/appointments/${appointment.id}`, { outcome: 'Converted' }, 'PATCH', 400);
  await request(`/appointments/${appointment.id}`, { status: 'Completed', outcome: 'Converted' }, 'PATCH', 200);
  await subscriptions.appointments.awaitRows(rows => rows.some(row => row.id === appointment.id && row.outcome === 'Converted'), 20000);
  const stored = await pool.query('SELECT status, outcome FROM gmc.appointments WHERE id = $1', [appointment.id]);
  assert.deepEqual(stored.rows[0], { status: 'Completed', outcome: 'Converted' });
  const records = await request('/records', undefined, 'GET', 200);
  assert.equal(records.appointments.find(row => row.id === appointment.id).outcome, 'Converted');
  console.log('PASS: appointment validation, conversion, independent PostgreSQL read and HTTP reload.');
  const publicBase = `http://127.0.0.1:${port}/api/doctors`;
  const profile = await (await fetch(`${publicBase}/${doctor.id}`)).json();
  assert.equal(profile.doctor.name, doctor.name);
  assert.deepEqual(Object.keys(profile.doctor).sort(), ['city', 'id', 'name', 'specialty']);
  const directory = await (await fetch(`${publicBase}?q=${encodeURIComponent(tag)}&city=Test%20city`)).json();
  assert.ok(directory.doctors.some(row => row.id === doctor.id));
  await request(`/doctors/${doctor.id}`, { status: 'Inactive' }, 'PATCH', 200);
  assert.equal((await fetch(`${publicBase}/${doctor.id}`)).status, 404);
  assert.equal((await (await fetch(`${publicBase}?q=${encodeURIComponent(tag)}`)).json()).doctors.length, 0);
  await request(`/doctors/${doctor.id}`, { status: 'Active' }, 'PATCH', 200);
  assert.equal((await fetch(`${publicBase}/${doctor.id}`)).status, 200);
  console.log('PASS: admin doctor publication, public search/profile, private-field exclusion, deactivation and reactivation.');
} finally {
  realtime?.close();
  try {
    if (ids.appointment) await pool.query('DELETE FROM gmc.appointments WHERE id = $1', [ids.appointment]);
    if (ids.doctor) await pool.query('DELETE FROM gmc.doctors WHERE id = $1', [ids.doctor]);
    if (ids.lead) await pool.query('DELETE FROM gmc.leads WHERE id = $1', [ids.lead]);
    console.log('Synthetic verification records cleaned up.');
  } finally { await pool.end(); processHandle.kill(); }
}
// The Realtime SDK can retain transport timers after close on Windows. All
// assertions and awaited cleanup above have completed; finish this standalone verifier.
process.exit(0);
