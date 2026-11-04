import React, { useCallback, useEffect, useState } from 'react';

export function DoctorAccounts({ token, doctors }) {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);
  async function request(path, options = {}) {
    const response = await fetch(`/api/admin${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Account operation failed.');
    return result;
  }
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/doctor-accounts', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load doctor login accounts.');
    setAccounts(result.accounts);
  }, [token]);
  useEffect(() => { let current = true; load().catch(error => { if (current) setError(error.message); }); return () => { current = false; }; }, [load, doctors]);
  async function action(doctor, operation, enabled) {
    setBusy(true); setError(''); setCredentials(null);
    try {
      const path = `/doctors/${doctor.id}/account${operation === 'reset' ? '/reset' : ''}`;
      const result = await request(path, { method: operation === 'toggle' ? 'PATCH' : 'POST', body: JSON.stringify(operation === 'toggle' ? { enabled } : {}) });
      if (result.temporaryPassword) setCredentials({ ...result, name: doctor.name });
      await load();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <article className="panel"><h2>Doctor login access</h2><p>Register a doctor below, then create their login here. Provide the generated credentials privately. Website visibility is managed separately with the doctor’s registry status.</p>{error && <p role="alert" className="error">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Doctor</th><th>Login email</th><th>Access</th><th>Actions</th></tr></thead><tbody>{doctors.map(doctor => {
    const account = accounts.find(row => row.doctorId === doctor.id);
    return <tr key={doctor.id}><td><strong>{doctor.name}</strong></td><td>{account?.loginEmail || doctor.email}</td><td>{account ? account.loginEnabled ? 'Enabled' : 'Disabled' : 'Not created'}{account?.mustChangePassword && <small>Password change required</small>}</td><td><div className="account-actions">{!account ? <button disabled={busy} onClick={() => action(doctor, 'create')}>Create login</button> : <><button disabled={busy} onClick={() => action(doctor, 'reset')}>Reset password</button><button className="secondary" disabled={busy} onClick={() => action(doctor, 'toggle', !account.loginEnabled)}>{account.loginEnabled ? 'Disable access' : 'Enable access'}</button></>}</div></td></tr>;
  })}</tbody></table></div>{!doctors.length && <p>Add a doctor to create their login.</p>}{credentials && <section className="credentials-box" role="status"><h3>Login created for {credentials.name}</h3><p>Copy these credentials now. The temporary password will not be shown again. The doctor must change it before accessing patient details.</p><label>Login email<input readOnly value={credentials.email}/></label><label>Temporary password<input readOnly autoComplete="off" value={credentials.temporaryPassword}/></label><button className="secondary" onClick={() => setCredentials(null)}>I’ve saved the credentials — dismiss</button></section>}</article>;
}
