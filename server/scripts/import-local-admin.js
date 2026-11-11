import '../src/env.js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { columns, createPool } from '../src/database.js';

// Import parents before appointments; preserve existing cloud records and the backup.
const path = process.env.ADMIN_DATA_FILE || new URL('../data/admin.json', import.meta.url);
const local = JSON.parse(await readFile(path, 'utf8'));
for (const [collection, keys] of Object.entries(columns)) {
  if (!Array.isArray(local[collection])) throw new Error(`Missing ${collection} array.`);
  const ids = new Set();
  for (const row of local[collection]) {
    z.uuid().parse(row.id);
    if (ids.has(row.id)) throw new Error(`Duplicate ID in ${collection}.`);
    ids.add(row.id);
    for (const key of keys) {
      if (row[key] === undefined || row[key] === null) throw new Error(`Missing ${collection}.${key}.`);
    }
  }
}
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '15s'");
  await client.query("SET LOCAL statement_timeout = '60s'");
  await client.query('SELECT pg_advisory_xact_lock(724193651)');
  const summary = {};
  for (const [collection, keys] of Object.entries(columns)) {
    let imported = 0;
    const names = keys.map(key => key.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`));
    for (const row of local[collection]) {
      const result = await client.query(
        `INSERT INTO gmc.${collection} (${names.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (id) DO NOTHING`,
        keys.map(key => row[key]),
      );
      imported += result.rowCount;
    }
    const verified = await client.query(`SELECT count(*)::int AS count FROM gmc.${collection} WHERE id = ANY($1::uuid[])`, [local[collection].map(row => row.id)]);
    if (verified.rows[0].count !== local[collection].length) throw new Error(`Verification failed for ${collection}.`);
    summary[collection] = { imported, existing: local[collection].length - imported, verified: verified.rows[0].count };
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ summary, localFilePreserved: true }));
} catch (error) {
  await client.query('ROLLBACK');
  console.error(`Admin import rolled back (${error.code || error.name}). No partial import committed.`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
