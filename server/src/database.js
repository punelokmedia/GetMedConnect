import './env.js';
import pg from 'pg';
import { publicColumns } from './doctor-profiles.js';
import { attachDatabasePool } from '@vercel/functions';

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required. Run neon deploy to pull your database environment.');
  const pool = new pg.Pool({ connectionString: connectionString.replace('sslmode=require', 'sslmode=verify-full'), max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000 });
  pool.on('error', () => console.error('An idle PostgreSQL connection failed. A new connection will be used.'));
  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
}

export const columns = {
  leads: ['id', 'name', 'phone', 'specialty', 'city', 'source', 'status', 'createdAt', 'updatedAt'],
  doctors: ['id', 'name', 'email', 'phone', 'specialty', 'city', 'registrationNumber', 'status', 'createdAt', 'updatedAt'],
  appointments: ['id', 'leadId', 'doctorId', 'scheduledAt', 'status', 'outcome', 'notes', 'createdAt', 'updatedAt'],
};
const sqlName = name => name.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
export function selectRecords(collection) {
  if (!Object.hasOwn(columns, collection)) throw new Error('Unknown collection.');
  return `SELECT ${columns[collection].map(key => `${sqlName(key)} AS "${key}"`).join(', ')} FROM gmc.${collection} ORDER BY created_at, id`;
}
function serialize(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));
}
async function readRecords(client) {
  const data = {};
  for (const collection of Object.keys(columns)) data[collection] = (await client.query(selectRecords(collection))).rows.map(serialize);
  return data;
}

// Retains the existing validation callback while making writes atomic across API instances.
// Only changed rows are written. This starter serializes coordination changes with one advisory lock.
export function createPostgresStore(pool) {
  return {
    async findPublicDoctors({ q, city, specialty, page }) {
      const literal = value => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
      const result = await pool.query(`SELECT ${publicColumns} FROM gmc.doctors WHERE status = 'Active' AND (name ILIKE $1 OR specialty ILIKE $1 OR city ILIKE $1) AND city ILIKE $2 AND specialty ILIKE $3 ORDER BY name, id LIMIT 13 OFFSET $4`, [literal(q), literal(city), literal(specialty), (page - 1) * 12]);
      return result.rows;
    },
    async getPublicDoctor(id) {
      const result = await pool.query(`SELECT ${publicColumns} FROM gmc.doctors WHERE id = $1 AND status = 'Active'`,  [id]);
      return result.rows[0];
    },
    async read() {
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const data = await readRecords(client);
        await client.query('COMMIT');
        return data;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    async update(change) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(724193651)');
        const data = await readRecords(client);
        const before = structuredClone(data);
        const value = change(data);
        for (const [collection, keys] of Object.entries(columns)) {
          const previous = new Map(before[collection].map(row => [row.id, JSON.stringify(row)]));
          for (const row of data[collection]) {
            if (previous.get(row.id) === JSON.stringify(row)) continue;
            const names = keys.map(sqlName);
            await client.query(`INSERT INTO gmc.${collection} (${names.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (id) DO UPDATE SET ${names.filter(name => name !== 'id').map(name => `${name} = EXCLUDED.${name}`).join(', ')}`, keys.map(key => row[key]));
          }
        }
        await client.query('COMMIT');
        return value;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
  };
}
