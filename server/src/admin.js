import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { doctorAccountAdminRouter } from './doctor-accounts.js';

import { profileSchema, profileFailure } from './doctor-profiles.js';

const text = z.string().trim().min(1).max(200);
const phone = z.string().trim().regex(/^\+?[\d ()-]{7,20}$/);
const leadSchema = z.object({ name: text, phone, specialty: text, city: text, source: text.default('Admin'), status: z.enum(['New', 'Contacted', 'Qualified', 'Closed']).default('New') });
export const doctorSchema = z.object({ name: text, email: z.email(), phone, specialty: text, city: text, registrationNumber: text, status: z.enum(['Pending', 'Active', 'Inactive']).default('Pending') });
const appointmentSchema = z.object({ leadId: text, doctorId: text, scheduledAt: z.iso.datetime({ offset: true }), status: z.enum(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-show']).default('Scheduled'), outcome: z.enum(['Pending', 'Converted', 'Not converted']).default('Pending'), notes: z.string().trim().max(1000).default('') });

export function createAdminStore(path) {
  let queue = Promise.resolve();
  async function read() {
    try { return JSON.parse(await readFile(path, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { leads: [], doctors: [], appointments: [] }; throw error; }
  }
  return {
    read,
    update(change) {
      const result = queue.then(async () => {
        const data = await read();
        const value = change(data);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2), { mode: 0o600 });
        await rename(`${path}.tmp`, path);
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
}

export function createAdminRouter({ store, token, live = null, accountService = null, profiles = null }) {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use((req, res, next) => {
    if (!token) return res.status(503).json({ error: 'Set ADMIN_API_TOKEN on the server to enable admin access.' });
    const actual = Buffer.from(req.get('authorization') || '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'Invalid admin access token.' });
    next();
  });
  if (accountService) router.use(doctorAccountAdminRouter(accountService));
  router.get('/doctors/:id/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!profiles) return res.status(503).json({ error: 'Doctor profile database is not configured.' });
    if (!z.uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid doctor ID.' });
    const doctor = await profiles.get(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
    res.json({ doctor });
  });
  router.put('/doctors/:id/profile', async (req, res) => {
    if (!profiles) return res.status(503).json({ error: 'Doctor profile database is not configured.' });
    const parsed = profileSchema.safeParse(req.body);
    if (!z.uuid().safeParse(req.params.id).success || !parsed.success) return res.status(400).json({ error: 'Check your profile fields.' });
    try {
      const doctor = await profiles.update(req.params.id, parsed.data);
      if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
      res.json({ doctor });
    } catch (error) { profileFailure(error, res); }
  });
  router.get('/records', async (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(await store.read()); });
  router.get('/live/:collection', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!live) return res.status(503).json({ error: 'Neon Realtime is not configured.' });
    const sealedQuery = await live.seal(req.params.collection);
    if (!sealedQuery) return res.status(404).json({ error: 'Unknown collection.' });
    res.json({ url: live.url, sealedQuery });
  });
  for (const [collection, schema] of Object.entries({ leads: leadSchema, doctors: doctorSchema, appointments: appointmentSchema })) {
    for (const method of ['post', 'patch']) router[method](`/${collection}${method === 'patch' ? '/:id' : ''}`, async (req, res) => {
      const parsed = (method === 'patch' ? schema.partial() : schema).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Check the record fields.', fields: parsed.error.flatten().fieldErrors });
      try {
        const record = await store.update(data => {
          const existing = method === 'patch' ? data[collection].find(row => row.id === req.params.id) : null;
          if (method === 'patch' && !existing) throw Object.assign(new Error('Record not found.'), { status: 404 });
          const record = { ...(existing || { id: randomUUID(), createdAt: new Date().toISOString() }), ...parsed.data, updatedAt: new Date().toISOString() };
          if (collection === 'doctors' && data.doctors.some(row => row.id !== record.id && row.registrationNumber.toLowerCase() === record.registrationNumber.toLowerCase())) throw new Error('This registration number is already registered.');
          if (collection === 'appointments') {
            const doctor = data.doctors.find(row => row.id === record.doctorId);
            if (!doctor || !data.leads.some(row => row.id === record.leadId)) throw new Error('Select an existing lead and doctor.');
            if (['Scheduled', 'Confirmed'].includes(record.status) && doctor.status !== 'Active') throw new Error('Appointments require an active doctor.');
            if (record.outcome !== 'Pending' && record.status !== 'Completed') throw new Error('Complete the appointment before recording conversion.');
            if (['Scheduled', 'Confirmed'].includes(record.status) && data.appointments.some(row => row.id !== record.id && row.doctorId === record.doctorId && row.scheduledAt === record.scheduledAt && ['Scheduled', 'Confirmed'].includes(row.status))) throw new Error('The doctor already has an appointment at this time.');
          }
          if (existing) Object.assign(existing, record); else data[collection].push(record);
          return record;
        });
        res.status(method === 'post' ? 201 : 200).json(record);
      } catch (error) { if (error.code) throw error; res.status(error.status || 400).json({ error: error.message }); }
    });
  }
  for (const collection of ['leads', 'doctors', 'appointments']) {
    router.delete('/' + collection + '/:id', async (req, res) => {
      try {
        await store.update(data => {
          const index = data[collection].findIndex(row => row.id === req.params.id);
          if (index < 0) throw Object.assign(new Error('Record not found.'), { status: 404 });
          const reference = collection === 'doctors' ? 'doctorId' : 'leadId';
          if (collection !== 'appointments' && data.appointments.some(row => row[reference] === req.params.id)) {
            throw Object.assign(new Error('Delete linked appointments before deleting this record.'), { status: 409 });
          }
          data[collection].splice(index, 1);
        });
        res.json({ deleted: true });
      } catch (error) {
        if (error.code) throw error;
        res.status(error.status || 400).json({ error: error.message });
      }
    });
  }
  router.use((_error, _req, res, _next) => res.status(500).json({ error: 'Admin storage is unavailable.' }));
  return router;
}
