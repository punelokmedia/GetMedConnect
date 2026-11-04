import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { createPublicDoctorsRouter } from '../src/public-doctors.js';

test('public directory exposes only active profiles, supports search and pagination, and excludes private fields', async () => {
  const doctors = Array.from({ length: 14 }, (_, index) => ({ id: randomUUID(), name: `Doctor ${String(index).padStart(2, '0')}`, specialty: 'Dental Care', city: 'Pune', status: 'Active', email: 'private@example.com', phone: '9876543210', registrationNumber: 'INTERNAL' }));
  const pending = { ...doctors[0], id: randomUUID(), name: 'Pending doctor', status: 'Pending' };
  doctors.push(pending);
  const app = express();
  app.use('/api/doctors', createPublicDoctorsRouter({ store: { read: async () => ({ doctors, leads: [{ name: 'Private patient' }] }) } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/doctors`;
  try {
    const first = await (await fetch(base)).json();
    assert.equal(first.doctors.length, 12);
    assert.equal(first.hasNext, true);
    assert.deepEqual(Object.keys(first.doctors[0]).sort(), ['city', 'id', 'name', 'specialty']);
    const next = await (await fetch(`${base}?page=2`)).json();
    assert.equal(next.doctors.length, 2);
    assert.equal(next.hasNext, false);
    assert.equal((await (await fetch(`${base}?city=Mumbai`)).json()).doctors.length, 0);
    assert.equal((await (await fetch(`${base}?q=DOCTOR%2003&city=pune&specialty=dental`)).json()).doctors.length, 1);
    assert.equal((await fetch(`${base}?page=-1`)).status, 400);
    assert.equal((await fetch(`${base}/invalid`)).status, 404);
    assert.equal((await fetch(`${base}/${pending.id}`)).status, 404);
    const visible = await (await fetch(`${base}/${doctors[0].id}`)).json();
    assert.deepEqual(Object.keys(visible.doctor).sort(), ['city', 'id', 'name', 'specialty']);
    doctors[0].status = 'Inactive';
    assert.equal((await fetch(`${base}/${doctors[0].id}`)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
