import './env.js';
import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function firebaseAdminApp() {
  const existing = getApps().find(app => app.name === 'doctor-accounts');
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8') : null);
  if (!raw) return null;
  const serviceAccount = JSON.parse(raw);
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== serviceAccount.project_id) throw new Error('Firebase project and service account do not match.');
  return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id }, 'doctor-accounts');
}
export function getDoctorAuth() {
  const app = firebaseAdminApp();
  return app ? getAuth(app) : null;
}
