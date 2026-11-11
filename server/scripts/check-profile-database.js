import '../src/env.js';
import { randomUUID } from 'node:crypto';
import { createPool, createPostgresStore } from '../src/database.js';
import { createDoctorProfileStore, profileSchema } from '../src/doctor-profiles.js';

// Optional hostname targets an isolated Neon branch; credentials stay in environment memory.
const hostname = process.argv[2];
if (hostname && !/^ep-[a-z0-9-]+\.c-\d+\.[a-z0-9-]+\.aws\.neon\.tech$/.test(hostname)) throw Error('Invalid test database hostname.');
const connection = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
if (hostname) connection.hostname = hostname;
process.env.DATABASE_URL = connection.href;
process.env.DATABASE_URL_UNPOOLED = connection.href;
await import('./migrate.js');
if (process.exitCode) process.exit(process.exitCode);
const pool = createPool(connection.href);
const profiles = createDoctorProfileStore(pool); const store = createPostgresStore(pool);
const id = randomUUID();
try {
  await pool.query(`INSERT INTO gmc.doctors(id,name,email,phone,specialty,city,registration_number,status,created_at,updated_at) VALUES($1,'Profile smoke test','test@example.invalid','9876543210','Test','Test',$2,'Pending',now(),now())`, [id, `SMOKE-${id}`]);
  const values = profileSchema.parse({ name: 'Profile smoke test', email: 'test@example.invalid', phone: '9876543210', gender: 'Prefer not to say', age: '', qualification: 'MBBS', specialty: 'General Medicine', experience: 4, registration: `SMOKE-${id}`, council: 'Test Council', clinic: 'Test Clinic', address: 'Test Address', city: 'Test City', pincode: '411038', bio: 'Database profile smoke test', modes: ['Online'], services: ['Consultation'], photo: '' });
  await profiles.update(id, values);
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFuoAAAAASUVORK5CYII=';
  await profiles.update(id, profileSchema.parse({ ...values, photo }));
  if ((await profiles.get(id)).photo !== photo) throw Error('Photo did not persist.');
  if (await profiles.publicPhoto(id)) throw Error('Pending doctor photo leaked publicly.');
  if ((await profiles.get(id)).clinic !== 'Test Clinic') throw Error('Profile did not persist.');
  if (await store.getPublicDoctor(id)) throw Error('Pending doctor leaked publicly.');
  await store.update(data => { const doctor = data.doctors.find(row => row.id === id); doctor.status = 'Active'; doctor.updatedAt = new Date().toISOString(); });
  if ((await store.getPublicDoctor(id))?.profile?.bio !== values.bio) throw Error('Public profile did not share persisted data.');
  if ((await profiles.get(id)).clinic !== values.clinic) throw Error('Admin write lost extended fields.');
  if ((await profiles.publicPhoto(id)) !== photo) throw Error('Active doctor photo is unavailable.');
  if (!(await store.getPublicDoctor(id)).photoUrl) throw Error('Public photo URL is unavailable.');
  console.log('Database profile round-trip, admin preservation, and public visibility checks passed.');
} catch (error) { console.error(`Profile database check failed (${error.code || error.message}).`); process.exitCode = 1; }
finally { await pool.query('DELETE FROM gmc.doctors WHERE id=$1', [id]); await pool.end(); }
