import React, { useEffect, useState } from 'react';
import { browserLocalPersistence, browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import './styles.css';

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
  const [refresh, setRefresh] = useState(0);
  useEffect(() => auth ? onAuthStateChanged(auth, next => { setUser(next); setProfile(null); setAppointments([]); setChecking(Boolean(next)); setPasswordForm(false); }) : undefined, []);
  async function request(currentUser, path, options = {}) {
    const token = await currentUser.getIdToken();
    const response = await fetch(`/api/doctor${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
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
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const fields = new FormData(event.currentTarget);
    try {
      await setPersistence(auth, fields.get('remember') ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, fields.get('email').trim(), fields.get('password'));
    } catch (error) { setError(friendlyError(error)); }
    finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault(); setError('');
    const fields = new FormData(event.currentTarget);
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
  const needsPassword = profile?.account.mustChangePassword || passwordForm;
  return <div className={`login-shell ${profile && !needsPassword ? 'portal-shell' : ''}`}><div className="login-card"><aside className="brand-panel"><div className="brand-header"><img src="/Heart of Care Healthcare Emblem.png" alt="GetMedConnect" className="brand-logo"/></div><div className="brand-copy"><p className="eyebrow">DOCTOR WORKSPACE</p><h1>Connected care.<br/>A clearer day.</h1><p>Your appointments, patient connections and consultation outcomes in one place.</p></div><div className="benefits">{[['◷','Appointments','See your assigned consultations'],['✚','Care','Follow each patient connection'],['✓','Outcomes','Keep your care team up to date']].map(([icon,name,text]) => <div className="benefit-card" key={name}><span className="benefit-icon" aria-hidden="true">{icon}</span><strong>{name}</strong><small>{text}</small></div>)}</div></aside><main className="form-panel"><div className="login-box"><div className="mini-brand"><img src="/Heart of Care Healthcare Emblem.png" alt="GetMedConnect"/></div>{error && <div className="notice notice-error" role="alert">{error}</div>}{notice && <div className="notice notice-success" role="status">{notice}</div>}{checking ? <p role="status">Checking your doctor access…</p> : !user ? <><div className="heading"><p className="eyebrow">WELCOME BACK</p><h2>Doctor login</h2><p>Sign in with the email and password provided by your administrator.</p></div>{!isFirebaseConfigured && <p className="notice notice-error" role="alert">Doctor login is not configured. Contact your administrator.</p>}<form className="login-form" onSubmit={login}><label className="field"><span>Email address</span><input name="email" type="email" autoComplete="username" placeholder="Your admin-provided email" required/></label><label className="field"><span>Password</span><div className="password-wrap"><input className="password-input" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required/><button type="button" className="toggle-password" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label><label className="checkbox-row"><input type="checkbox" name="remember"/><span>Remember me</span></label><button className="primary-button" disabled={busy || !isFirebaseConfigured}>{busy ? 'Signing in…' : 'Log in →'}</button></form><p className="signup-copy">Need access or a password reset? Contact your GetMedConnect administrator.</p></> : !profile ? <><h2>Doctor access unavailable</h2><p>An administrator must create and enable your linked doctor account.</p><button className="primary-button" onClick={() => setRefresh(value => value + 1)}>Retry</button><button className="secondary-button" onClick={() => signOut(auth)}>Sign out</button></> : needsPassword ? <><div className="heading"><p className="eyebrow">SECURE YOUR ACCOUNT</p><h2>{profile.account.mustChangePassword ? 'Replace your temporary password' : 'Change password'}</h2><p>Choose a password with at least 12 characters. You’ll sign in again afterward.</p></div><form className="login-form" onSubmit={changePassword}><label className="field"><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><label className="field"><span>Confirm new password</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><button className="primary-button" disabled={busy}>{busy ? 'Updating…' : 'Save new password'}</button></form>{!profile.account.mustChangePassword && <button className="secondary-button" onClick={() => setPasswordForm(false)}>Back to appointments</button>}<button className="text-button" onClick={() => signOut(auth)}>Sign out</button></> : <section className="doctor-dashboard"><div className="dashboard-heading"><div><p className="eyebrow">YOUR CONSULTATIONS</p><h2>Welcome, {profile.doctor.name}</h2><p>{profile.doctor.specialty} · {profile.doctor.city}</p></div><button className="secondary-button" onClick={() => setRefresh(value => value + 1)}>↻ Refresh</button></div><div className="dashboard-summary"><div><strong>{appointments.length}</strong><span>Assigned appointments</span></div><div><strong>{appointments.filter(row => ['Scheduled','Confirmed'].includes(row.status)).length}</strong><span>Scheduled / confirmed</span></div><div><strong>{appointments.filter(row => row.status === 'Completed').length}</strong><span>Completed consultations</span></div></div><div className="doctor-appointments">{appointments.map(row => <article key={row.id}><div><p className="eyebrow">{new Date(row.scheduledAt).toLocaleString()}</p><h3>{row.patientName}</h3><p>{row.specialty} · {row.city}</p><a href={`tel:${row.patientPhone}`}>{row.patientPhone}</a>{row.notes && <p>{row.notes}</p>}</div><div className="appointment-controls"><label>Status<select value={row.status} disabled={busy} onChange={event => updateAppointment(row, { status: event.target.value, ...(event.target.value !== 'Completed' ? { outcome: 'Pending' } : {}) })}>{['Scheduled','Confirmed','Completed','Cancelled','No-show'].map(status => <option key={status}>{status}</option>)}</select></label><label>Consultation outcome<select value={row.outcome} disabled={busy || row.status !== 'Completed'} onChange={event => updateAppointment(row, { outcome: event.target.value })}>{['Pending','Converted','Not converted'].map(outcome => <option key={outcome}>{outcome}</option>)}</select></label></div></article>)}</div>{!appointments.length && <p className="auth-boundary">No appointments assigned yet. Your care team will assign consultations here.</p>}<p className="auth-boundary">Showing up to 200 recent appointments assigned to you. Refreshes every 30 seconds.</p><div className="dashboard-actions"><button className="secondary-button" onClick={() => setPasswordForm(true)}>Change password</button><button className="primary-button" onClick={() => signOut(auth)}>Sign out</button></div></section>}</div></main></div></div>;
}
