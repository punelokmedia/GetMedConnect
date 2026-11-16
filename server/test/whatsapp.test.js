import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWhatsAppNotifier, normalizeWhatsAppPhone } from '../src/whatsapp.js';

const env = { WHATSAPP_ACCESS_TOKEN: 'secret', WHATSAPP_PHONE_NUMBER_ID: '123456', WHATSAPP_GRAPH_API_VERSION: 'v27.0', WHATSAPP_PATIENT_TEMPLATE: 'patient_template', WHATSAPP_DOCTOR_TEMPLATE: 'doctor_template', WHATSAPP_TEMPLATE_LANGUAGE: 'en_US' };
const payload = { appointment: { id: 'booking', scheduledAt: '2027-01-15T09:00:00Z' }, patient: { name: 'Patient', phone: '9876543210' }, doctor: { name: 'Doctor', phone: '+919876543211' } };

test('phone normalization requires international numbers outside India', () => {
  assert.equal(normalizeWhatsAppPhone('98765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone('+1 (415) 523-8886'), '14155238886');
  assert.throws(() => normalizeWhatsAppPhone('1234567890'));
});

test('sends separate templates and isolates provider failures', async () => {
  const calls = [];
  const notify = createWhatsAppNotifier({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return JSON.parse(options.body).template.name === 'patient_template' ? { ok: true, json: async () => ({ messages: [{ id: 'wamid.patient' }] }) } : { ok: false };
  } });
  const result = await notify(payload);
  assert.equal(result.patient.status, 'accepted');
  assert.equal(result.doctor.status, 'failed');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v27.0/123456/messages');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret');
  assert.equal(JSON.parse(calls[0].options.body).to, '919876543210');
  const variables = JSON.parse(calls[0].options.body).template.components[0].parameters;
  assert.match(variables[3].text, /2:30 pm IST/i);
  assert.equal(variables[4].text, 'booking');
});

test('missing config does not call provider; invalid patient does not block doctor', async () => {
  const disabled = createWhatsAppNotifier({ env: {}, fetchImpl: () => assert.fail('unexpected request') });
  assert.equal((await disabled(payload)).patient.status, 'not_configured');
  let count = 0;
  const notify = createWhatsAppNotifier({ env, fetchImpl: async () => { count++; return { ok: true, json: async () => ({ messages: [{ id: 'wamid.doctor' }] }) }; } });
  const result = await notify({ ...payload, patient: { ...payload.patient, phone: 'bad' } });
  assert.equal(result.patient.reason, 'invalid_phone');
  assert.equal(result.doctor.status, 'accepted');
  assert.equal(count, 1);
});
