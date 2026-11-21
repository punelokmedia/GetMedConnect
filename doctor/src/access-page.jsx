import React, { useRef, useState } from 'react';
import { PhoneLogin } from './phone-login';
import './access-page.css';

const artwork = '/login';
const clientUrl = (import.meta.env.VITE_CLIENT_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5173' : '')).replace(/\/$/, '');
const quickLinks = [
  ['Home', '/'], ['Find Healthcare', '/#specialties'], ['How It Works', '/#how-it-works'],
  ['For Clinics', '/#clinics'], ['About Us', '/#about'], ['FAQs', '/#faqs']
];
const specialties = ['Fertility', 'Hair Care', 'Skin & Dermatology', 'Women’s Health', 'Dental Care', 'Diagnostics'];

const iconPaths = {
  mail: 'M3 5h18v14H3z M3 6l9 7 9-7',
  phone: 'M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 2a13 13 0 0 1-7-7l2-2z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  hidden: 'm3 3 18 18 M10 5a10 10 0 0 1 2 0c6 0 10 7 10 7a18 18 0 0 1-3 4 M6 6a18 18 0 0 0-4 6s4 7 10 7a9 9 0 0 0 4-1',
  arrow: 'M4 12h15m-6-6 6 6-6 6'
};

function LoginIcon({ name }) {
  return <svg className="access-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]}/></svg>;
}

export function PasswordField({ name, label, autoComplete, placeholder, minLength, maxLength }) {
  const [visible, setVisible] = useState(false);
  const id = `doctor-access-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="access-input password-wrap">
        <LoginIcon name="lock"/>
        <input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete}
          placeholder={placeholder} minLength={minLength} maxLength={maxLength} required/>
        <button type="button" className="toggle-password" onClick={() => setVisible(value => !value)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}>
          <LoginIcon name={visible ? 'eye' : 'hidden'}/>
        </button>
      </div>
    </div>
  );
}

export function DoctorAccessPage({ title, description, children }) {
  const support = useRef(null);
  const showSupport = () => support.current.showModal();
  return (
    <div className="doctor-access">
      <main className="access-hero">
        <section className="access-card" aria-labelledby="access-title">
          <header className="access-heading">
            <img className="access-emblem" src={`${artwork}/emblem.png`} alt="GetMedConnect" width="116" height="116"/>
            <h1 id="access-title">{title === 'Doctor Login'
              ? <img className="access-title-art" src={`${artwork}/title.svg`} alt={title} width="230" height="73"/>
              : title}</h1>
            {description && <p>{description}</p>}
          </header>
          {children(showSupport)}
        </section>
        <section className="access-banner" aria-labelledby="access-banner-title">
          <div className="access-banner-copy">
            <h2 id="access-banner-title">Connected care.<br/><em>A clearer day.</em></h2>
            <p>Manage your appointments, patient queries<br className="access-desktop-break"/> and care journey - all in one place.</p>
          </div>
          <img className="access-banner-doctor" src={`${artwork}/doctor.png`} alt="" width="370" height="424"/>
        </section>
      </main>
      <footer className="access-footer">
        <div className="access-footer-grid">
          <div className="access-footer-brand">
            <img src={`${artwork}/brand.svg`} alt="GetMedConnect" width="250" height="56"/>
            <p>Connecting people with the right healthcare options, for a healthier tomorrow.</p>
          </div>
          {clientUrl && <>
            <nav aria-label="Quick links">
              <h2>Quick Links</h2>
              {quickLinks.map(([label, path]) => <a key={path} href={clientUrl + path}>{label}</a>)}
            </nav>
            <nav aria-label="Healthcare specialties">
              <h2>Healthcare Specialties</h2>
              {specialties.map(name => <a key={name} href={`${clientUrl}/#specialties`}>{name}</a>)}
            </nav>
          </>}
          <div>
            <h2>Support</h2>
            <button className="access-footer-contact" type="button" onClick={showSupport}><LoginIcon name="mail"/> Contact Us</button>
          </div>
        </div>
        <p className="access-copyright">© GetMedConnect. All rights reserved.</p>
      </footer>
      <dialog ref={support} className="access-support" aria-labelledby="doctor-support-title">
        <h2 id="doctor-support-title">Doctor account support</h2>
        <p>Contact the GetMedConnect administrator who set up your doctor account to request access or a temporary password.</p>
        <form method="dialog"><button className="primary-button">Close</button></form>
      </dialog>
    </div>
  );
}

export function DoctorSignIn({ checking, configured, busy, error, notice, onLogin, onClearError }) {
  const [phoneLogin, setPhoneLogin] = useState(false);
  function selectMethod(usePhone) {
    setPhoneLogin(usePhone);
    onClearError();
  }
  return (
    <DoctorAccessPage title="Doctor Login" description="Access your doctor workspace and manage your practice with ease.">
      {showSupport => checking ? <p className="auth-loading" role="status">Checking your doctor access…</p> : <>
        {!configured && <p className="notice notice-error" role="alert">Doctor login is not configured. Contact your administrator.</p>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {notice && <p className="notice notice-success" role="status">{notice}</p>}
        <div className="access-methods" role="group" aria-label="Sign-in method">
          <button type="button" aria-pressed={!phoneLogin} disabled={busy} onClick={() => selectMethod(false)}>
            <LoginIcon name="mail"/> Email &amp; Password
          </button>
          <button type="button" aria-pressed={phoneLogin} disabled={busy} onClick={() => selectMethod(true)}>
            <LoginIcon name="phone"/> Phone Verification
          </button>
        </div>
        {phoneLogin ? <PhoneLogin configured={configured}/> :
          <form className="login-form" onSubmit={onLogin}>
            <label className="field">
              <span>Email address</span>
              <span className="access-input">
                <LoginIcon name="mail"/>
                <input name="email" type="email" autoComplete="username" placeholder="Enter your registered email" required/>
              </span>
            </label>
            <PasswordField name="password" label="Password" autoComplete="current-password" placeholder="Enter your password"/>
            <div className="access-login-options">
              <label className="checkbox-row"><input type="checkbox" name="remember"/>Remember me</label>
              <button className="access-forgot" type="button" onClick={showSupport}>Forgot password?</button>
            </div>
            <button className="primary-button access-submit" disabled={busy || !configured}>
              {busy ? 'Signing in…' : <>Log In <LoginIcon name="arrow"/></>}
            </button>
          </form>}
        <p className="access-help">Need access? Contact <button type="button" onClick={showSupport}>GetMedConnect Administrator</button></p>
      </>}
    </DoctorAccessPage>
  );
}
