import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

export const publicProfile = row => {
  const { id, name, specialty, city } = row;
  const result = { id, name, specialty, city };
  for (const key of ['qualification', 'experience', 'clinic', 'address', 'pincode', 'bio', 'modes', 'services']) {
    if (row.profile?.[key] !== undefined) result[key] = row.profile[key];
  }
  if (row.photoUrl) result.photoUrl = row.photoUrl;
  return result;
};
const searchSchema = z.object({ q: z.string().trim().max(120).default(''), city: z.string().trim().max(120).default(''), specialty: z.string().trim().max(120).default(''), page: z.coerce.number().int().min(1).max(10000).default(1) });

export function createPublicDoctorsRouter({ store, profiles = null }) {
  const router = express.Router();
  router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', async (req, res) => {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Check your search filters.' });
    const { q, city, specialty, page } = parsed.data;
    if (store.findPublicDoctors) {
      const rows = await store.findPublicDoctors(parsed.data);
      return res.json({ doctors: rows.slice(0, 12).map(publicProfile), page, hasNext: rows.length > 12 });
    }
    const includes = (value, search) => value.toLowerCase().includes(search.toLowerCase());
    const rows = (await store.read()).doctors.filter(row => row.status === 'Active' && includes(`${row.name} ${row.specialty} ${row.city}`, q) && includes(row.city, city) && includes(row.specialty, specialty)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    res.json({ doctors: rows.slice((page - 1) * 12, page * 12).map(publicProfile), page, hasNext: rows.length > page * 12 });
  });
  router.get('/:id/photo', async (req, res) => {
    if (!profiles || !z.uuid().safeParse(req.params.id).success) return res.status(404).end();
    const photo = await profiles.publicPhoto(req.params.id);
    if (!photo) return res.status(404).end();
    const match = photo.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
    if (!match) return res.status(404).end();
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(match[1]).send(Buffer.from(match[2], 'base64'));
  });
  router.get('/:id', async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) return res.status(404).json({ error: 'Doctor profile not found.' });
    const doctor = store.getPublicDoctor ? await store.getPublicDoctor(req.params.id) : (await store.read()).doctors.find(row => row.id === req.params.id && row.status === 'Active');
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });
    res.json({ doctor: publicProfile(doctor) });
  });
  router.use((_error, _req, res, _next) => res.status(503).json({ error: 'The doctor directory is temporarily unavailable. Please try again.' }));
  return router;
}
