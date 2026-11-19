import React, { useEffect, useState } from 'react';
import { apiFetch, apiUrl } from './api.js';
import './doctors.css';

const emptyFilters = { q: '', city: '', specialty: '' };
const pageSize = 3;
const apiPageSize = 12;
const savedKey = 'getmedconnect.savedDoctors';
const specials = ['Fertility', 'Hair Care', 'Skin & Dermatology', 'Women’s Health', 'Dental Care', 'Diagnostics'];
const navLinks = [['Home', '/'], ['Find Healthcare', '/#specialties'], ['Our Clinics', '/#clinics'], ['Our Doctors', '/doctors'], ['FAQs', '/#faqs']];
const filtersList = [
  ['q', 'Doctor or specialty', 'Search by name or specialty', 'search'],
  ['city', 'City', 'Enter a city', 'location'],
  ['specialty', 'Consultation specialty', 'e.g. Cardiology, Dermatology', 'specialty'],
];

function enquiryLink(doctor) {
  const query = new URLSearchParams({ enquiry: '1' });
  if (doctor) {
    query.set('doctor', doctor.name);
    query.set('city', doctor.city);
    query.set('specialty', doctor.specialty);
  }
  return '/?' + query;
}

function DirectoryHeader() {
  const [open, setOpen] = useState(false);
  return <header className="directory-header">
    <div className="directory-nav">
      <a href="/"><img src="/patient/logo.svg" width="260" height="55" alt="GetMedConnect home"/></a>
      <button className="menu-toggle" aria-expanded={open} aria-controls="directory-nav-links" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>☰</button>
      <nav id="directory-nav-links" className={open ? 'is-open' : ''} aria-label="Main navigation">
        {navLinks.map(([label, href]) => <a key={href} href={href} aria-current={href === '/doctors' ? 'page' : undefined}>{label}</a>)}
        <a className="directory-action directory-mobile-enquiry" href={enquiryLink()}>Enquire Now <span aria-hidden="true">→</span></a>
      </nav>
      <a className="directory-action directory-desktop-enquiry" href={enquiryLink()}>Enquire Now <span aria-hidden="true">→</span></a>
    </div>
  </header>;
}

function DirectoryFooter() {
  return <footer className="directory-footer">
    <div className="directory-container">
      <div className="directory-footer-grid">
        <div>
          <a className="directory-footer-brand" href="/"><img src="/patient/logo.svg" alt="GetMedConnect home" width="249" height="56"/></a>
          <p>Connecting people with the right healthcare options, for a healthier tomorrow.</p>
        </div>
        <div><h3>Quick Links</h3>{navLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}<a href="/#how-it-works">How It Works</a><a href="/#about">About Us</a></div>
        <div><h3>Healthcare Specialties</h3>{specials.map(specialty => <a href={'/doctors?' + new URLSearchParams({ specialty })} key={specialty}>{specialty}</a>)}</div>
        <div><h3>Support</h3><a href={enquiryLink()}>Contact Us</a></div>
      </div>
      <p className="directory-copyright">© {new Date().getFullYear()} GetMedConnect. All rights reserved.</p>
    </div>
  </footer>;
}

function initialSaved() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(savedKey));
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function DoctorAvatar({ doctor }) {
  const [failedPhoto, setFailedPhoto] = useState(null);
  const initials = doctor.name.trim().replace(/^dr\.?\s+/i, '').split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();

  return <div className="doctor-avatar" aria-hidden="true">
    {doctor.photoUrl && failedPhoto !== doctor.photoUrl
      ? <img src={apiUrl(doctor.photoUrl)} alt="" onError={() => setFailedPhoto(doctor.photoUrl)}/>
      : initials}
  </div>;
}

function DoctorCard({ doctor, saved, onSave }) {
  return <article className="directory-card">
    <div className="doctor-card-top">
      <DoctorAvatar doctor={doctor}/>
      <div className="doctor-card-title">
        <span className="doctor-network"><span aria-hidden="true">●</span> Verified Doctor</span>
        <h3>{doctor.name}</h3>
        <p className="doctor-specialty">{doctor.specialty}</p>
      </div>
      <button className="doctor-save" type="button" aria-pressed={saved} aria-label={`Save ${doctor.name}`} onClick={() => onSave(doctor.id)}>
        {saved ? <span aria-hidden="true">♥</span> : <img src="/doctors/save.svg" alt="" width="28" height="28"/>}
      </button>
    </div>
    <ul className="doctor-facts">
      {doctor.qualification && <li><DirectoryIcon name="qualification"/>{doctor.qualification}</li>}
      {doctor.experience != null && <li><DirectoryIcon name="experience"/>{doctor.experience} {doctor.experience === 1 ? 'year' : 'years'} of experience</li>}
      <li><DirectoryIcon name="location"/>{doctor.city}</li>
      {doctor.clinic && <li>{doctor.clinic}</li>}
    </ul>
    <div className="doctor-card-bottom">
      <a className="doctor-profile-link" href={`/doctors/${encodeURIComponent(doctor.id)}`}>View Doctor Profile <span aria-hidden="true">→</span></a>
      <a className="doctor-book" href={enquiryLink(doctor)}><img src="/doctors/calendar.svg" alt="" width="16" height="16"/>Book Consultation</a>
    </div>
  </article>;
}

