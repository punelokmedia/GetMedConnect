import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { profileSchema } from '../src/doctor-profiles.js';
import { createDoctorPortalRouter } from '../src/doctor-accounts.js';
import { createAdminRouter } from '../src/admin.js';
import { createPublicDoctorsRouter } from '../src/public-doctors.js';

const values = { name: 'Dr Test', email: 'contact@example.com', phone: '9876543210', gender: 'Female', age: '38', specialty: 'Orthopedics', city: 'Pune', qualification: 'MBBS', experience: '12', registration: 'TEST-123', council: 'State Council', clinic: 'Test Clinic', address: 'Test Road', pincode: '411038', bio: 'Consultant', modes: ['In-Clinic'], services: ['Joint care'], photo: '' };

test('profile validation rejects privilege changes, invalid fields, and unsafe images', () => {
  assert.equal(profileSchema.safeParse(values).success, true);
  for (const extra of [{ doctorId: randomUUID() }, { status: 'Active' }, { loginEnabled: true }, { photo: 'data:image/svg+xml;base64,AAAA' }, { photo: 'data:image/png;base64,AAAA' }, { age: 12 }, { experience: -1 }, { modes: [] }, { services: [] }, { pincode: 'abc' }]) assert.equal(profileSchema.safeParse({ ...values, ...extra }).success, false);
});

test('doctor saves only own profile; admin shares it; public projection excludes private identity', async () => {
  const id = randomUUID(); const other = randomUUID();
  const records = new Map([[id, { id, ...values, status: 'Active' }], [other, { id: other, ...values, status: 'Pending' }]]);
  let mustChangePassword = false;
  const profiles = {
    get: async id => records.get(id),
    update: async (id, data) => { if (!records.has(id)) return null; const next = { ...records.get(id), ...data }; records.set(id, next); return next; },
    publicPhoto: async key => records.get(key)?.status === 'Active' ? records.get(key).photo : null,
  };
  const account = { doctorId: id, loginEmail: 'login@example.com', loginEnabled: true, credentialsIssuedAt: new Date(0) };
  const accounts = { getByUid: async uid => uid === 'doctor' ? { ...account, mustChangePassword } : null };
  const auth = { verifyIdToken: async token => { if (token !== 'doctor') throw Error(); return { uid: token, auth_time: Date.now() / 1000 }; } };
  const store = { read: async () => ({ doctors: [...records.values()].map(row => ({ ...row, profile: row })) }) };
  const app = express(); app.use(express.json());
  app.use('/api/doctor', createDoctorPortalRouter({ accounts, auth, profiles }));
  app.use('/api/admin', createAdminRouter({ token: 'admin', store, profiles }));
  app.use('/api/doctors', createPublicDoctorsRouter({ store, profiles }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, token, body, method = 'GET') { const result = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: result.status, data: await result.json() }; }
  try {
    assert.equal((await request('/api/doctor/profile', 'bad', values, 'PUT')).status, 401);
    mustChangePassword = true;
    assert.equal((await request('/api/doctor/profile', 'doctor', values, 'PUT')).status, 403);
    mustChangePassword = false;
    assert.equal((await request('/api/doctor/profile', 'doctor', { ...values, doctorId: other }, 'PUT')).status, 400);
    assert.equal((await request(`/api/admin/doctors/${id}/profile`, 'bad')).status, 401);
    assert.equal((await request('/api/doctor/profile', 'doctor', { ...values, bio: 'Updated by doctor' }, 'PUT')).status, 200);
    assert.equal(records.get(other).bio, 'Consultant');
    assert.equal((await request(`/api/admin/doctors/${id}/profile`, 'admin')).data.doctor.bio, 'Updated by doctor');
    assert.equal((await request(`/api/admin/doctors/${id}/profile`, 'admin', { ...values, bio: 'Updated by admin' }, 'PUT')).status, 200);
    assert.equal((await request('/api/doctor/me', 'doctor')).data.doctor.bio, 'Updated by admin');
    assert.equal((await request('/api/doctor/me', 'doctor')).data.account.loginEmail, 'login@example.com');
    const visible = (await request(`/api/doctors/${id}`)).data.doctor;
    assert.equal(visible.bio, 'Updated by admin');
    assert.equal(visible.clinic, 'Test Clinic');
    for (const key of ['email', 'phone', 'age', 'gender', 'registration', 'council', 'status', 'photo']) assert.equal(visible[key], undefined);
    assert.equal((await request(`/api/doctors/${other}`)).status, 404);
    const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFuoAAAAASUVORK5CYII=';
    assert.equal((await request('/api/doctor/profile', 'doctor', { ...values, photo }, 'PUT')).status, 200);
    const image = await fetch(`${base}/api/doctors/${id}/photo`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(photo.split(',')[1], 'base64'));
    records.get(id).status = 'Inactive';
    assert.equal((await request(`/api/doctors/${id}`)).status, 404);
    assert.equal((await fetch(`${base}/api/doctors/${id}/photo`)).status, 404);
    assert.equal((await request(`/api/admin/doctors/${randomUUID()}/profile`, 'admin', values, 'PUT')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
