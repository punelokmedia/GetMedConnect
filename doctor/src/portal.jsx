import { PhoneLogin } from './phone-login';
import { apiFetch } from './api.js';
import React, { useEffect, useState } from 'react';
import { browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import './styles.css';
import { DoctorAccessPage, DoctorSignIn, PasswordField } from './access-page';
import { DoctorDashboard } from './dashboard';

const friendlyError = error => ({ 'auth/invalid-credential': 'The email or password is incorrect.', 'auth/user-disabled': 'Your login has been disabled. Contact your administrator.', 'auth/too-many-requests': 'Too many login attempts. Please try again later.', 'auth/network-request-failed': 'Cannot connect. Check your internet connection.' }[error.code] || error.message || 'Please try again.');

export function DoctorPortal() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(auth));
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(false);
  const [phoneLogin, setPhoneLogin] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => auth ? onAuthStateChanged(auth, next => { setUser(next); setProfile(null); setAppointments([]); setChecking(Boolean(next)); setPasswordForm(false); }) : undefined, []);
  async function request(currentUser, path, options = {}) {
    const token = await currentUser.getIdToken();
    const response = await apiFetch(`/api/doctor${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || 'Could not load the doctor workspace.'), { status: response.status });
    return result;
  }
  useEffect(() => {
    if (!user) return;
    let current = true;
    let fetching = false;
    async function load() {
      if (fetching) return;
      fetching = true;
      try {
        const next = await request(user, '/me');
        const records = next.account.mustChangePassword ? [] : (await request(user, '/appointments')).appointments;
        if (current) { setProfile(next); setAppointments(records); setError(''); }
      } catch (error) {
        if (current) { setError(friendlyError(error)); setProfile(null); setAppointments([]); if (error.status === 401) await signOut(auth); }
      } finally { fetching = false; if (current) setChecking(false); }
    }
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 30000);
    window.addEventListener('focus', load);
    return () => { current = false; clearInterval(interval); window.removeEventListener('focus', load); };
  }, [user, refresh]);
  async function login(event) {
    event.preventDefault();
    if (busy || !auth) return;
    setBusy(true); setError(''); setNotice('');
    const fields = new FormData(event.currentTarget);
    try {
      await setPersistence(auth, fields.get('remember') ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, fields.get('email').trim(), fields.get('password'));
    } catch (error) { setError(friendlyError(error)); }
    finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const fields = new FormData(event.currentTarget);
    if (fields.get('password').length < 8) { setError('Password must contain at least 8 characters.'); return; }
    if (fields.get('password').length > 128) { setError('Password must contain no more than 128 characters.'); return; }
    if (fields.get('password') !== fields.get('confirmPassword')) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      await request(user, '/password', { method: 'POST', body: JSON.stringify({ password: fields.get('password') }) });
      await signOut(auth);
      setNotice('Your password was changed. Sign in with your new password.');
    } catch (error) { setError(friendlyError(error)); }
    finally { setBusy(false); }
  }
  async function updateAppointment(row, changes) {
    setBusy(true); setError('');
    try {
      await request(user, `/appointments/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status: row.status, outcome: row.outcome, ...changes }) });
      setRefresh(value => value + 1);
    } catch (error) { setError(friendlyError(error)); }
    finally { setBusy(false); }
  }
  async function saveProfile(values) {
    const result = await request(user, '/profile', { method: 'PUT', body: JSON.stringify(values) });
    setProfile(previous => ({ ...previous, doctor: result.doctor }));
  }
  const needsPassword = profile?.account.mustChangePassword || passwordForm;
  if (profile && !needsPassword && !checking) return <DoctorDashboard profile={profile} appointments={appointments} busy={busy} error={error} onRefresh={() => setRefresh(value => value + 1)} onPassword={() => setPasswordForm(true)} onSignOut={() => signOut(auth)} onUpdate={updateAppointment} onProfileSave={saveProfile}/>;
  if (!user) return <DoctorSignIn checking={checking} configured={isFirebaseConfigured} busy={busy} error={error} notice={notice} onLogin={login} onClearError={() => setError('')}/>;

  if (checking) {
    return <DoctorAccessPage title="Doctor Login">
      {() => <p className="auth-loading" role="status">Checking your doctor access…</p>}
    </DoctorAccessPage>;
  }

  if (!profile) {
    return (
      <DoctorAccessPage title="Doctor access unavailable" description="An administrator must create and enable your linked doctor account.">
        {() => <>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <div className="access-actions">
            <button className="primary-button" onClick={() => setRefresh(value => value + 1)}>Retry</button>
            <button className="secondary-button" onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </>}
      </DoctorAccessPage>
    );
  }

  const temporaryPassword = profile.account.mustChangePassword;
  return (
    <DoctorAccessPage
      title={temporaryPassword ? 'Replace your temporary password' : 'Change password'}
      description="Choose a password with at least 8 characters. You’ll sign in again afterward."
    >
      {() => <>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <form className="login-form" onSubmit={changePassword}>
          <PasswordField name="password" label="New password" autoComplete="new-password" minLength={8} maxLength={128}/>
          <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" minLength={8} maxLength={128}/>
          <button className="primary-button" disabled={busy}>{busy ? 'Updating…' : 'Save new password'}</button>
        </form>
        <div className="access-actions">
          {!temporaryPassword && <button className="secondary-button" disabled={busy} onClick={() => { setPasswordForm(false); setError(''); }}>Back to appointments</button>}
          <button className="text-button" disabled={busy} onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </>}
    </DoctorAccessPage>
  );
}