const iconPaths = {
  search: 'M15.5 15.5 20 20M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  location: 'M12 22S5 16 5 10a7 7 0 1 1 14 0c0 6-7 12-7 12Z M14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  specialty: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  filters: 'M5 3v7m0 4v7m7-18v12m0 4v2m7-18v3m0 4v11M3 10h4v4H3zM10 15h4v4h-4zM17 6h4v4h-4z',
  qualification: 'm2 9 10-5 10 5-10 5-10-5Zm4 2v6c4 3 8 3 12 0v-6',
  experience: 'M12 22c5-3 8-7 8-13V6l-8-3-8 3v3c0 6 3 10 8 13Zm-3-11 2 2 4-4',
};

function DirectoryIcon({ name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]}/></svg>;
}

const profileTabs = ['Overview', 'Qualifications', 'Experience', 'Areas of Care', 'Clinics & Availability'];

function ProfileEnquiry({ doctor }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy || sent) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setStatus('');
    try {
      const response = await apiFetch('/api/enquiries/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          consent: data.consent === 'on',
          city: doctor.city.slice(0, 80),
          specialty: doctor.specialty.slice(0, 100),
          requirement: `Consultation requested with ${doctor.name} (doctor ID: ${doctor.id}).`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your enquiry.');
      form.reset();
      setSent(true);
      setStatus(`Enquiry received. Reference: ${result.id}.`);
    } catch (error) {
      setStatus(error instanceof TypeError ? 'Unable to reach the server. Please try again.' : error.message);
    } finally {
      setBusy(false);
    }
  }

  return <aside className="profile-sidebar" aria-label="Consultation enquiry">
    <div className="profile-enquiry">
      <h2>Enquire about a Consultation</h2>
      <p>Share your details and our team will help you with the next steps.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy || sent}>
          <input name="name" aria-label="Your name" placeholder="Your name" autoComplete="name" required minLength={2} maxLength={100}/>
          <input name="phone" aria-label="Your phone number" placeholder="Phone number" type="tel" autoComplete="tel" pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number" required/>
          <input name="email" aria-label="Your email address (optional)" placeholder="Email address (optional)" type="email" autoComplete="email" maxLength={254}/>
          <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
          <label className="profile-consent"><input name="consent" type="checkbox" required/>I agree to be contacted by GetMedConnect about this enquiry.</label>
          <button className="directory-action">{busy ? 'Sending…' : sent ? 'Enquiry sent' : 'Enquire Now'}</button>
        </fieldset>
        {status && <p role={sent ? 'status' : 'alert'}>{status}</p>}
      </form>
      <small>Submitting an enquiry does not confirm an appointment.</small>
    </div>
    <div className="profile-process">
      <h3>How it works</h3>
      <ol>
        {[['send', 'Send enquiry'], ['review', 'Our team reviews'], ['contact', 'Our team follows up']].map(([icon, label]) => <li key={icon}>
          <img src={`/doctors/profile-${icon}.svg`} alt="" width="40" height="40"/>{label}
        </li>)}
      </ol>
    </div>
  </aside>;
}

