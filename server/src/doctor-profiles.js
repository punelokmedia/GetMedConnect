import { z } from 'zod';

const text = z.string().trim().min(1).max(200);
const photo = z.string().max(350000).refine(value => {
  if (value === '') return true;
  const match = value.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  const bytes = Buffer.from(match[2], 'base64');
  return match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}, 'Upload a valid resized JPG or PNG photo.');
export const profileSchema = z.object({
  name: text, gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']),
  age: z.union([z.literal(''), z.coerce.number().int().min(18).max(120)]),
  phone: z.string().trim().regex(/^\+?[\d ()-]{7,20}$/), email: z.email(),
  qualification: text, specialty: text, experience: z.coerce.number().int().min(0).max(80),
  registration: text, council: text, clinic: text, address: z.string().trim().min(1).max(500),
  city: text, pincode: z.string().regex(/^\d{6}$/), bio: z.string().trim().min(1).max(250),
  modes: z.array(z.enum(['In-Clinic', 'Online'])).min(1).max(2).transform(values => [...new Set(values)]),
  services: z.array(z.string().trim().min(1).max(80)).min(1).max(30).transform(values => [...new Set(values)]),
  photo: photo.optional(),
}).strict();

export const profileColumns = `id, name, email, phone, specialty, city, registration_number AS "registrationNumber", status, profile, updated_at AS "updatedAt"`;
export const publicColumns = `id, name, specialty, city, profile, CASE WHEN photo <> '' THEN '/api/doctors/' || id || '/photo?v=' || extract(epoch FROM updated_at)::text ELSE '' END AS "photoUrl"`;
export function fullProfile(row) { return row ? { ...row.profile, ...row, profile: undefined, registration: row.registrationNumber } : null; }

export function createDoctorProfileStore(pool) {
  return {
    async get(id) { return fullProfile((await pool.query(`SELECT ${profileColumns}, photo FROM gmc.doctors WHERE id = $1`, [id])).rows[0]); },
    async update(id, values) {
      const { name, email, phone, specialty, city, registration, photo, ...profile } = values;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Shares the admin store lock so concurrent admin changes cannot overwrite a profile save.
        await client.query('SELECT pg_advisory_xact_lock(724193651)');
        const row = (await client.query(`UPDATE gmc.doctors SET name=$2, email=$3, phone=$4, specialty=$5, city=$6, registration_number=$7, profile=$8::jsonb, photo=COALESCE($9, photo), updated_at=now() WHERE id=$1 RETURNING ${profileColumns}, photo`, [id, name, email, phone, specialty, city, registration, JSON.stringify(profile), photo ?? null])).rows[0];
        await client.query('COMMIT');
        return fullProfile(row);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async publicPhoto(id) { return (await pool.query("SELECT photo FROM gmc.doctors WHERE id=$1 AND status='Active' AND photo <> ''", [id])).rows[0]?.photo; },
  };
}

export function profileFailure(error, res) {
  if (error.code === '23505') return res.status(409).json({ error: 'This medical registration number is already registered.' });
  return res.status(503).json({ error: 'Doctor profile could not be saved. Please retry.' });
}
