# GetMedConnect admin foundation

React/Vite workspace with a protected Express API for manually entered leads, doctor registry records, and appointments. The API requires `DATABASE_URL` and always uses Neon PostgreSQL; it refuses to start without a database URL. Configured Neon Realtime keeps all three collections current across open admin sessions. No demo patient records are included.

To import legacy local data, run `npm.cmd run db:import-admin`. This imports leads, doctors, and appointments in one transaction, verifies every local ID exists in Neon, preserves existing cloud rows by ID, and keeps the local JSON file as a backup. Other uniqueness conflicts roll back the import for review. `ADMIN_DATA_FILE` can select the import source; the running API does not use it.

## Start

From the repository root, run `npm.cmd install`. In `server/.env`, set `ADMIN_API_TOKEN` to a long random value. Generate one with `node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(32).toString('hex'))"`. Keep the token private and never put it in frontend environment variables.

Run `npm.cmd run dev:admin`, open http://127.0.0.1:5175, and enter that token. The token stays in React memory and is cleared on sign-out or reload. Build with `npm.cmd run build:admin`. Run API tests with `npm.cmd test`.

## Neon setup

The repository is linked to project `dawn-mouse-79453335`, branch `production`, in organization `org-divine-bread-08598863`. `neon.ts` declares PostgreSQL and Realtime; Firebase login is retained. Sign into the CLI with `neon.cmd login`, then run `neon.cmd deploy`. The CLI pulls server secrets into root `.env.local` or root `.env`; these files are ignored by Git. Do not copy database credentials or the Realtime secret into browser-prefixed variables.

The API loads root `.env.local`, root `.env`, then `server/.env`, without overriding process environment variables. `ADMIN_API_TOKEN` is still required. The authenticated live-query endpoint returns only the public Realtime URL and short-lived sealed queries. React uses `@neon/realtime-react` with renewal and clears connections on sign-out. Failed connections display a status message; Refresh continues to use the HTTP API.

After deployment, run `npm.cmd run db:migrate` to create the versioned `gmc` schema and its constraints using `DATABASE_URL_UNPOOLED`. Run `npm.cmd run test:neon` for the cloud integration test. This starts the real Express app on port 4109 with a temporary access token, subscribes through the authenticated API, writes synthetic leads/doctors/appointments, verifies WebSocket updates and independently reads PostgreSQL, then deletes only the test's own records. Use `NEON_TEST_PORT` if 4109 is already occupied.

The integration test writes to the configured branch. For migration rehearsals, create a temporary Neon child branch and pull its environment first; return to `production` after testing. Existing `server/data/admin.json` records are retained locally and are not automatically imported into PostgreSQL.

Realtime currently permits `http://localhost:5175` and `http://127.0.0.1:5175`. Add the eventual deployed admin origin to `neon.ts` and deploy that configuration before using live subscriptions there.

## Workflow

1. Add a lead and update its stage: New → Contacted → Qualified → Closed.
2. Register a doctor with a unique medical registration number. Pending records require manual verification before changing to Active. Registry registration does not create a Firebase login.
3. Create an appointment using an existing lead and active doctor. Time entry uses the browser's local timezone, and the API stores UTC.
4. Track Scheduled, Confirmed, Completed, Cancelled, or No-show. Completed appointments can be marked Converted or Not converted. Define Converted operationally with your team; it is a manually reported result, not verified payment.

## Public doctor directory

The main website has an **Our Doctors** link to `/doctors`. Each doctor has a profile at `/doctors/:id`. Setting the registry status to **Active** publishes the profile; **Pending** and **Inactive** profiles are excluded from both public endpoints. Name, specialty, and city are the only displayed fields; email, phone, registration number, leads, and appointment details are not returned publicly. The directory supports name/specialty/city search and 12 profiles per page. Pages fetch on opening and refresh every 30 seconds or when focus returns, with a manual Refresh button. No separate publishing record or database migration is required.

For doctors created before the Neon connection, `npm.cmd run db:import-doctors` validates and copies local doctor records into Neon. It preserves the local file, IDs, timestamps and status, and skips existing IDs or registration numbers without overwriting cloud records. Leads and appointments are not copied by this doctor-only import.

Conversion rate is converted appointments divided by all completed appointments, including completed appointments with pending outcomes. Exact simultaneous bookings for the same doctor are blocked; appointment duration, overlapping slots, and availability calendars are not yet modeled.

## Architecture and next integrations

- `admin/src/main.jsx`: overview, lead management, registry, booking and outcome controls.
- `server/src/admin.js`: token authorization, Zod validation, API and a local JSON helper retained for isolated tests.
- `server/src/database.js`: pooled `pg` connections and transactional PostgreSQL persistence; Vercel pool lifecycle integration.
- `server/migrations/001_admin.sql`: typed records, foreign keys, conversion checks and unique doctor appointment slots.
- `server/src/realtime.js` and `admin/src/realtime.jsx`: authorized sealed live queries and React subscriptions.
- `server/data/admin.json`: ignored legacy backup records; no longer used by the running API.
- Existing landing-page submissions continue using Google Sheets. They are not imported into this workspace yet.
- Doctor login access is provisioned in Admin → Doctors. See [doctor setup and access flow](../doctor/ADMIN_FLOW.md). A registry email alone grants no access; an administrator-created Firebase UID link and enabled account are required.

This starter still uses one shared administrator token, without individual employee accounts, role permissions, audit history, or token expiry. Keep it bound to loopback while developing those features. Database writes are serialized with a transaction advisory lock and current records are loaded for validation; pagination and targeted queries are future scaling work. PostgreSQL provides durable storage once configured; local files are not suitable for Vercel serverless persistence. Existing Vercel routes remain unchanged; the admin app is not deployed or publicly routed.
