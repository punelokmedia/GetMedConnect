import '../src/env.js';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createPool } from '../src/database.js';

const pool = createPool(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(724193652)');
  await client.query('CREATE SCHEMA IF NOT EXISTS gmc');
  await client.query('CREATE TABLE IF NOT EXISTS gmc.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await readdir(new URL('../migrations/', import.meta.url))).filter(name => /^\d+_.*\.sql$/.test(name)).sort();
  const applied = [];
  for (const file of files) {
  const name = file.replace(/\.sql$/, '');
  const sql = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const existing = await client.query('SELECT checksum FROM gmc.migrations WHERE name = $1', [name]);
  if (existing.rows.length && existing.rows[0].checksum !== checksum) throw new Error('Applied migration checksum changed. Add a new migration instead.');
  if (!existing.rows.length) {
    await client.query(sql);
    await client.query('INSERT INTO gmc.migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
    applied.push(name);
  }
  }
  await client.query('COMMIT');
  console.log(applied.length ? `Migrations applied: ${applied.join(', ')}.` : 'All migrations already applied.');
} catch (error) { await client.query('ROLLBACK'); console.error(`Migration failed (${error.code || error.name}).`); process.exitCode = 1; }
finally { client.release(); await pool.end(); }
