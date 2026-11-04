import { createRealtime, rawSql } from '@neon/realtime/server';
import { selectRecords, columns } from './database.js';

export function createLiveService() {
  if (!process.env.DATABASE_URL || !process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) return null;
  const realtime = createRealtime({ secret: process.env.NEON_REALTIME_SECRET, db: decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)) });
  return {
    url: process.env.NEON_REALTIME_URL,
    async seal(collection) {
      if (!Object.hasOwn(columns, collection)) return null;
      return realtime.seal({ query: rawSql(selectRecords(collection)) });
    },
  };
}
