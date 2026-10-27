import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('API validates consent, routes patient and clinic columns, and handles storage failure', async () => {
  const rows = [];
  let fail = false;
  const app = createApp({ append: async (tab, row) => { if (fail) throw new Error('offline'); rows.push({ tab, row }); } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const data = { name: 'Test Person', phone: '9876543210', specialty: 'Dental Care', city: 'Pune', pin: '411048', consent: true, website: '' };
  const post = (type, value) => fetch(`${base}/api/enquiries/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await post('patient', { ...data, consent: false })).status, 400);
    assert.equal((await post('patient', { ...data, phone: '123' })).status, 400);
    assert.equal(rows.length, 0);
    assert.equal((await post('patient', data)).status, 201);
    assert.equal(rows[0].tab, 'Patient_Enquiries');
    assert.equal(rows[0].row.length, 11);
    assert.equal(rows[0].row[7], '411048');
    assert.equal((await post('clinic', { ...data, clinicName: 'Test Clinic' })).status, 201);
    assert.equal(rows[1].tab, 'Clinic_Enquiries');
    assert.equal(rows[1].row.length, 11);
    assert.equal(rows[1].row[2], 'Test Clinic');
    assert.equal(rows[1].row[3], 'Test Person');
    fail = true;
    assert.equal((await post('patient', data)).status, 503);
    assert.equal((await post('other', data)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('CORS accepts both local frontend addresses and excludes other origins', async () => {
  const app = createApp({ append: async () => {} });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/enquiries/patient`;
  try {
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.match(response.headers.get('access-control-allow-methods'), /POST/);
      assert.match(response.headers.get('access-control-allow-headers'), /content-type/i);
    }
    const response = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://other.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
