import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDoctorEmailNotifier, notifySafely } from '../src/email.js';

test('credential email uses only its registered recipient; change confirmation omits passwords', async () => {
  const calls = [];
  const notify = createDoctorEmailNotifier({ env: { RESEND_API_KEY: 'test', NOTIFICATION_FROM_EMAIL: 'accounts@example.com' }, fetchImpl: async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'email-id' }) };
  } });
  assert.equal((await notify({ event: 'created', email: 'doctor@example.com', temporaryPassword: 'temporary-secret' })).status, 'accepted');
  assert.deepEqual(calls[0].to, ['doctor@example.com']);
  assert.match(calls[0].text, /temporary-secret/);
  await notify({ event: 'changed', email: 'doctor@example.com', temporaryPassword: 'never-send' });
  assert.equal(JSON.stringify(calls[1]).includes('never-send'), false);
});

test('email failures are sanitized and configuration never implies delivery', async () => {
  const disabled = createDoctorEmailNotifier({ env: {}, fetchImpl: () => assert.fail('unexpected network') });
  assert.equal((await disabled({ email: 'doctor@example.com' })).status, 'not_configured');
  const failed = createDoctorEmailNotifier({ env: { RESEND_API_KEY: 'test', NOTIFICATION_FROM_EMAIL: 'accounts@example.com' }, fetchImpl: async () => { throw new Error('secret provider details'); } });
  assert.deepEqual(await failed({ email: 'doctor@example.com', event: 'changed' }), { status: 'failed', reason: 'provider_unavailable' });
  assert.equal((await notifySafely(async () => { throw new Error('secret'); }, {})).status, 'failed');
});

test('invalid sender configuration is rejected before contacting the provider', async () => {
  const notify = createDoctorEmailNotifier({ env: { RESEND_API_KEY: 'test', NOTIFICATION_FROM_EMAIL: 'accounts@invalid' }, fetchImpl: () => assert.fail('unexpected request') });
  assert.deepEqual(await notify({ event: 'changed', email: 'doctor@example.com' }), { status: 'failed', reason: 'invalid_sender' });
});
