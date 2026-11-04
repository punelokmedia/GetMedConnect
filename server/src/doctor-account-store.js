export function createDoctorAccountStore(pool) {
  const accountColumns = `doctor_id AS "doctorId", firebase_uid AS "firebaseUid", login_email AS "loginEmail", login_enabled AS "loginEnabled", must_change_password AS "mustChangePassword", credentials_issued_at AS "credentialsIssuedAt"`;
  return {
    async list() { return (await pool.query(`SELECT ${accountColumns} FROM gmc.doctor_accounts ORDER BY created_at`)).rows; },
    async getByDoctor(id) { return (await pool.query(`SELECT ${accountColumns} FROM gmc.doctor_accounts WHERE doctor_id = $1`, [id])).rows[0]; },
    async getByUid(uid) { return (await pool.query(`SELECT ${accountColumns} FROM gmc.doctor_accounts WHERE firebase_uid = $1`, [uid])).rows[0]; },
    async doctor(id) { return (await pool.query('SELECT id, name, email, specialty, city FROM gmc.doctors WHERE id = $1', [id])).rows[0]; },
    async create({ doctorId, firebaseUid, loginEmail }) {
      await pool.query('INSERT INTO gmc.doctor_accounts (doctor_id, firebase_uid, login_email) VALUES ($1,$2,$3)', [doctorId, firebaseUid, loginEmail]);
    },
    async setEnabled(id, enabled) { await pool.query('UPDATE gmc.doctor_accounts SET login_enabled = $2, updated_at = now() WHERE doctor_id = $1', [id, enabled]); },
    async requirePasswordChange(id) { await pool.query('UPDATE gmc.doctor_accounts SET must_change_password = true, credentials_issued_at = now(), updated_at = now() WHERE doctor_id = $1', [id]); },
    async passwordChanged(id) { await pool.query('UPDATE gmc.doctor_accounts SET must_change_password = false, credentials_issued_at = now(), updated_at = now() WHERE doctor_id = $1', [id]); },
    async appointments(doctorId) {
      return (await pool.query(`SELECT a.id, a.scheduled_at AS "scheduledAt", a.status, a.outcome, a.notes, l.name AS "patientName", l.phone AS "patientPhone", l.specialty, l.city FROM gmc.appointments a JOIN gmc.leads l ON l.id = a.lead_id WHERE a.doctor_id = $1 ORDER BY a.scheduled_at DESC LIMIT 200`, [doctorId])).rows;
    },
    async updateAppointment(doctorId, id, { status, outcome }) {
      return (await pool.query(`UPDATE gmc.appointments SET status = $3, outcome = $4, updated_at = now() WHERE doctor_id = $1 AND id = $2 RETURNING id, status, outcome`, [doctorId, id, status, outcome])).rows[0];
    },
  };
}
