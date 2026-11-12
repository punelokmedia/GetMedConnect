import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAdminRouter, createAdminStore } from '../src/admin.js';

test('admin access, doctor assignment, and completed appointment conversions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gmc-admin-'));
  const store = createAdminStore(join(directory, 'records.json'));
  const app = express();
  app.use(express.json());
  app.use('/api/admin', createAdminRouter({ store, token: 'test-token' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  const request = async (path, body, method = 'POST') => {
    const response = await fetch(`${base}${path}`, { method, headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    assert.equal((await fetch(`${base}/records`)).status, 401);
    const lead = await request('/leads', { name: 'Test Patient', phone: '9876543210', specialty: 'Dental', city: 'Pune' });
    assert.equal(lead.status, 201);
    const doctor = await request('/doctors', { name: 'Test Doctor', email: 'doctor@example.com', phone: '9876543211', specialty: 'Dental', city: 'Pune', registrationNumber: 'TEST-123' });
    assert.equal(doctor.status, 201);
    const booking = { leadId: lead.data.id, doctorId: doctor.data.id, scheduledAt: '2027-01-15T09:00:00.000Z' };
    assert.equal((await request('/appointments', booking)).status, 400);
    await request(`/doctors/${doctor.data.id}`, { status: 'Active' }, 'PATCH');
    const appointment = await request('/appointments', booking);
    assert.equal(appointment.status, 201);
    assert.equal((await request('/appointments', booking)).status, 400);
    assert.equal((await request(`/appointments/${appointment.data.id}`, { outcome: 'Converted' }, 'PATCH')).status, 400);
    assert.equal((await request(`/appointments/${appointment.data.id}`, { status: 'Completed', outcome: 'Converted' }, 'PATCH')).status, 200);
    const editedLead = await request('/leads/' + lead.data.id, { name: 'Updated Patient', source: 'Referral' }, 'PATCH');
    assert.equal(editedLead.data.name, 'Updated Patient');
    assert.equal(editedLead.data.phone, '9876543210');
    const editedDoctor = await request('/doctors/' + doctor.data.id, { city: 'Mumbai', email: 'updated@example.com' }, 'PATCH');
    assert.equal(editedDoctor.data.city, 'Mumbai');
    assert.equal(editedDoctor.data.registrationNumber, 'TEST-123');
    assert.equal((await request('/leads/' + lead.data.id, { phone: 'invalid' }, 'PATCH')).status, 400);
    assert.equal((await request('/doctors/' + doctor.data.id, undefined, 'DELETE')).status, 409);
    assert.equal((await request('/leads/' + lead.data.id, undefined, 'DELETE')).status, 409);
    assert.equal((await fetch(base + '/doctors/' + doctor.data.id, { method: 'DELETE' })).status, 401);
    const restored = await createAdminStore(join(directory, 'records.json')).read();
    assert.equal(restored.appointments[0].outcome, 'Converted');
    assert.equal((await request('/records', undefined, 'GET')).data.doctors.length, 1);
    assert.equal((await request('/appointments/' + appointment.data.id, undefined, 'DELETE')).status, 200);
    assert.equal((await request('/doctors/' + doctor.data.id, undefined, 'DELETE')).status, 200);
    assert.equal((await request('/leads/' + lead.data.id, undefined, 'DELETE')).status, 200);
    assert.equal((await request('/leads/' + lead.data.id, undefined, 'DELETE')).status, 404);
    assert.deepEqual(await createAdminStore(join(directory, 'records.json')).read(), { leads: [], doctors: [], appointments: [] });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
