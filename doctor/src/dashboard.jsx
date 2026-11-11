import React, { useState } from 'react';
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
  chart: 'M5 21V12m7 9V7m7 14V3',
};
export function Icon({ name, ...props }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.user}/></svg>; }

export function DoctorDashboard({ profile, appointments, busy, error, onRefresh, onPassword, onSignOut, onUpdate, onProfileSave }) {
  const [page, setPage] = useState('Dashboard');
  const doctor = profile.doctor;
  const completed = appointments.filter(row => row.status === 'Completed');
  const rows = page === 'Outcomes' ? completed : appointments;
  const nav = [['Dashboard', 'home'], ['Doctor Profile', 'user'], ['Appointments Care', 'calendar'], ['Patient Connections', 'user'], ['Outcomes', 'chart']];
  return <div className="mint-workspace">
    <aside className="mint-sidebar">
      <img className="mint-logo" src="/Heart of Care Healthcare Emblem.png" alt="GetMedConnect"/>
      <p className="mint-eyebrow">Doctor workspace</p>
      <h1>Connected care.<br/>A clearer day.</h1>
      <p className="mint-intro">Your appointments, patient connections and consultation outcomes in one place.</p>
      <nav aria-label="Doctor workspace">{nav.map(([label, icon]) => <button key={label} className={page === label ? 'active' : ''} aria-current={page === label ? 'page' : undefined} onClick={() => setPage(label)}><Icon name={icon}/>{label}</button>)}{page === "Doctor Profile" && <><button onClick={onPassword}><Icon name="lock"/>Change Password</button><button onClick={onSignOut}><Icon name="exit"/>Sign Out</button></>}</nav>
      <p className="mint-sidebar-foot">GetMedConnect<br/><span>Care, connected.</span></p>
    </aside>
    <main className="mint-main">
      {page !== "Doctor Profile" && <><header className="mint-header"><div><h2>Welcome, {doctor.name} <span className="welcome-wave" aria-hidden="true">👋</span></h2><p><Icon name="pin"/>{doctor.specialty} · {doctor.city}</p></div><button className="mint-button mint-refresh" onClick={onRefresh} disabled={busy}><Icon name="refresh"/>Refresh</button></header>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className={`mint-layout ${page === 'Doctor Profile' ? 'profile-view' : ''}`}>
        <section className="mint-care" hidden={page === 'Doctor Profile'}>
          <div className="mint-stats">{[['calendar', appointments.length, 'Assigned appointments'], ['clock', appointments.filter(row => ['Scheduled', 'Confirmed'].includes(row.status)).length, 'Scheduled / confirmed'], ['check', completed.length, 'Completed consultations']].map(([icon, count, label]) => <div className={`mint-stat ${icon}`} key={label}><Icon name={icon}/><div><strong>{count}</strong><span>{label}</span></div></div>)}</div>
          <div className="mint-section-heading"><h3><Icon name={page === 'Outcomes' ? 'chart' : 'calendar'}/>{page === 'Outcomes' ? 'Consultation Outcomes' : page === 'Patient Connections' ? 'Your Patient Connections' : 'Your Assigned Appointments'}</h3><p>{page === 'Outcomes' ? 'Review completed consultations and update their outcomes.' : 'Only appointments assigned to you appear here. Updates refresh every 30 seconds while this page is visible.'}</p></div>
          <div className="mint-appointments">{rows.map(row => <article className="mint-appointment" key={row.id}>
            <div className="mint-patient-heading"><div><p className="mint-eyebrow">Assigned patient</p><h4><span className="mint-avatar small"><Icon name="user"/></span>{row.patientName}</h4></div><span className={`mint-status ${row.status.toLowerCase()}`}><Icon name={row.status === 'Completed' ? 'check' : 'clock'}/>{row.status}</span></div>
            <div className="mint-appointment-body"><dl className="mint-details">{[['phone', 'Phone number', <a href={`tel:${row.patientPhone}`}>{row.patientPhone}</a>], ['user', 'Specialty', row.specialty], ['pin', 'City', row.city], ['calendar', 'Appointment date and time', <time dateTime={row.scheduledAt}>{new Date(row.scheduledAt).toLocaleString()}</time>]].map(([icon, label, value]) => <div key={label}><Icon name={icon}/><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
              <div className="mint-controls"><label>Appointment status<select aria-label={`Appointment status for ${row.patientName}`} value={row.status} disabled={busy} onChange={event => onUpdate(row, { status: event.target.value, ...(event.target.value !== 'Completed' ? { outcome: 'Pending' } : {}) })}>{['Scheduled','Confirmed','Completed','Cancelled','No-show'].map(status => <option key={status}>{status}</option>)}</select></label><label>Consultation outcome<select aria-label={`Consultation outcome for ${row.patientName}`} value={row.outcome} disabled={busy || row.status !== 'Completed'} onChange={event => onUpdate(row, { outcome: event.target.value })}>{['Pending','Converted','Not converted'].map(outcome => <option key={outcome}>{outcome}</option>)}</select></label></div>
            </div>
            <section className="mint-notes"><Icon name="note"/><div><h5>Coordination notes from admin</h5><p>{row.notes || 'No coordination notes added.'}</p></div></section>
          </article>)}</div>
          {!rows.length && <div className="mint-empty"><Icon name="calendar"/><h4>{page === 'Outcomes' ? 'No completed consultations yet' : 'No appointments assigned yet'}</h4><p>{page === 'Outcomes' ? 'Completed consultations will appear here.' : 'Your care team will assign consultations here.'}</p></div>}
          <p className="mint-footnote">Showing up to 200 recent appointments assigned to you. Refreshes every 30 seconds.</p>
        </section>
        <aside className="mint-profile" aria-label="Doctor profile"><header><span className="mint-avatar small"><Icon name="user"/></span><div><h3>Doctor Profile</h3><p>Your professional details and account information.</p></div></header><div className="mint-profile-person"><span className="mint-avatar portrait" aria-label={doctor.name}>{doctor.photo && <img src={doctor.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>}{!doctor.photo && <span>{doctor.name.split(' ').filter(Boolean).slice(0,2).map(part => part[0]).join('')}</span>}</span><div><h4>{doctor.name}</h4><span className="mint-specialty">{doctor.specialty}</span><p><Icon name="pin"/>{doctor.city}</p><p><Icon name="mail"/><a href={`mailto:${doctor.email}`}>{doctor.email}</a></p></div></div><div className="mint-profile-info"><div><Icon name="check"/><h5>Portal access</h5><p>Enabled<br/>Your assigned patients and consultations</p></div><div><Icon name="clock"/><h5>Appointment updates</h5><p>Every 30 seconds<br/>While your dashboard is visible</p></div></div><div className="mint-profile-help"><Icon name="note"/><p>Need to update your profile or consultation timings? Contact your GetMedConnect administrator.</p></div></aside>
      </div>
      <footer className="mint-actions"><button className="mint-button" onClick={onPassword}><Icon name="lock"/>Change Password</button><button className="mint-button solid" onClick={onSignOut}><Icon name="exit"/>Sign Out</button></footer>
      </>}
      {page === "Doctor Profile" && <ProfileForm doctor={doctor} onSave={onProfileSave} onCancel={() => setPage("Dashboard")} Icon={Icon}/>}
    </main>
  </div>;
}
