# Admin-managed doctor access

The doctor app is a React/Vite workspace. Accounts are created by the GetMedConnect admin team. Self-registration and Google sign-in are removed.

## Setup

Install from the repository root with `npm.cmd install`. Keep Firebase browser configuration in `doctor/.env`, following `.env.example`.

Keep the matching Firebase Admin service-account JSON outside the repository. In `server/.env`, set `GOOGLE_APPLICATION_CREDENTIALS` to the file's full path and `FIREBASE_PROJECT_ID` to the same project as the browser's `VITE_FIREBASE_PROJECT_ID`. For hosting, use server-only `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a local file path. Never put an Admin key in a `VITE_` variable.

Run `npm.cmd run db:migrate`, then `npm.cmd run firebase:lock-signup`. The latter changes only Firebase's `client.permissions.disabledUserSignup`, preserving the rest of the project configuration. It requires Identity Platform configuration permissions and blocks end-user account creation across that Firebase project. Administrators can still create accounts through the Admin SDK. Existing unrelated Firebase accounts are not deleted or automatically linked.

Run `npm.cmd run dev:all` for API, website, admin and doctor apps together, or `npm.cmd run dev:doctor` for API and doctor app. If an API is already listening on port 4000, run only `npm.cmd run dev --workspace doctor`. The doctor app opens at http://127.0.0.1:5174 and proxies `/api` to port 4000. `npm.cmd run build` builds all three React apps.

## Workflow

1. Register a doctor in Admin → Doctors.
2. Under **Doctor login access**, choose **Create login**. The backend creates a Firebase email/password user, links its UID to the doctor in `gmc.doctor_accounts`, and displays a generated temporary password once. Neon stores the link and access flags, never the password.
3. Provide the email and temporary password privately to the doctor.
4. The doctor signs in and replaces the temporary password before accessing patient details. Password replacement invalidates existing sessions and requires another sign-in.
5. Admins can **Reset password**, **Disable access**, and **Enable access**. Reset generates another temporary password; old passwords cannot be retrieved. Existing registry/Firebase accounts sharing an email are not automatically merged or granted access.

Public visibility and portal login are independent. Registry status controls the website directory; `login_enabled` controls the portal. Disabling login does not remove a public profile. Changing a registry email does not change the login email; use the email shown in the access table.

## Permissions

Every doctor API request verifies a Firebase ID token with revocation checks and loads the enabled account link from Neon. Client-supplied doctor IDs do not decide access. Unlinked Firebase users, including old self-created accounts, cannot enter the workspace.

Doctors see up to 200 recent appointments assigned to them, with patient name, phone, specialty, city and coordination notes. They can update their own appointment status and mark conversion after completion. They cannot create logins, read all leads, reassign appointments, or modify another doctor's appointments. The portal refreshes every 30 seconds and on focus.

Credential timestamps provide another revocation check. A sign-in in the same second as a reset may require a brief wait and another sign-in. Provisioning and credential-change failures fail closed; admins can reset or enable an existing linked account to recover.

The admin workspace still uses the existing shared administrator token. Individual employee accounts and fine-grained admin permissions remain separate work. Local website changes are not automatically deployed to Vercel.

## Verification

- `npm.cmd test`: provisioning, password-change and authorization tests with a Firebase test double.
- `npm.cmd run test:doctor-auth`: real Firebase/Neon test of blocked signup, admin provisioning, login, password replacement, doctor-only appointment access, conversion, disable/enable and reset. Synthetic Firebase accounts and Neon records are cleaned up. Requires a configured test environment and `doctor/.env`.
- `npm.cmd run test:neon`: database, Realtime and public doctor-directory tests.