function PublicDoctorProfile({ doctor, loading, error, onRetry }) {
  const [tab, setTab] = useState(0);
  const qualifications = <>
    {doctor?.qualification && <p>{doctor.qualification}</p>}
    {doctor?.registration && <p><strong>Registration number</strong> {doctor.registration}</p>}
    {doctor?.council && <p><strong>Medical council</strong> {doctor.council}</p>}
  </>;
  const experience = doctor?.experience != null && <>
    <strong className="profile-years">{doctor.experience} {doctor.experience === 1 ? 'year' : 'years'}</strong>
    <p>In {doctor.specialty}</p>
  </>;
  const services = doctor?.services?.length > 0 && <ul className="public-services">{doctor.services.map(service => <li key={service}>{service}</li>)}</ul>;

  function navigateTabs(event) {
    const keys = { ArrowLeft: (tab + profileTabs.length - 1) % profileTabs.length, ArrowRight: (tab + 1) % profileTabs.length, Home: 0, End: profileTabs.length - 1 };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    const next = keys[event.key];
    setTab(next);
    document.getElementById(`profile-tab-${next}`)?.focus();
  }

  return <main className="profile-shell">
    <div className="directory-container profile-layout">
      {doctor ? <>
        <article className="profile-main">
          <header className="profile-identity">
            <DoctorAvatar doctor={doctor}/>
            <div>
              <span className="doctor-network"><span aria-hidden="true">✓</span> Verified Doctor</span>
              <h1>{doctor.name}</h1>
              <p className="profile-specialty">{doctor.specialty}</p>
              <ul className="doctor-facts">
                {doctor.qualification && <li><DirectoryIcon name="qualification"/>{doctor.qualification}</li>}
                {doctor.experience != null && <li><DirectoryIcon name="experience"/>{doctor.experience} {doctor.experience === 1 ? 'year' : 'years'} of experience</li>}
                <li><DirectoryIcon name="location"/>{doctor.city}</li>
              </ul>
            </div>
          </header>
          <div className="profile-tabs" role="tablist" aria-label="Doctor details" onKeyDown={navigateTabs}>
            {profileTabs.map((label, index) => <button key={label} type="button" role="tab" id={`profile-tab-${index}`} aria-controls="profile-panel" aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)}>{label}</button>)}
          </div>
          <section className="profile-panel" id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} tabIndex={0}>
            {tab === 0 && <>
              <h2>About the Doctor</h2>
              {doctor.bio && <p>{doctor.bio}</p>}
              {(doctor.gender || doctor.age != null) && <p>{[doctor.gender, doctor.age != null && `Age ${doctor.age}`].filter(Boolean).join(' · ')}</p>}
              <ul className="profile-summary">
                <li><DirectoryIcon name="qualification"/><span>Specialization<strong>{doctor.specialty}</strong></span></li>
                <li><img src="/doctors/profile-location.svg" alt="" width="40" height="40"/><span>Location<strong>{doctor.city}</strong></span></li>
                <li><img src="/doctors/profile-calendar.svg" alt="" width="40" height="40"/><span>Consultation<strong>By enquiry</strong></span></li>
              </ul>
              <div className="profile-credentials">
                {(doctor.qualification || doctor.registration || doctor.council) && <div><h3>Qualifications</h3>{qualifications}</div>}
                {experience && <div>{experience}</div>}
              </div>
              {services}
            </>}
            {tab === 1 && <><h2>Qualifications</h2>{doctor.qualification || doctor.registration || doctor.council ? qualifications : <p>Qualifications are unavailable.</p>}</>}
            {tab === 2 && <><h2>Experience</h2>{experience || <p>Experience details are unavailable.</p>}</>}
            {tab === 3 && <><h2>Areas of Care</h2>{services || <p>{doctor.specialty}</p>}</>}
            {tab === 4 && <>
              <h2>Clinics &amp; Availability</h2>
              {doctor.clinic && <p><strong>{doctor.clinic}</strong></p>}
              <p>{[doctor.address, doctor.city, doctor.pincode].filter(Boolean).join(', ')}</p>
              {doctor.modes?.length > 0 && <p><strong>Consultation modes</strong> {doctor.modes.join(' · ')}</p>}
              <p>Send an enquiry to check availability.</p>
            </>}
          </section>
        </article>
        <ProfileEnquiry doctor={doctor}/>
      </> : <div className="directory-state">
        <h1>Doctor profile</h1>
        {loading && <p role="status">Loading doctor profile…</p>}
        {error && <div role="alert"><p>{error}</p><button className="directory-action" type="button" onClick={onRetry}>Try again</button></div>}
        <a className="text-link" href="/doctors">Back to Our Doctors</a>
      </div>}
    </div>
  </main>;
}

