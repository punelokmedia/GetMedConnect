# Shared doctor profiles

The existing `gmc.doctors` row is the source for all three portals. Migration `003_doctor_profiles.sql` adds extended professional/clinic fields in `profile` and a separate resized `photo`. Base identity fields remain in their existing columns, so registry updates and appointment assignments continue to use the same doctor ID.

- Doctor: `GET /api/doctor/me` reads their profile; `PUT /api/doctor/profile` saves it. Firebase authentication, enabled account linkage, and replacement of the temporary password are required. The server selects the doctor ID from the authenticated account, never the request body.
- Admin: `GET` and `PUT /api/admin/doctors/:id/profile` require the existing admin token. Open **Doctors → View / edit profile** to use the shared form.
- Client: `GET /api/doctors` and `GET /api/doctors/:id` publish only active doctors. Public fields are name, specialty, city, qualifications, experience, clinic name/address/pincode, bio, consultation modes, services, and a photo URL. Personal phone, contact email, age, gender, registration/council, and account data are excluded.
- Photo: `GET /api/doctors/:id/photo` serves only an active doctor's image. Browsers resize uploads to at most 480 pixels before saving; the server accepts only bounded JPEG/PNG data URLs. Directory queries never load photo contents.

Saving the contact email does **not** change the Firebase login email. Account access and Active/Pending/Inactive registry status remain admin-managed. Doctor and public pages refresh automatically every 30 seconds. The admin registry uses its existing live updates and Refresh control; reopen the editor to fetch the latest full profile.

Run `npm run db:migrate` with the intended `DATABASE_URL_UNPOOLED` configured before deploying the new server. The migration runner records checksums and never rewrites earlier migrations. Use `node server/scripts/check-profile-database.js` for a persistence check on the configured database. It applies pending migrations, creates a uniquely identified temporary doctor, checks save/read, admin field preservation and public visibility, and removes that test record. An optional hostname argument targets an isolated branch using environment-held credentials; never put passwords in command arguments.

Verification: `npm test` checks validation, doctor ownership, admin authorization, password-change restrictions, and public field filtering. `npm run build` builds all three portals.
