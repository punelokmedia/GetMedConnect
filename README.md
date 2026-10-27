# GetMedConnect

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

## Deploy as one Vercel project with two services

Keep the Vercel project's Root Directory at the repository root (`.`) and select Node.js 24.x. The root `vercel.json` defines two independently built services:

| Service | Root | Framework | Public traffic |
| --- | --- | --- | --- |
| `client` | `client` | Vite | All paths except `/api/*` |
| `server` | `server` | Express | `/api/*` |

The API rewrite runs first and preserves the original path: `/api/enquiries/patient` reaches the Express route with that same path. The client catch-all runs last. The Express service exports its app from `server/src/index.js`; no root `api/` Function is used.

The browser calls relative `/api` URLs in both production and development. No internal service bindings are declared: the static Vite frontend has no server-side function that calls another service, and the API only calls the external Google Sheets API. A runtime service binding cannot be read in a Vite build or browser. If a server-side caller is added later, declare its binding on that calling service and read the injected variable at runtime.

Add these Vercel project environment variables for Production (and Preview only if preview forms should use the same spreadsheet):

| Name | Value |
| --- | --- |
| `GOOGLE_SHEET_ID` | The spreadsheet ID from `server/.env`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The complete downloaded service-account JSON, without the outer single quotes used in `.env`. Preserve the private key's escaped `\n` characters. |

No `VITE_API_URL`, `PORT`, or `FRONTEND_ORIGIN` is required for the shared-domain deployment. Credentials must never use a `VITE_` prefix. Local `.env` files remain ignored by Git. Redeploy after changing Vercel environment variables.

### Test service routing locally

From the repository root with a current Vercel CLI installed:

```powershell
vercel dev --local
```

Use the shared URL printed by Vercel. Check `/api/health` for `{"ok":true}`, load the homepage and images, and submit each enquiry type. Vercel handles public routing and injects any declared runtime bindings. For a cloud-linked local session, use `vercel dev` and configure the Google variables in Vercel's Development environment. For a local-only session, supply the two Google variables in the process environment to test storage.

The alternative `npm.cmd run dev` remains available: Vite proxies `/api` to the local API on port 4000. Old `VITE_API_URL` entries in local files are unused.

After deployment, check `https://YOUR-DOMAIN/api/health`, then submit one patient and one clinic enquiry and verify the spreadsheet rows. Health confirms the API is running; form submission verifies Sheets access. No cloud deployment has been performed by this setup.

The rate limiter uses instance memory, so its limit is not shared across instances or restarts. Use a shared store or platform-level protection when a strict global limit is needed.
