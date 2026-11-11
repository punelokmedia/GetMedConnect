import { apiFetch, apiUrl } from './api.js';
import React, { useEffect, useState } from 'react';
import logo from '../GetMedConnect Healthcare Logo.png';
import './doctors.css';

function initials(name) { return name.replace(/^dr\.?\s*/i, '').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
export function DoctorsPage() {
  const profileId = window.location.pathname.match(/^\/doctors\/([^/]+)\/?$/)?.[1];
  const [filters, setFilters] = useState({ q: '', city: '', specialty: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    document.title = profileId ? 'Doctor profile | GetMedConnect' : 'Find a doctor | GetMedConnect';
    const controller = new AbortController();
    let fetching = false;
    async function load() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const query = new URLSearchParams({ ...filters, page });
        const response = await apiFetch(profileId ? `/api/doctors/${encodeURIComponent(profileId)}` : `/api/doctors?${query}`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load doctors.');
        setResult(data); setError('');
      } catch (error) { if (!controller.signal.aborted) { setError(error instanceof TypeError ? 'Cannot reach the doctor directory. Please try again.' : error.message); setResult(null); } }
      finally { fetching = false; if (!controller.signal.aborted) setLoading(false); }
    }
    setLoading(true); setResult(null);
    const timer = setTimeout(load, 250);
    const interval = setInterval(load, 30000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); clearTimeout(timer); clearInterval(interval); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [profileId, filters, page, retry]);
  const doctors = profileId ? (result?.doctor ? [result.doctor] : []) : result?.doctors || [];
  function change(key, value) { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); }
  return <div className="doctor-site"><header className="directory-header"><a href="/" className="directory-brand"><img src={logo} alt=""/><strong>GetMedConnect</strong></a><nav aria-label="Main navigation"><a href="/">Home</a><a href="/doctors" aria-current="page">Find a doctor</a><a href="/#clinics">For clinics</a></nav></header><main><section className="directory-hero"><div className="directory-container"><a className="directory-back" href={profileId ? '/doctors' : '/'}>← {profileId ? 'All doctors' : 'Home'}</a><p className="eyebrow">YOUR NEXT STEP TOWARD CARE</p><h1>{profileId ? 'Meet your doctor.' : <>Find care.<br/><em>Make a connection.</em></>}</h1><p>Explore doctors in the GetMedConnect network.<br/>Find a specialty and location that fit your needs.</p><span className="directory-hero-symbol" aria-hidden="true">✚</span></div></section><section className="directory-container directory-body" aria-label={profileId ? 'Doctor profile' : 'Doctor directory'}>{!profileId && <form className="directory-filters" onSubmit={event => event.preventDefault()}><label>Doctor or specialty<input placeholder="Search by name or specialty" value={filters.q} onChange={event => change('q', event.target.value)} maxLength={120}/></label><label>City<input placeholder="Enter a city" value={filters.city} onChange={event => change('city', event.target.value)} maxLength={120}/></label><label>Consultation specialty<input placeholder="e.g. Dental Care" value={filters.specialty} onChange={event => change('specialty', event.target.value)} maxLength={120}/></label><button type="button" className="button" onClick={() => { setFilters({ q: '', city: '', specialty: '' }); setPage(1); }}>Clear filters</button></form>}<div className="directory-heading"><div><p className="eyebrow">GETMEDCONNECT DOCTORS</p><h2>{profileId ? result?.doctor?.name || 'Doctor profile' : 'A connection to the care you need'}</h2></div><button className="directory-refresh" onClick={() => setRetry(value => value + 1)}>↻ Refresh</button></div>{loading && <p className="directory-state" role="status">Loading doctor profiles…</p>}{error && <div className="directory-state" role="alert"><h3>We couldn’t load this page</h3><p>{error}</p><button className="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}{!loading && !error && !doctors.length && <div className="directory-state"><span aria-hidden="true">✚</span><h3>{Object.values(filters).some(Boolean) ? 'No doctors match your search' : 'Our doctor directory is growing'}</h3><p>{Object.values(filters).some(Boolean) ? 'Try another city, name or specialty.' : 'Doctor profiles will appear here as they become available.'}</p><a className="text-link" href="/#enquiry">Contact our team for help →</a></div>}<div className={`directory-grid ${profileId ? 'directory-profile' : ''}`}>{doctors.map(doctor => <article className="directory-card" key={doctor.id}><div className="doctor-card-top"><span className="doctor-avatar" aria-hidden="true">{doctor.photoUrl ? <img src={apiUrl(doctor.photoUrl)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/> : initials(doctor.name)}</span><span className="doctor-network">GetMedConnect network</span></div><p className="doctor-specialty">{doctor.specialty}</p><h3>{doctor.name}</h3><p className="doctor-city"><span aria-hidden="true">⌖</span> {doctor.city}</p><div className="public-profile-details">{doctor.qualification && <p><strong>Qualification:</strong> {doctor.qualification}</p>}{doctor.experience !== undefined && <p><strong>Experience:</strong> {doctor.experience} years</p>}{doctor.clinic && <p><strong>Clinic / Hospital:</strong> {doctor.clinic}</p>}{profileId && <>{doctor.bio && <p>{doctor.bio}</p>}{doctor.address && <p><strong>Clinic address:</strong> {doctor.address}{doctor.pincode ? ' ? ' + doctor.pincode : ''}</p>}{doctor.modes?.length > 0 && <p><strong>Consultation:</strong> {doctor.modes.join(' ? ')}</p>}{doctor.services?.length > 0 && <div className="public-services">{doctor.services.map(service => <span key={service}>{service}</span>)}</div>}</>}</div><div className="doctor-card-bottom">{profileId ? <><p>Contact our team to enquire about a consultation with {doctor.name}. Appointment availability will be confirmed separately.</p><a className="button" href="/#enquiry">Enquire about care →</a></> : <a className="text-link" href={`/doctors/${doctor.id}`}>View doctor profile <span>↗</span></a>}</div></article>)}</div>{!profileId && result && <div className="directory-pagination"><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>← Previous</button><span>Page {page}</span><button disabled={!result.hasNext || loading} onClick={() => setPage(value => value + 1)}>Next →</button></div>}<p className="directory-note">Doctor profiles refresh automatically every 30 seconds. Submitting an enquiry does not confirm an appointment.</p></section></main><footer className="directory-footer"><strong>GetMedConnect</strong><span>Connect · Care · Choose</span><a href="/">Back to home →</a></footer></div>;
}
