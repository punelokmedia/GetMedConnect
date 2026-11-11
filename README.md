# GetMedConnect

## Admin workspace

The `admin/` workspace provides leads, doctor registration, appointment assignment, and conversion tracking. See [admin setup, Neon connection and verification](admin/README.md). Run `npm.cmd run dev:admin` after configuring `ADMIN_API_TOKEN` in `server/.env`. Admin opens at http://127.0.0.1:5175. It uses Neon PostgreSQL when `DATABASE_URL` is set and enables live updates when the Realtime environment is present. Website enquiries still use Google Sheets. Doctor logins are created and managed in Admin → Doctors; see [doctor access flow](doctor/ADMIN_FLOW.md). Run `npm.cmd run dev:all` to start all apps together, including the doctor portal on port 5174.

Local React/Vite frontend and Express API for patient and clinic enquiries. This is a development starter, not a live clinic directory or appointment booking service.

## Homepage

The homepage follows the supplied GetMedConnect mockup: healthcare search, specialty cards, three-step guide, patient benefits, clinic partnership banner, family section, enquiry call to action, FAQs, and footer. It includes responsive layouts and a mobile navigation menu.

Photos and interface icons are loaded from `client/public`; the brand image is in `client/GetMedConnect Healthcare Logo.png`. The search, specialty cards, and partnership buttons open the patient or clinic enquiry dialog. Search selections carry into the form; a six-digit location is copied into the patient PIN field, and the user supplies their city before submitting. Search starts an enquiry rather than querying a live provider directory.

## Run locally (PowerShell)

Use Node.js 24 LTS. From the repository root:

```powershell
cd C:\Users\punel\Getmedconnect
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. API health: http://localhost:4000/api/health.
Use `npm.cmd` if PowerShell blocks `npm.ps1`. Press Ctrl+C to stop both processes.

The repository uses npm workspaces, so install dependencies from the root. Do not run `npm init` in individual folders.

If environment files are missing, copy the examples once (do not overwrite completed credentials):

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

## Google Sheets setup

1. Create a Google Cloud project, enable Google Sheets API, and create a service account with a JSON key.
2. Create one private spreadsheet and share it with the service account's `client_email` as Editor.
3. Create tabs with these exact names and column orders:

**Patient_Enquiries:** Enquiry ID, Submitted At, Patient Name, Mobile Number, Email, Specialty, City, PIN Code, Requirement, Consent, Status.

**Clinic_Enquiries:** Enquiry ID, Submitted At, Clinic Name, Contact Person, Mobile Number, Email, Specialty, City, Partnership Interest, Consent, Status.

4. Put the spreadsheet ID into `server/.env` as `GOOGLE_SHEET_ID`.
5. Put the entire service-account JSON on one line as `GOOGLE_SERVICE_ACCOUNT_JSON`. Preserve escaped `\n` in its private key. Never commit keys or paste them into chat.
6. Restart the API and submit one test enquiry of each type. Check column alignment and remove test rows afterward.

Without Sheets configuration, health and the frontend work, but form submissions return HTTP 503. Success is returned only after Sheets confirms the append. Rows use RAW input so user text is not evaluated as spreadsheet formulas; preserve safe handling if exporting to CSV or another spreadsheet tool.

## Checks

```powershell
npm.cmd test
npm.cmd run build
```

Tests cover validation, consent, row routing and column alignment, unknown types, and storage failures using a fake writer. They do not verify real Google credentials or spreadsheet access.

## Before production

Approve privacy and terms pages, consent wording, business contacts, supported locations, and brand assets. Add durable idempotency, stronger bot protection, proxy-aware rate limiting, retention procedures, and monitoring. Review provider-sharing consent before forwarding any enquiries. Do not collect medical records in the enquiry form. The local API binds to loopback; configure deployment network binding and exact frontend CORS origin for hosting. No deployment has been performed.

## Production deployment on Vercel

Use one Vercel project with Root Directory at the repository root (.), Framework Preset Other, and Node.js 24.x. Leave dashboard build/output overrides off so vercel.json supplies npm run build:production and dist. Install dependencies with npm ci.

The production build packages the public client at /, admin at /admin/, and doctor portal at /doctor/. Each portal has its own asset prefix. The root api/index.js function exports the Express app, and /api/* routes to that function before frontend fallback routes. Existing static assets are served directly by Vercel.

Set these variables in the Vercel Production environment; local ignored .env files are not uploaded:

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Production Neon pooled connection; required at server startup. |
| DATABASE_URL_UNPOOLED | Direct connection for migrations run separately. |
| ADMIN_API_TOKEN | Private token entered on the admin sign-in screen. |
| FIREBASE_SERVICE_ACCOUNT_JSON | Complete Firebase service-account JSON for doctor authentication. |
| FIREBASE_PROJECT_ID | Matching Firebase project ID, if configured. |
| VITE_FIREBASE_API_KEY | Firebase web app API key, used when building the doctor portal. |
| VITE_FIREBASE_AUTH_DOMAIN | Firebase web app auth domain. |
| VITE_FIREBASE_PROJECT_ID | Firebase web app project ID. |
| VITE_FIREBASE_APP_ID | Firebase web app ID. |
| GOOGLE_SHEET_ID | Spreadsheet receiving website enquiries. |
| GOOGLE_SERVICE_ACCOUNT_JSON | Complete Google service-account JSON for Sheets. |
| NEON_REALTIME_URL / NEON_REALTIME_SECRET | Optional admin realtime connection. |

Never prefix server secrets with VITE_. Firebase web app configuration is intended for the browser. Do not use a local service-account file path in production; supply the JSON variable. Redeploy after changing environment variables. Add your production domain to Firebase Authentication authorized domains and, if using Neon Realtime, its allowed origins.

Run migrations separately against the production direct connection with npm.cmd run db:migrate. This is not performed automatically during every build.

After deployment, verify /api/health returns JSON, /api/doctors returns JSON, and /admin/ and /doctor/ load their own portals. Then verify admin login, doctor login, a profile save, and an enquiry submission. Health alone does not verify database or Sheets connectivity.

For local development, npm.cmd run dev:all starts each app on its development port with Vite proxying /api to port 4000. VITE_API_URL is unused.

The rate limiter uses instance memory; its limit is not shared across instances or restarts.
