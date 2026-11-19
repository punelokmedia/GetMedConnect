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

function DoctorCard({ doctor, profile, saved, onSave }) {
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
      {doctor.clinic && <li>{profile && <strong>Clinic / Hospital</strong>} {doctor.clinic}</li>}
    </ul>
    {profile && <div className="public-profile-details">
      {doctor.bio && <p>{doctor.bio}</p>}
      {doctor.address && <p><strong>Clinic address</strong> {doctor.address}{doctor.pincode && ` · ${doctor.pincode}`}</p>}
      {doctor.modes?.length > 0 && <p><strong>Consultation</strong> {doctor.modes.join(' · ')}</p>}
      {doctor.services?.length > 0 && <ul className="public-services">{doctor.services.map(service => <li key={service}>{service}</li>)}</ul>}
    </div>}
    <div className="doctor-card-bottom">
      {!profile && <a className="doctor-profile-link" href={`/doctors/${encodeURIComponent(doctor.id)}`}>View Doctor Profile <span aria-hidden="true">→</span></a>}
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

  const doctors = profileId
    ? (result?.doctor ? [result.doctor] : [])
    : (result?.doctors ?? []).slice(start, start + pageSize);
  const hasNext = Boolean(result?.hasNext || result?.doctors?.length > start + pageSize);
  const refresh = () => setRetry(value => value + 1);
  const enquiry = enquiryLink();

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
      <section className={`directory-hero ${profileId ? 'directory-hero-profile' : ''}`}>
        <div className="directory-container directory-hero-content">
          <nav className="directory-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">›</span>
            {profileId ? <a href="/doctors">Our Doctors</a> : <strong aria-current="page">Our Doctors</strong>}
          </nav>
          {profileId
            ? <h1>{result?.doctor?.name || 'Doctor profile'}</h1>
            : <>
                <p className="directory-hero-label">Meet Our Doctors</p>
                <h1>Our Doctors</h1>
                <p className="directory-tagline">Trusted experts, closer to you.</p>
                <p className="directory-intro">Browse verified doctors across multiple specialties, check their profiles, and connect for the care you need.</p>
              </>}
        </div>
        {!profileId && <img className="directory-hero-art" src="/doctors/hero.svg" width="757" height="475" alt=""/>}
      </section>

      {!profileId && <form className="directory-container directory-filters" role="search" aria-label="Filter doctors" onSubmit={event => event.preventDefault()}>
        {filtersList.map(([key, label, placeholder, icon]) => <label key={key}>
          {label}
          <span className="directory-input"><DirectoryIcon name={icon}/><input type="search" value={filters[key]} onChange={event => changeFilters({ ...filters, [key]: event.target.value })} placeholder={placeholder} maxLength={120}/></span>
        </label>)}
        <button type="button" className="directory-action" onClick={() => changeFilters(emptyFilters)}><DirectoryIcon name="filters"/>Clear Filter</button>
      </form>}

      <section className={`directory-results ${profileId ? 'directory-results-profile' : ''}`} aria-labelledby="directory-title" aria-busy={loading}>
        <div className="directory-heading">
          <div>
            {!profileId && <p>Our Doctors</p>}
            <h2 id="directory-title">{profileId ? 'About the doctor' : <>A network of <em>trusted doctors</em></>}</h2>
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
            {doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} profile={Boolean(profileId)} saved={saved.has(doctor.id)} onSave={toggleSave}/>)}
          </div>
          {!profileId && <>
            {page > 1 && <button className="directory-arrow directory-arrow-prev" aria-label="Previous page" onClick={() => setPage(page - 1)}>‹</button>}
            {hasNext && <button className="directory-arrow directory-arrow-next" aria-label="Next page" onClick={() => setPage(page + 1)}>›</button>}
          </>}
        </div>}
        {!profileId && (doctors.length > 0 || page > 1) && <nav className="directory-pagination" aria-label="Doctor pages">
          <button type="button" className="directory-light-button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>← Previous</button>
          <span aria-live="polite">Page {page}</span>
          <button type="button" className="directory-light-button" disabled={!hasNext || loading} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>}
      </section>
    </main>
    <DirectoryFooter/>
  </div>;
}
