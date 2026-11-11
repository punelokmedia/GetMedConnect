import React, { useRef, useState } from 'react';
import './profile-form.css';

const emptyProfile = doctor => ({ name: doctor.name || '', gender: '', age: '', phone: doctor.phone || '', email: doctor.email || '', qualification: '', specialty: doctor.specialty || '', experience: '', registration: doctor.registrationNumber || '', council: '', clinic: '', address: '', city: doctor.city || '', pincode: '', bio: '', modes: [], services: [], photo: '' });

export function ProfileForm({ doctor, savedDraft, onSave, onCancel, Icon }) {
  const initial = { ...emptyProfile(doctor), ...Object.fromEntries(Object.keys(emptyProfile(doctor)).map(key => [key, doctor[key] ?? emptyProfile(doctor)[key]])), ...(savedDraft || {}) };
  const [values, setValues] = useState(initial);
  const [service, setService] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const upload = useRef(null);
  const uploadVersion = useRef(0);
  const change = (name, value) => { setValues(current => ({ ...current, [name]: value })); setNotice(''); };
  function addService() {
    const next = service.trim();
    if (!next) return;
    if (values.services.length >= 30) { setError('Add up to 30 services or treatments.'); return; }
    if (!values.services.some(item => item.toLowerCase() === next.toLowerCase())) change('services', [...values.services, next]);
    setService('');
  }
  function photoChanged(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const version = ++uploadVersion.current;
    setPhotoLoading(false);
    setError('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG or PNG photo no larger than 5 MB.'); event.target.value = ''; return; }
    const reader = new FileReader();
    setPhotoLoading(true);
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (version !== uploadVersion.current) return;
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 480 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/jpeg', .8);
        if (photo.length > 350000) setError('The photo is too large after resizing. Choose another photo.');
        else change('photo', photo);
        setPhotoLoading(false);
      };
      image.onerror = () => { if (version === uploadVersion.current) { setError('The photo could not be opened.'); setPhotoLoading(false); } };
      image.src = reader.result;
    };
    reader.onerror = () => { setError('The photo could not be opened. Please try again.'); setPhotoLoading(false); };
    reader.readAsDataURL(file);
  }
  async function save(event) {
    event.preventDefault();
    if (!values.modes.length) { setError('Select at least one consultation mode.'); return; }
    if (!values.services.length) { setError('Add at least one service or treatment.'); return; }
    setError(''); setNotice(''); setSaving(true);
    try { await onSave(values); setNotice('Profile saved. Your details are now shared with admin and your active public profile.'); }
    catch (error) { setError(error.message || 'Profile could not be saved. Please try again.'); }
    finally { setSaving(false); }
  }
  function field(name, label, options = {}) {
    const { type = 'text', required = true, ...rest } = options;
    return <label className="profile-field"><span>{label}{required && <b aria-hidden="true"> *</b>}</span><input name={name} type={type} required={required} value={values[name]} onChange={event => change(name, event.target.value)} {...rest}/></label>;
  }
  return <div className="profile-editor">
    <header className="profile-title"><span className="mint-avatar"><Icon name="user"/></span><div><h2>Doctor Profile</h2><p>Manage your professional details, clinic information and profile.</p></div></header>
    <form onSubmit={save}><fieldset className="profile-form-fields" disabled={saving}>
      <section className="profile-section profile-photo-section"><h3><span className="mint-avatar small"><Icon name="user"/></span>Profile Photo</h3><div className="profile-photo">{values.photo ? <img src={values.photo} alt="Your profile preview"/> : <span>{values.name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('') || 'DR'}</span>}</div><div className="profile-photo-copy"><h4>Update Photo</h4><p>Upload a clear, professional photo.</p><small>JPG, PNG (Max 5 MB)</small></div><input ref={upload} className="profile-file-input" type="file" accept="image/jpeg,image/png" aria-label="Upload profile photo" onChange={photoChanged}/><button className="mint-button" type="button" onClick={() => upload.current.click()}><Icon name="user"/>Upload Photo</button></section>
      <section className="profile-section"><h3><span className="mint-avatar small"><Icon name="user"/></span>Personal Details</h3><div className="profile-grid three">{field('name', 'Full Name', { maxLength: 200, autoComplete: 'name' })}<label className="profile-field"><span>Gender<b aria-hidden="true"> *</b></span><select required value={values.gender} onChange={event => change('gender', event.target.value)}><option value="">Select gender</option>{['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(value => <option key={value}>{value}</option>)}</select></label>{field('age', 'Age', { type: 'number', required: false, min: 18, max: 120 })}</div><div className="profile-grid">{field('phone', 'Mobile Number', { type: 'tel', autoComplete: 'tel', pattern: '[+0-9 ()-]{7,20}', maxLength: 20 })}{field('email', 'Email Address', { type: 'email', autoComplete: 'email' })}</div></section>
      <section className="profile-section"><h3><span className="mint-avatar small"><Icon name="check"/></span>Professional Details</h3><div className="profile-grid three">{field('qualification', 'Qualification', { placeholder: 'e.g. MBBS, MS (Orthopedics)', maxLength: 200 })}{field('specialty', 'Specialty', { list: 'profile-specialties', maxLength: 200 })}<datalist id="profile-specialties">{['Orthopedics','Cardiology','Dermatology','General Medicine','Gynecology','IVF','Pediatrics'].map(value => <option key={value} value={value}/>)}</datalist>{field('experience', 'Experience (Years)', { type: 'number', min: 0, max: 80 })}</div><div className="profile-grid">{field('registration', 'Registration Number (MCI/State)', { maxLength: 100 })}{field('council', 'Medical Council', { placeholder: 'e.g. Maharashtra Medical Council', maxLength: 200 })}</div></section>
      <section className="profile-section"><h3><span className="mint-avatar small"><Icon name="home"/></span>Clinic / Hospital Details</h3><div className="profile-grid">{field('clinic', 'Clinic / Hospital Name', { maxLength: 200 })}<fieldset className="profile-modes"><legend>Consultation Mode <b aria-hidden="true">*</b></legend><div>{[['In-Clinic', 'In-Clinic'], ['Online', 'Online']].map(([value, label]) => <label key={value}><input type="checkbox" checked={values.modes.includes(value)} onChange={event => change('modes', event.target.checked ? [...values.modes, value] : values.modes.filter(mode => mode !== value))}/>{label}</label>)}</div></fieldset></div><label className="profile-field"><span>Clinic Address<b aria-hidden="true"> *</b></span><textarea required rows={2} maxLength={500} autoComplete="street-address" value={values.address} onChange={event => change('address', event.target.value)}/></label><div className="profile-grid">{field('city', 'City', { autoComplete: 'address-level2', maxLength: 100 })}{field('pincode', 'Pincode', { inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6, autoComplete: 'postal-code', title: 'Enter a six-digit pincode' })}</div></section>
      <section className="profile-section"><h3><span className="mint-avatar small"><Icon name="note"/></span>About You</h3><div className="profile-grid"><label className="profile-field"><span>Short Bio / About the Doctor<b aria-hidden="true"> *</b></span><textarea required rows={4} maxLength={250} value={values.bio} onChange={event => change('bio', event.target.value)} placeholder="Tell patients about your experience and approach to care."/><small className="profile-counter">{values.bio.length} / 250</small></label><div className="profile-field"><label htmlFor="profile-service">Services / Treatments Offered<b aria-hidden="true"> *</b></label><div className="profile-services"><div className="profile-tags">{values.services.map(item => <span key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => change('services', values.services.filter(value => value !== item))}>×</button></span>)}</div><div className="profile-service-add"><input id="profile-service" value={service} maxLength={80} placeholder="Add a service" onChange={event => setService(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addService(); } }}/><button type="button" onClick={addService} disabled={!service.trim()}>Add</button></div></div></div></div></section>
      {error && <p className="notice notice-error" role="alert">{error}</p>}{notice && <p className="notice notice-success" role="status">{notice}</p>}
      <footer className="profile-form-actions"><button type="button" className="mint-button" onClick={() => { uploadVersion.current++; setValues(initial); setError(''); setNotice(''); onCancel(); }}>Cancel</button><button className="mint-button solid" type="submit" disabled={saving || photoLoading}><Icon name="check"/>{saving ? "Saving..." : photoLoading ? "Preparing photo..." : "Save Changes"}</button></footer>
    </fieldset></form>
  </div>;
}
