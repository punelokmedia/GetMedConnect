import React, { useRef, useState } from 'react';
import './dashboard.css';
import { ProfileForm } from './profile-form';

const paths = {
  calendar: 'M5 3v4m14-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z',
  clock: 'M12 8v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check: 'm7 12 3 3 7-7M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a9 9 0 0 1 18 0v2Z',
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3Z',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0ZM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  phone: 'm7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3c0 3-2 5-5 4C9 19 5 15 3 8 2 5 4 3 7 3Z',
  mail: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  note: 'M5 3h10l4 4v14H5Zm9 0v5h5M8 12h8m-8 4h5',
  refresh: 'M20 8a9 9 0 0 0-15-3L2 8m0-5v5h5m-3 8a9 9 0 0 0 15 3l3-3m0 5v-5h-5',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5Zm7 5v3',
  exit: 'M10 3H3v18h7m5-15 6 6-6 6m-7-6h13',
  grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-6-8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  help: 'M12 17h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4m10-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  clinic: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 5v4m-2-2h4m-2 9v4',
  chart: 'M5 21V12m7 9V7m7 14V3',
};
export function Icon({ name, ...props }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.user}/></svg>; }

const brand = '/login/brand.svg';
const clientUrl = (import.meta.env.VITE_CLIENT_URL || (import.meta.env.DEV ? 'http://127.0.0.1:5173' : '')).replace(/\/$/, '');
const nav = [
  ['Dashboard', 'grid'], ['Doctor Profile', 'user'], ['Appointments', 'calendar'],
  ['Patient Connections', 'people'], ['Outcomes', 'chart'],
];
const quickActions = [
  ['Update Profile', 'user', 'Doctor Profile'],
  ['Manage Appointments', 'manage', 'Appointments'],
  ['View Patient Connections', 'people', 'Patient Connections'],
];
const publicLinks = [
  ['Home', '/'], ['Find Healthcare', '/#specialties'], ['How It Works', '/#how-it-works'],
  ['For Clinics', '/#clinics'], ['About Us', '/#about'], ['FAQs', '/#faqs'],
];
const specialties = ['Fertility', 'Hair Care', 'Skin & Dermatology', "Women's Health", 'Dental Care', 'Diagnostics'];

function DashboardAsset({ name, ...props }) {
  return <img src={`/dashboard/${name}.svg`} alt="" {...props}/>;
}

