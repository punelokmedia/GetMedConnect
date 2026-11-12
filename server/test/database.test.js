import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresStore } from '../src/database.js';

function fixture(failDelete = false) {
  const records = { leads: [{ id: 'lead' }], doctors: [{ id: 'doctor' }], appointments: [{ id: 'appointment' }] };
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (failDelete && sql.startsWith('DELETE FROM gmc.doctors ')) throw new Error('Delete failed');
      const collection = Object.keys(records).find(name => sql.startsWith('SELECT ') && sql.includes(`FROM gmc.${name} `));
      return { rows: collection ? structuredClone(records[collection]) : [] };
    },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  return { store: createPostgresStore({ connect: async () => client }), calls };
}

test('Postgres deletes removed records and doctor access before committing', async () => {
  const { store, calls } = fixture();
  await store.update(data => { data.appointments = []; data.doctors = []; data.leads = []; });
  assert.deepEqual(calls.filter(call => call.sql.startsWith('DELETE')), [
    { sql: 'DELETE FROM gmc.appointments WHERE id = $1', values: ['appointment'] },
    { sql: 'DELETE FROM gmc.doctor_accounts WHERE doctor_id = $1', values: ['doctor'] },
    { sql: 'DELETE FROM gmc.doctors WHERE id = $1', values: ['doctor'] },
    { sql: 'DELETE FROM gmc.leads WHERE id = $1', values: ['lead'] },
  ]);
  assert.deepEqual(calls.slice(-2).map(call => call.sql), ['COMMIT', 'RELEASE']);
});

test('Postgres preserves unchanged records and rolls back failed deletions', async () => {
  const unchanged = fixture();
  await unchanged.store.update(() => {});
  assert.equal(unchanged.calls.some(call => /^(DELETE|INSERT)/.test(call.sql)), false);
  const failed = fixture(true);
  await assert.rejects(failed.store.update(data => { data.doctors = []; }), /Delete failed/);
  assert.equal(failed.calls.some(call => call.sql === 'COMMIT'), false);
  assert.deepEqual(failed.calls.slice(-2).map(call => call.sql), ['ROLLBACK', 'RELEASE']);
});
