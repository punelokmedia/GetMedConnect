// Direct Meta WhatsApp Cloud API; server-only credentials.
export function normalizeWhatsAppPhone(value) {
  let number = String(value || '').trim().replace(/^whatsapp:/, '').replace(/[ ()-]/g, '');
  if (/^[6-9]\d{9}$/.test(number)) number = `+91${number}`;
  if (!/^\+[1-9]\d{7,14}$/.test(number)) throw new Error('invalid_phone');
  return number.slice(1);
}

export function createWhatsAppNotifier({ env = process.env, fetchImpl = fetch } = {}) {
  const version = env.WHATSAPP_GRAPH_API_VERSION;
  const configured = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_PATIENT_TEMPLATE', 'WHATSAPP_DOCTOR_TEMPLATE', 'WHATSAPP_TEMPLATE_LANGUAGE'].every(key => env[key]) && /^v\d+\.\d+$/.test(version || '') && /^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID || '');
  return async ({ appointment, patient, doctor, event }) => {
    const send = async (recipient, template) => {
      if (!configured || !template) return { status: 'not_configured' };
      let to;
      try { to = normalizeWhatsAppPhone(recipient?.phone); }
      catch { return { status: 'failed', reason: 'invalid_phone' }; }
      try {
        const when = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(appointment.scheduledAt));
        const clean = value => String(value).replace(/\s+/g, ' ').trim();
        const body = {
          messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template',
          template: { name: template, language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE }, components: [{
            type: 'body', parameters: (event === 'status' ? [recipient.name, `${when} IST`, appointment.id, appointment.status] : [recipient.name, patient.name, doctor.name, `${when} IST`, appointment.id]).map(value => ({ type: 'text', text: clean(value) })),
          }] },
        };
        const response = await fetchImpl(`https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST', headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return { status: 'failed', reason: 'provider_rejected' };
        const result = await response.json();
        const message = result.messages?.[0];
        if (!message?.id || message.message_status === 'rejected') return { status: 'failed', reason: 'provider_rejected' };
        return { status: 'accepted', messageId: message.id };
      } catch { return { status: 'failed', reason: 'provider_unavailable' }; }
    };
    const [patientResult, doctorResult] = await Promise.all([
      send(patient, event === 'status' ? env.WHATSAPP_PATIENT_STATUS_TEMPLATE : env.WHATSAPP_PATIENT_TEMPLATE),
      send(doctor, event === 'status' ? env.WHATSAPP_DOCTOR_STATUS_TEMPLATE : env.WHATSAPP_DOCTOR_TEMPLATE),
    ]);
    return { patient: patientResult, doctor: doctorResult };
  };
}
