import '../src/env.js';
import { firebaseAdminApp } from '../src/firebase-admin.js';

const app = firebaseAdminApp();
if (!app) throw new Error('Configure Firebase Admin credentials first.');
const { access_token } = await app.options.credential.getAccessToken();
const project = app.options.projectId;
const response = await fetch(`https://identitytoolkit.googleapis.com/v2/projects/${encodeURIComponent(project)}/config?updateMask=client.permissions.disabledUserSignup`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ client: { permissions: { disabledUserSignup: true } } }),
});
if (!response.ok) {
  console.error(`Could not disable end-user signup (HTTP ${response.status}). Enable Identity Platform if required and check the service account's config-management permissions.`);
  process.exitCode = 1;
} else {
  const config = await response.json();
  if (!config.client?.permissions?.disabledUserSignup) throw new Error('Firebase did not confirm signup is disabled.');
  console.log('Verified: Firebase end-user signup is disabled. Firebase Admin account creation remains available.');
}