export function DoctorDashboard({ profile, appointments, busy, error, onRefresh, onPassword, onSignOut, onUpdate, onProfileSave }) {
  const [page, setPage] = useState('Dashboard');
  const help = useRef(null);
  const notifications = useRef(null);
  const main = useRef(null);
  const doctor = profile.doctor;
  const completed = appointments.filter(row => row.status === 'Completed');
  const scheduled = appointments.filter(row => ['Scheduled', 'Confirmed'].includes(row.status));
  const isDashboard = page === 'Dashboard';
  const isOutcomes = page === 'Outcomes';
  const rows = isOutcomes ? completed : appointments;
  const heading = isOutcomes ? 'Consultation Outcomes' : page === 'Patient Connections' ? 'Your Patient Connections' : 'Your Assigned Appointments';

  function navigate(nextPage) {
    setPage(nextPage);
    main.current.focus();
    main.current.scrollIntoView({ block: 'start' });
  }

  return <div className="mint-workspace">
    <div className="mint-shell">
      <aside className="mint-sidebar">
        <div className="mint-brand"><img src={brand} alt="GetMedConnect"/></div>
        <p className="mint-eyebrow">Doctor workspace</p>
        <nav aria-label="Doctor workspace">
          {nav.map(([label, icon]) => <button key={label} className={page === label ? 'active' : ''} aria-current={page === label ? 'page' : undefined} onClick={() => navigate(label)}>
            {icon === 'chart' && page !== label ? <DashboardAsset name="outcomes"/> : <Icon name={icon}/>}
            {label}
          </button>)}
        </nav>
        <button className="mint-help" onClick={() => help.current.showModal()}><Icon name="help"/>Help &amp; Support</button>
      </aside>
      <main className="mint-main" ref={main} tabIndex={-1}>
        {page === 'Doctor Profile' ? <>
          <ProfileForm doctor={doctor} onSave={onProfileSave} onCancel={() => navigate('Dashboard')} Icon={Icon}/>
          <div className="mint-account">
            <button className="mint-button" onClick={onPassword}><Icon name="lock"/>Change Password</button>
            <button className="mint-button solid" onClick={onSignOut}><Icon name="exit"/>Sign Out</button>
          </div>
        </> : <>
          <header className="mint-header">
            <div>
              <p className="mint-greeting">Welcome back,</p>
              <div className="mint-title"><h1>Welcome, {doctor.name}</h1>{doctor.specialty && <span className="mint-specialty">{doctor.specialty}</span>}</div>
              {doctor.city && <p><Icon name="pin"/>{doctor.city}</p>}
            </div>
            <div className="mint-toolbar">
              <button className="mint-button mint-bell" aria-label="Appointment notifications" onClick={() => notifications.current.showModal()}><Icon name="bell"/>{scheduled.length > 0 && <span/>}</button>
              <button className="mint-button" onClick={onRefresh} disabled={busy}><Icon name="refresh"/>Refresh</button>
            </div>
          </header>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <div className="mint-layout">
            <section className="mint-care" aria-label={heading}>
              <div className="mint-stats">
                {[['calendar', appointments.length, 'Assigned Appointments'], ['clock', scheduled.length, 'Scheduled / Confirmed'], ['check', completed.length, 'Completed Consultations']].map(([icon, count, label]) => <div className={`mint-stat ${icon}`} key={label}><Icon name={icon}/><div><strong>{count}</strong><span>{label}</span></div></div>)}
              </div>
              <section className="mint-panel mint-visit-panel">
                <header className="mint-section-heading">
                  <div><h2><Icon name={isOutcomes ? 'chart' : 'calendar'}/>{heading}</h2>
                    {isDashboard && <button className="mint-text-button" onClick={() => navigate('Appointments')}>View All <Icon name="arrow"/></button>}
                  </div>
                  <p>{isOutcomes ? 'Review completed consultations and update their outcomes.' : 'Only appointments assigned to you appear here. Updates refresh every 30 seconds while this page is visible.'}</p>
                </header>
                <div className="mint-appointments">{rows.map(row => <article className="mint-appointment" key={row.id}>
                  <div className="mint-patient-heading"><div><p className="mint-eyebrow">Assigned patient</p><h4><span className="mint-avatar small"><Icon name="user"/></span>{row.patientName}</h4></div><span className={`mint-status ${row.status.toLowerCase()}`}><Icon name={row.status === 'Completed' ? 'check' : 'clock'}/>{row.status}</span></div>
                  <div className="mint-appointment-body"><dl className="mint-details">{[['phone', 'Phone number', <a href={`tel:${row.patientPhone}`}>{row.patientPhone}</a>], ['user', 'Specialty', row.specialty], ['pin', 'City', row.city], ['calendar', 'Appointment date and time', <time dateTime={row.scheduledAt}>{new Date(row.scheduledAt).toLocaleString()}</time>]].map(([icon, label, value]) => <div key={label}><Icon name={icon}/><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
                    <div className="mint-controls"><label>Appointment status<select aria-label={`Appointment status for ${row.patientName}`} value={row.status} disabled={busy} onChange={event => onUpdate(row, { status: event.target.value, ...(event.target.value !== 'Completed' ? { outcome: 'Pending' } : {}) })}>{['Scheduled','Confirmed','Completed','Cancelled','No-show'].map(status => <option key={status}>{status}</option>)}</select></label><label>Consultation outcome<select aria-label={`Consultation outcome for ${row.patientName}`} value={row.outcome} disabled={busy || row.status !== 'Completed'} onChange={event => onUpdate(row, { outcome: event.target.value })}>{['Pending','Converted','Not converted'].map(outcome => <option key={outcome}>{outcome}</option>)}</select></label></div>
                  </div>
                  <section className="mint-notes"><Icon name="note"/><div><h5>Coordination notes from admin</h5><p>{row.notes || 'No coordination notes added.'}</p></div></section>
                </article>)}</div>
                {!rows.length && <div className="mint-empty">
                  <DashboardAsset name="empty-calendar" width="74" height="79"/>
                  <h3>{isOutcomes ? 'No completed consultations yet' : 'No appointments assigned yet'}</h3>
                  <p>{isOutcomes ? 'Completed consultations will appear here.' : 'Your care team will assign consultations here.'}</p>
                </div>}
              </section>
              {isDashboard && <section className="mint-panel mint-quick">
                <h2><DashboardAsset name="quick-actions"/>Quick Actions</h2>
                <div>{quickActions.map(([label, icon, destination]) => <button key={label} onClick={() => navigate(destination)}>
                  {icon === 'manage' ? <DashboardAsset name={icon}/> : <Icon name={icon}/>}
                  <span>{label}</span><Icon name="arrow"/>
                </button>)}</div>
              </section>}
            </section>
            <aside className="mint-profile" aria-label="Doctor profile">
              <button className="mint-edit" onClick={() => navigate('Doctor Profile')} aria-label="Edit Profile"><DashboardAsset name="edit-profile" width="58" height="16"/></button>
              <header><DashboardAsset name="profile" width="36" height="36"/><div><h2>Doctor Profile</h2><p>Your professional details and account information.</p></div></header>
              <div className="mint-profile-person">
                <span className="mint-portrait">{doctor.photo ? <img src={doctor.photo} alt=""/> : <Icon name="clinic"/>}</span>
                <div><h3>{doctor.name}</h3>{doctor.specialty && <span className="mint-specialty">{doctor.specialty}</span>}
                  {doctor.city && <p><Icon name="pin"/>{doctor.city}</p>}
                  {doctor.email && <p><Icon name="mail"/><a href={`mailto:${doctor.email}`}>{doctor.email}</a></p>}
                </div>
              </div>
              <div className="mint-profile-info">
                <div><h3><DashboardAsset name="access"/>Portal Access</h3><strong>Enabled</strong><p>Your assigned patients and consultations.</p></div>
                <div><h3><DashboardAsset name="updates"/>Appointment Updates</h3><strong>Every 30 seconds</strong><p>While your dashboard is visible.</p></div>
              </div>
            </aside>
          </div>
        </>}
      </main>
    </div>
    <footer className="mint-footer">
      <div className="mint-footer-inner">
        <div className="mint-footer-grid">
          <div><div className="mint-footer-logo"><img src={brand} alt="GetMedConnect" width="250" height="56"/></div><p>Connecting people with the right healthcare options, for a healthier tomorrow.</p></div>
          {clientUrl && <>
            <nav aria-label="Quick links"><h2>Quick Links</h2>{publicLinks.map(([label, path]) => <a key={path} href={clientUrl + path}>{label}</a>)}</nav>
            <nav aria-label="Healthcare specialties"><h2>Healthcare Specialties</h2>{specialties.map(label => <a key={label} href={`${clientUrl}/#specialties`}>{label}</a>)}</nav>
          </>}
          <div><h2>Support</h2><button className="mint-text-button" onClick={() => help.current.showModal()}><Icon name="mail"/>Contact Us</button></div>
        </div>
        <p className="mint-copyright">? GetMedConnect. All rights reserved.</p>
      </div>
    </footer>
    <dialog className="mint-dialog" ref={help} aria-labelledby="mint-help-title">
      <h2 id="mint-help-title">Doctor account support</h2>
      <p>Contact the GetMedConnect administrator who set up your doctor account for help with access, profile details or appointments.</p>
      <form method="dialog"><button className="mint-button">Close</button></form>
    </dialog>
    <dialog className="mint-dialog" ref={notifications} aria-labelledby="mint-notifications-title">
      <h2 id="mint-notifications-title">Appointment notifications</h2>
      <p>{scheduled.length === 1 ? 'You have 1 scheduled or confirmed appointment.' : `You have ${scheduled.length} scheduled or confirmed appointments.`}</p>
      <form method="dialog" className="mint-account">
        <button type="button" className="mint-button" onClick={() => { notifications.current.close(); navigate('Appointments'); }}>View Appointments</button>
        <button className="mint-button">Close</button>
      </form>
    </dialog>
  </div>;
}
