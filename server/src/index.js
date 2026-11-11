import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { app as enquiryApp, configured, frontendOrigins } from './runtime.js';
import { createAdminRouter } from './admin.js';
import { createPool, createPostgresStore } from './database.js';
import { createLiveService } from './realtime.js';
import { createPublicDoctorsRouter } from './public-doctors.js';
import { getDoctorAuth } from './firebase-admin.js';
import { createDoctorAccountStore } from './doctor-account-store.js';
import { createDoctorAccountService, createDoctorPortalRouter } from './doctor-accounts.js';

import { createDoctorProfileStore } from './doctor-profiles.js';

const app = express();
app.set('trust proxy', process.env.VERCEL ? 1 : false);
// Handle preflight before every API router, including authenticated routes.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: frontendOrigins }));
const pool = createPool();
const store = createPostgresStore(pool);
const accounts = createDoctorAccountStore(pool);
const auth = getDoctorAuth();
const profiles = createDoctorProfileStore(pool);
app.use('/api/doctors', createPublicDoctorsRouter({ store, profiles }));
app.use('/api/doctor', express.json({ limit: '400kb' }), createDoctorPortalRouter({ accounts, auth, profiles }));
app.use('/api/admin', express.json({ limit: '400kb' }), createAdminRouter({
  token: process.env.ADMIN_API_TOKEN,
  store,
  profiles,
  live: createLiveService(),
  accountService: createDoctorAccountService({ accounts, auth }),
}));
app.use((error, _req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Profile is too large. Choose a smaller photo.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request.' });
  next(error);
});
app.use(enquiryApp);

// Vercel loads the Express export; npm run dev starts the local listener.
export default app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 4000, '127.0.0.1', () => {
    console.log(`API: http://localhost:${process.env.PORT || 4000}`);
    if (!configured) console.log('Google Sheets is not configured. Forms will return 503 until server/.env is completed.');
  });
}
