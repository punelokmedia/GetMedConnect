import React, { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, setPersistence, browserSessionPersistence, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase';

export function PhoneLogin({ configured }) {
  const container = useRef(null);
  const verifier = useRef(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { verifier.current?.clear(); verifier.current = null; }, []);
  async function submit(event) {
    event.preventDefault();
    if (!configured || busy) return;
    setError(''); setBusy(true);
    const fields = new FormData(event.currentTarget);
    try {
      if (confirmation) {
        await confirmation.confirm(fields.get('code'));
      } else {
        let phone = fields.get('phone').trim().replace(/[ ()-]/g, '');
        if (/^[6-9]\d{9}$/.test(phone)) phone = `+91${phone}`;
        if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter your registered phone number with country code.');
        await setPersistence(auth, browserSessionPersistence);
        verifier.current?.clear();
        // signInWithPhoneNumber runs verification and waits for completion.
        // Do not submit again from a reCAPTCHA callback (that could send two codes).
        verifier.current = new RecaptchaVerifier(auth, container.current, { size: 'invisible' });
        setConfirmation(await signInWithPhoneNumber(auth, phone, verifier.current));
      }
    } catch (failure) {
      const messages = {
        'auth/invalid-verification-code': 'Incorrect verification code. Please try again.',
        'auth/code-expired': 'The code expired. Request a new code.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Phone login is not enabled. Contact your administrator.',
        'auth/unauthorized-domain': 'This website must be authorized in Firebase. Contact your administrator.',
        'auth/invalid-phone-number': 'Enter a valid phone number with country code.',
        'auth/billing-not-enabled': 'Firebase SMS billing is not enabled. Contact your administrator.',
        'auth/quota-exceeded': 'The Firebase SMS quota has been reached. Contact your administrator.',
        'auth/captcha-check-failed': 'The security check failed. Reload the page and try again.',
        'auth/invalid-app-credential': 'The security check expired or was rejected. Reload the page and try again.',
        'auth/missing-app-credential': 'The security check could not complete. Reload the page and try again.',
        'auth/app-not-authorized': 'This app is not authorized for Firebase phone login. Contact your administrator.',
        'auth/network-request-failed': 'Cannot connect to Firebase. Check your connection and try again.',
      };
      const code = /^auth\/[a-z0-9-]+$/.test(failure.code || '') ? failure.code : '';
      const message = messages[code] || (failure.code ? 'Phone verification failed. Please try again or contact your administrator.' : failure.message);
      setError(`${message}${code ? ` (${code})` : ''}`);
      if (!confirmation) { verifier.current?.clear(); verifier.current = null; }
    } finally { setBusy(false); }
  }
  return <section><h3>Sign in with phone</h3><p>Use the phone number linked to your doctor login by your administrator.</p>{error && <p role="alert" className="notice notice-error">{error}</p>}<form className="login-form" onSubmit={submit}>{confirmation ? <><p role="status">A verification code was sent to your phone.</p><label className="field"><span>SMS verification code</span><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label></> : <><label className="field"><span>Registered phone number</span><input name="phone" type="tel" autoComplete="tel" placeholder="+91 9876543210" required/></label><p>By requesting a code, you agree to receive a verification SMS. Google processes your phone number for spam and abuse prevention. SMS charges may apply.</p></>}<div ref={container}/><button className="primary-button" disabled={busy || !configured}>{busy ? 'Please wait…' : confirmation ? 'Verify and sign in' : 'Send verification code'}</button>{confirmation && <button className="text-button" type="button" disabled={busy} onClick={() => { setConfirmation(null); setError(''); verifier.current?.clear(); verifier.current = null; }}>Use another number or request a new code</button>}</form></section>;
}
