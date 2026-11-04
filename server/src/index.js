import express from 'express';
import { app as enquiryApp, configured } from './runtime.js';
import { createAdminRouter, createAdminStore } from './admin.js';
import { fileURLToPath } from 'node:url';
import { createPool, createPostgresStore } from './database.js';
import { createLiveService } from './realtime.js';
import { createPublicDoctorsRouter } from './public-doctors.js';
import { getDoctorAuth } from './firebase-admin.js';
import { createDoctorAccountStore } from './doctor-account-store.js';
import { createDoctorAccountService, createDoctorPortalRouter } from './doctor-accounts.js';

const app = express();
const pool = process.env.DATABASE_URL ? createPool() : null;
const store = pool ? createPostgresStore(pool) : createAdminStore(process.env.ADMIN_DATA_FILE || fileURLToPath(new URL('../data/admin.json', import.meta.url)));
const accounts = pool ? createDoctorAccountStore(pool) : null;
const auth = getDoctorAuth();
app.use('/api/doctors', createPublicDoctorsRouter({ store }));
app.use('/api/doctor', express.json({ limit: '16kb' }), createDoctorPortalRouter({ accounts, auth }));
app.use('/api/admin', express.json({ limit: '16kb' }), createAdminRouter({
  token: process.env.ADMIN_API_TOKEN,
  store,
  live: createLiveService(),
  accountService: createDoctorAccountService({ accounts, auth }),
}));
app.use(enquiryApp);

// Vercel loads the Express export; npm run dev starts the local listener.
export default app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 4000, '127.0.0.1', () => {
    console.log(`API: http://localhost:${process.env.PORT || 4000}`);
    if (!configured) console.log('Google Sheets is not configured. Forms will return 503 until server/.env is completed.');
  });
}
