import '../src/env.js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { doctorSchema } from '../src/admin.js';
import { createPool } from '../src/database.js';

// One-time bridge from the previous local admin store. Never overwrites cloud rows.
const path = process.env.ADMIN_DATA_FILE || new URL('../data/admin.json', import.meta.url);
const local = JSON.parse(await readFile(path, 'utf8'));
const schema = doctorSchema.extend({ id: z.uuid(), createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }) });
const doctors = z.array(schema).parse(local.doctors);
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(724193651)');
  let imported = 0;
  for (const doctor of doctors) {
    const result = await client.query(`INSERT INTO gmc.doctors (id, name, email, phone, specialty, city, registration_number, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`, [doctor.id, doctor.name, doctor.email, doctor.phone, doctor.specialty, doctor.city, doctor.registrationNumber, doctor.status, doctor.createdAt, doctor.updatedAt]);
    imported += result.rowCount;
  }
  await client.query('COMMIT');
  console.log(`Doctor import complete: ${imported} imported, ${doctors.length - imported} existing/conflicting records skipped. Local file preserved.`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
