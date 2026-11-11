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

## Production: four separate Vercel projects

The root package.json override pins only jwks-rsa's jose dependency to the CommonJS-compatible 5.10.0 release. Keep this override and package-lock.json together: Firebase Admin otherwise pulls in ESM-only jose 6, which can crash the Vercel runtime with ERR_REQUIRE_ESM before API/CORS handlers start. The server package also specifies Node.js 24.x. The firebase-runtime regression test checks startup without require(esm) and validates RSA signing-key conversion and rejection of a tampered message.

Deploy these as four projects from the same repository. Set each project's Root Directory to its folder so it uses that folder's vercel.json. Enable access to source files outside the Root Directory if Vercel requests it for workspace dependencies. Each frontend uses npm run build, output dist, and the Vite preset. The server uses the Express preset and src/index.js as its auto-detected entry. Use Node.js 24.x. Remove old dashboard overrides that conflict with these settings.

| Project | Root Directory | Production URL |
| --- | --- | --- |
| Client | client | https://getmedconnect.techifylabs.in |
| Admin | admin | https://get-med-connect.vercel.app |
| Doctor | doctor | https://get-med-connect-3tdz.vercel.app |
| Server | server | https://get-med-connect-gbsu.vercel.app |

Set VITE_API_URL=https://get-med-connect-gbsu.vercel.app in the Production environment of ALL THREE frontend projects. Do not append /api. It is a public URL, not a secret. Frontend environment variables are built into the bundle, so rebuild/redeploy after setting them. Locally leave VITE_API_URL empty or point it to http://localhost:4000.

On the SERVER project set:

~~~env
DATABASE_URL=your-production-neon-pooled-connection-string
DATABASE_URL_UNPOOLED=your-production-neon-direct-connection-string
ADMIN_API_TOKEN=your-private-generated-token
FRONTEND_ORIGIN=https://getmedconnect.techifylabs.in,https://get-med-connect.vercel.app,https://get-med-connect-3tdz.vercel.app
FIREBASE_SERVICE_ACCOUNT_JSON=your-complete-firebase-service-account-json
GOOGLE_SHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_JSON=your-complete-google-service-account-json
~~~

Set FIREBASE_PROJECT_ID if used; it must match the service-account project. Supply JSON rather than a path to a local credential file. Keep all server credentials private; never prefix them with VITE_. Optional admin realtime needs NEON_REALTIME_URL and NEON_REALTIME_SECRET on the server, plus the admin production origin allowed by the Neon Realtime configuration. Polling/manual refresh does not require Realtime.

On the DOCTOR frontend additionally set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID from your Firebase web app. Add get-med-connect-3tdz.vercel.app to Firebase Authentication authorized domains. No admin token or database password belongs in a frontend environment variable.

Run npm.cmd run db:migrate separately with the production direct connection configured. Local .env files are ignored by Git and are not sent to Vercel. Redeploy the server first, then all three frontends.

Verify https://get-med-connect-gbsu.vercel.app/api/health returns JSON; /api/doctors tests database access. Then test the doctor directory and photos on the client, admin sign-in and updates, doctor sign-in and a profile save, and enquiry submission to Sheets. Opening the server root / may return a JSON 404 because it is an API, not a website.

Local development remains npm.cmd run dev:all, with Vite proxies to port 4000. The rate limiter is per instance and not shared across instances or restarts.
