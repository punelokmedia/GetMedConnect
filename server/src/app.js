import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { schemas } from './validation.js';

export function createApp({ append, origin = ['http://localhost:5173', 'http://127.0.0.1:5173'], trustProxy = false }) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  app.use(cors({ origin }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/enquiries', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.post('/api/enquiries/:type', async (req, res) => {
    const schema = Object.hasOwn(schemas, req.params.type) ? schemas[req.params.type] : undefined;
    if (!schema) return res.status(404).json({ error: 'Unknown enquiry type.' });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the form fields and consent.', fields: parsed.error.flatten().fieldErrors });
    const id = `GMC-${randomUUID()}`;
    const data = parsed.data;
    const common = [data.name, data.phone, data.email || '', data.specialty, data.city];
    const row = [id, new Date().toISOString(), ...(req.params.type === 'clinic' ? [data.clinicName, ...common] : [...common, data.pin || '']), data.requirement || '', 'Yes', 'New'];
    try {
      await append(req.params.type === 'clinic' ? 'Clinic_Enquiries' : 'Patient_Enquiries', row);
      return res.status(201).json({ success: true, id });
    } catch {
      return res.status(503).json({ error: 'We could not save your enquiry. Please try again later.' });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, _req, res, _next) => res.status(err.status === 413 ? 413 : 400).json({ error: 'Invalid request.' }));
  return app;
}
