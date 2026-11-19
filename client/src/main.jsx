import { apiFetch } from './api.js';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './style.css';
import './patient.css';
import { DoctorsPage } from './doctors.jsx';

const specialties = ['Fertility', 'Hair Care', 'Skin & Dermatology', 'Women’s Health', 'Dental Care', 'Diagnostics'];
const icons = { person:'person', clinic:'apartment', search:'search', book:'import_contacts', link:'link_2', shield:'verified_user', people:'groups', heart:'favorite', growth:'monitoring', settings:'settings', list:'event_note', location:'location_on', mail:'mail' };
const iconFiles = Object.fromEntries(Object.entries(import.meta.glob('/public/*.svg', { eager:true, query:'?url', import:'default' })).map(([path,url])=>[path.split('/').pop().split('_24dp')[0],url]));
function Icon({name, className=''}) { return <img className={`icon ${className}`} src={iconFiles[icons[name] || name]} alt="" aria-hidden="true"/>; }
const specialtyImages = ['/Fertility.png', null, '/Skin and dermetology.png', '/women health.png', '/dental-care.png', '/Dignostics.png'];
function SpecialtyIcon({index}) {
 const image = specialtyImages[index];
 if (image) return <img className="specialty-icon specialty-image" src={image} alt="" aria-hidden="true" width="52" height="52" loading="lazy"/>;
 return <svg className="specialty-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 29h9v8a8 8 0 0 0 16 0v-8h9"/><path d="M36 5C25 12 20 23 20 35c0 6 8 7 8 1-3-10 0-21 8-31Z"/><g fill="currentColor" stroke="none"><circle cx="14" cy="10" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="38" cy="17" r="1.8"/><circle cx="36" cy="43" r="1.3"/></g></svg>;
}
function Brand() { return <a className="patient-brand" href="#home"><img src="/patient/logo.svg" alt="GetMedConnect home" width="260" height="55"/></a>; }
const faqs = [
 ['How does GetMedConnect work?', 'Choose a specialty, share your location and send an enquiry. Our team follows up to help you explore suitable healthcare options.'],
 ['Which cities and specialties are available?', 'Explore the specialties listed above and include your city or PIN code. Our team will confirm whether suitable options are available in your location.'],
 ['Is submitting an enquiry an appointment confirmation?', 'No. An enquiry starts a conversation. The healthcare provider must separately confirm availability and your appointment.'],
 ['How will I be contacted after submitting an enquiry?', 'Our team can contact you using the mobile number or email address you provide.'],
 ['What information is shared with clinics?', 'We discuss the provider and ask for any additional sharing consent before forwarding your information. Please do not submit medical records.'],
 ['Is my information secure?', 'Your enquiry is used to follow up on your request. Please share only the requested contact details and avoid sensitive medical information.']
];
function App() {
 const [type,setType]=useState('patient'); const [specialty,setSpecialty]=useState(specialties[0]); const [city,setCity]=useState('');
 const [pin,setPin]=useState(''); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false); const [menu,setMenu]=useState(false);
 const dialog=useRef(null); const opener=useRef(null);
 function openEnquiry(nextType=type,nextSpecialty=specialty) {opener.current=document.activeElement;if(/^\d{6}$/.test(city.trim())){setPin(city.trim());setCity('');}setType(nextType);setSpecialty(nextSpecialty);setStatus('');document.body.style.overflow='hidden';dialog.current.showModal();}
 useEffect(()=>{const el=dialog.current; const unlock=()=>{document.body.style.overflow='';opener.current?.focus();}; el.addEventListener('close',unlock);return()=>el.removeEventListener('close',unlock);},[]);
 async function submit(event) {
  event.preventDefault();if(busy)return;const form=event.currentTarget;const data=Object.fromEntries(new FormData(form));data.consent=data.consent==='on';setBusy(true);setStatus('');
  try {const response=await apiFetch(`/api/enquiries/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again later.');setStatus(`Enquiry received. Reference: ${result.id}. This does not confirm an appointment.`);form.reset();}
  catch(error){setStatus(error instanceof TypeError?'Cannot reach the server. Please try again later.':error.message);}finally{setBusy(false);}
 }
 const features=[['book','Clear Guidance','Simple information to help you make informed choices.'],['link','Relevant Connections','We help you explore clinics that match your needs and location.'],['person','Personalised Support','A smoother, more convenient way to find healthcare options.'],['shield','Privacy & Consent','Your information is shared with relevant clinics, with your consent.']];
 return <div className="patient-page">
 <header id="home" className="header"><div className="nav-wrap"><Brand/><button className="menu-toggle" aria-expanded={menu} aria-controls="navigation" onClick={()=>setMenu(!menu)} aria-label="Toggle navigation">☰</button><nav id="navigation" className={menu?'is-open':''} aria-label="Main navigation" onClick={()=>setMenu(false)}><a className="active" href="#home">Home</a><a href="#specialties">Find Healthcare <span className="chevron">⌄</span></a><a href="/doctors">Our Doctors</a><a href="#how-it-works">How It Works</a><a href="#clinics">For Clinics</a><a href="#about">About Us</a><a href="#faqs">FAQs</a><button className="button" onClick={()=>openEnquiry('patient')}>Enquire Now <span>→</span></button></nav></div></header>
 <main>
 <section className="patient-hero" aria-labelledby="hero-title">
  <div className="container patient-hero-content">
   <h1 id="hero-title">Your <em>Healthcare Connected.</em><br/>That Puts You First.</h1>
   <p>Find trusted doctors, clinics and healthcare<br className="desktop-break"/> services across India — all in one place.</p>
   <div className="patient-hero-visual">
    <img className="patient-hero-photo" src="/patient/hero.svg" alt="A nurse comforting an older patient" width="814" height="730" fetchPriority="high"/>
    <img className="patient-highlight patient-highlight-clinics" src="/patient/highlight-three.svg" alt="400+ Find Suitable Clinics" width="352" height="130"/>
    <img className="patient-highlight patient-highlight-options" src="/patient/highlight-one.svg" alt="200+ Explore Care Options" width="352" height="130"/>
    <img className="patient-highlight patient-highlight-doctors" src="/patient/highlight-two.svg" alt="100+ Doctors Connected Easily" width="352" height="130"/>
   </div>
   <div className="patient-search">
    <div className="search-tabs" role="group" aria-label="Enquiry type">
     <button aria-pressed={type==='patient'} onClick={()=>setType('patient')}><Icon name="person"/>Find Healthcare</button>
     <button aria-pressed={type==='clinic'} onClick={()=>setType('clinic')}><Icon name="clinic"/>For Clinics</button>
    </div>
    <form className="search-form" onSubmit={e=>{e.preventDefault();openEnquiry();}}>
     <label>What care are you looking for?
      <select value={specialty} onChange={e=>setSpecialty(e.target.value)}>{specialties.map(s=><option key={s}>{s}</option>)}</select>
     </label>
     <label>Your Location<span className="location-field"><input placeholder="Enter city or PIN code" value={city} onChange={e=>setCity(e.target.value)}/><Icon name="location"/></span></label>
     <button className="button">{type==='clinic'?'Partner With Us':'Find Options'} <span aria-hidden="true">→</span></button>
    </form>
   </div>
  </div>
 </section>
 <section id="specialties" className="container patient-specialties" aria-labelledby="specialty-title">
  <div className="section-heading">
   <div><p className="eyebrow">Explore by specialty</p><h2 id="specialty-title">What care are <em>you looking for?</em></h2></div>
  </div>
  <div className="specialty-grid">
   {specialties.map((name, index) => (
    <button className="patient-specialty" key={name} onClick={()=>openEnquiry('patient',name)}>
     <img className="patient-specialty-photo" src={`/patient/specialty-${index + 3}.svg`} alt="" loading="lazy" width="179" height="208"/>
     <span className="patient-specialty-label"><SpecialtyIcon index={index}/><span>{name}</span></span>
    </button>
   ))}
  </div>
 </section>
 <section id="how-it-works" className="container patient-process">
  <p className="eyebrow">How it works</p>
  <h2><em>Three simple steps</em> to get connected.</h2>
  <ol className="patient-steps">
   <li>
    <img src="/patient/step-one.svg" alt="" loading="lazy" width="362" height="195"/>
    <div className="patient-step-copy"><span aria-hidden="true">1</span><div><h3>Tell Us Your Need</h3><p>Choose a specialty, share your location and basic details.</p></div></div>
   </li>
   <li className="patient-step-featured">
    <span className="patient-step-number" aria-hidden="true">2</span>
    <h3>Explore Options</h3>
    <p>We help you explore relevant clinics and healthcare providers.</p>
    <button className="button yellow" onClick={()=>openEnquiry('patient')}>Start an Enquiry <Icon name="list"/></button>
   </li>
   <li>
    <img src="/patient/step-three.svg" alt="" loading="lazy" width="362" height="195"/>
    <div className="patient-step-copy"><span aria-hidden="true">3</span><div><h3>Get Connected</h3><p>With your consent, suitable clinics can follow up with you.</p></div></div>
   </li>
  </ol>
 </section>
 <section className="container patient-why">
  <div><p className="eyebrow">Why choose GetMedConnect</p><h2>Your health.<br/><em>Our priority.</em></h2><p>We make it easier for you to find the right care, with clarity and support at every step.</p></div>
  <div className="feature-grid">{features.map(([icon,title,copy])=><article className="feature" key={title}><span className="icon-circle"><Icon name={icon}/></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
 </section>
 <section id="about" className="container patient-family">
  <img src="/patient/family.svg" alt="A healthcare worker with a smiling older couple" loading="lazy" width="536" height="340"/>
  <div><p className="eyebrow">Designed around you</p><h2>A <em>better healthcare experience</em> for you and your family.</h2><p>From finding the right care to connecting with trusted clinics, we’re here to make the journey simpler and clearer.</p></div>
 </section>
 <section id="clinics" className="container patient-partners">
  <span className="icon-circle"><Icon name="link"/></span>
  <div><p className="eyebrow">For healthcare providers</p><h2>Partner with GetMedConnect.</h2><p>Connect with relevant patient enquiries and grow your practice.</p></div>
  <button className="button yellow" onClick={()=>openEnquiry('clinic')}>Explore Clinic Partnerships <span aria-hidden="true">→</span></button>
 </section>
 <section id="faqs" className="container patient-faq">
  <p className="eyebrow">Frequently asked questions</p><h2>Find answers to common questions.</h2>
  <div className="faq-grid">{faqs.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div>
 </section>
 </main>
 <footer><div className="container footer-grid"><div className="footer-brand"><Brand/><p>Connecting people with the right healthcare options, for a healthier tomorrow.</p></div><div><h3>Quick Links</h3>{[['Home','home'],['Find Healthcare','specialties'],['How It Works','how-it-works'],['For Clinics','clinics'],['About Us','about'],['FAQs','faqs']].map(([title,id])=><a key={id} href={`#${id}`}>{title}</a>)}</div><div><h3>Popular Specialties</h3>{specialties.map(s=><button className="footer-link" key={s} onClick={()=>openEnquiry('patient',s)}>{s}</button>)}</div><div><h3>Contact Us</h3><button className="footer-contact" onClick={()=>openEnquiry('patient')}><Icon name="mail"/>Get in touch</button><button className="footer-contact" onClick={()=>openEnquiry('patient')}><Icon name="mail"/>Send us a message</button><p className="footer-contact"><Icon name="location"/>Serving enquiries across India</p></div></div><div className="container footer-bottom"><span>CONNECT · CARE · CHOOSE</span><span>© {new Date().getFullYear()} GetMedConnect. All rights reserved.</span></div></footer>
 <dialog ref={dialog} className="enquiry-dialog" aria-labelledby="enquiry-title" onClick={e=>{if(e.target===e.currentTarget&&!busy)dialog.current.close();}} onCancel={e=>{if(busy)e.preventDefault();}}><div className="dialog-content"><button className="dialog-close" aria-label="Close enquiry form" disabled={busy} onClick={()=>dialog.current.close()}>×</button><p className="eyebrow">LET’S FIND YOUR NEXT STEP</p><h2 id="enquiry-title">{type==='clinic'?'Partner with us.':'Tell us what you need.'}</h2><p>Share your contact details so our team can follow up. Please avoid medical records or sensitive health details.</p><div className="tabs"><button type="button" disabled={busy} aria-pressed={type==='patient'} onClick={()=>{setType('patient');setStatus('');}}>Find Healthcare</button><button type="button" disabled={busy} aria-pressed={type==='clinic'} onClick={()=>{setType('clinic');setStatus('');}}>For Clinics</button></div><form onSubmit={submit} key={type}>
        {type==='clinic' && <label>Clinic name<input name="clinicName" required minLength={2} maxLength={120}/></label>}
        <label>{type==='clinic'?'Contact person':'Your name'}<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
        <div className="fields"><label>Mobile number<input name="phone" type="tel" autoComplete="tel" pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number starting with 6–9" required/></label><label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={254}/></label></div>
        <label>Specialty<select name="specialty" value={specialty} onChange={e=>setSpecialty(e.target.value)}>{specialties.map(s=><option key={s}>{s}</option>)}</select></label>
        <div className="fields"><label>City<input name="city" value={city} onChange={e=>setCity(e.target.value)} required minLength={2} maxLength={80}/></label>{type==='patient'&&<label>PIN code (optional)<input name="pin" defaultValue={pin} inputMode="numeric" pattern="[0-9]{6}" title="Enter a 6-digit PIN code"/></label>}</div>
        <label>{type==='clinic'?'Partnership interest':'Brief requirement (optional)'}<textarea name="requirement" rows={3} maxLength={1000}/></label>
        <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
        <label className="consent"><input type="checkbox" name="consent" required/>I agree to be contacted by GetMedConnect about this enquiry. Provider details and any additional sharing consent will be discussed before forwarding my information.</label>
        <button className="button" disabled={busy}>{busy?'Submitting…':'Send enquiry ↗'}</button><p role="status" className="status">{status}</p>
      </form>
</div></dialog>
 </div>;
}
createRoot(document.getElementById('root')).render(/^\/doctors(?:\/|$)/.test(window.location.pathname) ? <DoctorsPage/> : <App/>);
