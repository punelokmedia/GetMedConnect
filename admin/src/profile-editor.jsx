import React, { useEffect, useState } from 'react';
import { ProfileForm } from '../../doctor/src/profile-form.jsx';
import { Icon } from '../../doctor/src/dashboard.jsx';
import './profile-editor.css';

export function DoctorProfileEditor({ doctorId, api, onClose, onSaved }) {
  const [doctor, setDoctor] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    api(`/doctors/${doctorId}/profile`).then(result => { if (current) setDoctor(result.doctor); }).catch(error => { if (current) setError(error.message); });
    return () => { current = false; };
  }, [doctorId]);
  async function save(values) {
    const result = await api(`/doctors/${doctorId}/profile`, { method: 'PUT', body: JSON.stringify(values) });
    setDoctor(result.doctor);
    await onSaved();
  }
  return <div className="modal-backdrop"><section className="admin-profile-editor" role="dialog" aria-modal="true" aria-label="Edit doctor profile"><p className="admin-profile-note">Contact email changes do not change the doctor's login email. Account access and website visibility are managed in the doctor registry.</p>{error && <p role="alert" className="error">{error}</p>}{doctor ? <ProfileForm doctor={doctor} onSave={save} onCancel={onClose} Icon={Icon}/> : <><p role="status">{error ? 'Unable to open profile.' : 'Loading doctor profile…'}</p><button onClick={onClose}>Close</button></>}</section></div>;
}
