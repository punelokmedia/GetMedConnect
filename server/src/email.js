import { z } from 'zod';

// No provider responses or message bodies are logged: they can contain credentials.
export function createDoctorEmailNotifier({ env = process.env, fetchImpl = fetch } = {}) {
  return async ({ email, temporaryPassword, event }) => {
    if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM_EMAIL) return { status: 'not_configured' };
    const sender = env.NOTIFICATION_FROM_EMAIL.trim();
    const senderAddress = sender.match(/<([^<>]+)>$/)?.[1] || sender;
    if (!z.email().safeParse(senderAddress).success) return { status: 'failed', reason: 'invalid_sender' };
    if (!z.email().safeParse(email).success) return { status: 'failed', reason: 'invalid_email' };
    const credentials = event === 'created' || event === 'reset';
    const subject = event === 'created' ? 'Your GetMedConnect doctor account' : event === 'reset' ? 'Your GetMedConnect temporary password' : 'Your GetMedConnect password was changed';
    const text = credentials
      ? `Your doctor login email is ${email}.\nTemporary password: ${temporaryPassword}\nSign in to your GetMedConnect doctor portal and replace this temporary password before accessing patient details. Never share your password. If you did not expect this message, contact your administrator.`
      : 'Your GetMedConnect doctor password was changed. If you did not make this change, contact your administrator immediately.';
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: sender, to: [email], subject, text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return { status: 'failed', reason: 'provider_rejected' };
      const result = await response.json();
      return result.id ? { status: 'accepted' } : { status: 'failed', reason: 'provider_rejected' };
    } catch { return { status: 'failed', reason: 'provider_unavailable' }; }
  };
}

export async function notifySafely(notify, payload) {
  if (!notify) return { status: 'not_configured' };
  try { return await notify(payload); }
  catch { return { status: 'failed', reason: 'provider_unavailable' }; }
}