export function DoctorsPage() {
  const profileId = window.location.pathname.match(/^\/doctors\/([^/]+)\/?$/)?.[1];
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(Object.keys(emptyFilters).map(key => [key, (params.get(key) || '').slice(0, 120)]));
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState(initialSaved);
  const offset = (page - 1) * pageSize;
  const apiPage = Math.floor(offset / apiPageSize) + 1;
  const start = offset % apiPageSize;

  useEffect(() => {
    document.title = profileId ? 'Doctor profile | GetMedConnect' : 'Our Doctors | GetMedConnect';
    const controller = new AbortController();
    let fetching = false;

    async function load() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const query = new URLSearchParams({ ...filters, page: apiPage });
        const path = profileId ? `/api/doctors/${encodeURIComponent(profileId)}` : `/api/doctors?${query}`;
        const response = await apiFetch(path, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load doctors.');
        if (!controller.signal.aborted) {
          setResult(data);
          setError('');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof TypeError ? 'Cannot reach the doctor directory. Please try again.' : error.message);
          setResult(null);
        }
      } finally {
        fetching = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    setLoading(true);
    setResult(null);
    setError('');
    const timer = setTimeout(load, 250);
    const interval = setInterval(load, 30000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [profileId, filters, apiPage, retry]);

  const doctors = (result?.doctors ?? []).slice(start, start + pageSize);
  const hasNext = Boolean(result?.hasNext || result?.doctors?.length > start + pageSize);
  const refresh = () => setRetry(value => value + 1);
  const enquiry = enquiryLink();

  if (profileId) return <div className="doctor-site">
    <DirectoryHeader/>
    <PublicDoctorProfile doctor={result?.doctor} loading={loading} error={error} onRetry={refresh}/>
    <DirectoryFooter/>
  </div>;

  function changeFilters(next) {
    setFilters(next);
    setPage(1);
  }

  function toggleSave(id) {
    const next = new Set(saved);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSaved(next);
    try {
      window.localStorage.setItem(savedKey, JSON.stringify([...next]));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }

  return <div className="doctor-site">
    <DirectoryHeader/>
    <main>
      <section className="directory-hero">
        <div className="directory-container directory-hero-content">
          <nav className="directory-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">›</span>
            <strong aria-current="page">Our Doctors</strong>
          </nav>
          <p className="directory-hero-label">Meet Our Doctors</p>
          <h1>Our Doctors</h1>
          <p className="directory-tagline">Trusted experts, closer to you.</p>
          <p className="directory-intro">Browse verified doctors across multiple specialties, check their profiles, and connect for the care you need.</p>
        </div>
        <img className="directory-hero-art" src="/doctors/hero.svg" width="757" height="475" alt=""/>
      </section>

      <form className="directory-container directory-filters" role="search" aria-label="Filter doctors" onSubmit={event => event.preventDefault()}>
        {filtersList.map(([key, label, placeholder, icon]) => <label key={key}>
          {label}
          <span className="directory-input"><DirectoryIcon name={icon}/><input type="search" value={filters[key]} onChange={event => changeFilters({ ...filters, [key]: event.target.value })} placeholder={placeholder} maxLength={120}/></span>
        </label>)}
        <button type="button" className="directory-action" onClick={() => changeFilters(emptyFilters)}><DirectoryIcon name="filters"/>Clear Filter</button>
      </form>

      <section className="directory-results" aria-labelledby="directory-title" aria-busy={loading}>
        <div className="directory-heading">
          <div>
            <p>Our Doctors</p>
            <h2 id="directory-title">A network of <em>trusted doctors</em></h2>
          </div>
          <button className="directory-light-button" type="button" onClick={refresh}><span aria-hidden="true">⟳</span> Refresh</button>
        </div>
        {loading && <p className="directory-state" role="status">Loading doctor profiles…</p>}
        {error && <div className="directory-state" role="alert"><h3>We couldn’t load this page</h3><p>{error}</p><button className="directory-action" onClick={refresh}>Try again</button></div>}
        {!loading && !error && !doctors.length && <div className="directory-state">
          <h3>{page > 1 || Object.values(filters).some(value => value.trim()) ? 'No doctors found' : 'Our doctor directory is growing'}</h3>
          <p>{Object.values(filters).some(value => value.trim()) ? 'Try another city, name, or specialty.' : page === 1 ? 'Doctor profiles will appear here as they become available.' : 'Go back to see earlier results.'}</p>
          <a className="text-link" href={enquiry}>Contact our team for help →</a>
        </div>}
        {doctors.length > 0 && <div className="directory-grid-wrap">
          <div className="directory-grid">
            {doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} saved={saved.has(doctor.id)} onSave={toggleSave}/>)}
          </div>
          {page > 1 && <button className="directory-arrow directory-arrow-prev" aria-label="Previous page" onClick={() => setPage(page - 1)}>‹</button>}
          {hasNext && <button className="directory-arrow directory-arrow-next" aria-label="Next page" onClick={() => setPage(page + 1)}>›</button>}
        </div>}
        {(doctors.length > 0 || page > 1) && <nav className="directory-pagination" aria-label="Doctor pages">
          <button type="button" className="directory-light-button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>← Previous</button>
          <span aria-live="polite">Page {page}</span>
          <button type="button" className="directory-light-button" disabled={!hasNext || loading} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>}
      </section>
    </main>
    <DirectoryFooter/>
  </div>;
}
