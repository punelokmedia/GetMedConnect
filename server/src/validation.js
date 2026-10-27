import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max);
const optional = (schema) => z.union([z.literal(''), schema]).optional();
const common = {
  name: text(2, 100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: optional(z.email().max(254)),
  specialty: text(2, 100),
  city: text(2, 80),
  requirement: text(0, 1000).optional(),
  consent: z.literal(true),
  website: z.literal('').optional(),
};
export const schemas = {
  patient: z.object({ ...common, pin: optional(z.string().regex(/^\d{6}$/)) }),
  clinic: z.object({ ...common, clinicName: text(2, 120) }),
};
