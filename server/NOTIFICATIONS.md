# Notification setup

Firebase manages doctor authentication. Creating a Firebase user does not send their password by email. Set server-only `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` to a verified Resend sender to enable doctor welcome, administrator password reset, and password-change emails. See [Resend sending API](https://resend.com/docs/api-reference/emails/send-email).

Create/reset messages contain only the registered login email and newly generated temporary password, as required for administrator-provisioned doctor accounts. Doctors must replace it before accessing patients. Password-change confirmations never contain passwords. No patient details or provider errors are included. Temporary credentials remain available once to the authenticated administrator if delivery fails; they are not stored or logged by the application. Reset uses the account's stored login email even if the public doctor profile has changed.

See WHATSAPP.md for booking setup. For status updates, configure approved `WHATSAPP_PATIENT_STATUS_TEMPLATE` and `WHATSAPP_DOCTOR_STATUS_TEMPLATE`, each with four positional body variables: recipient name, appointment date/time IST, booking reference, status. Status messages exclude clinical notes, outcomes, specialty and patient names. Admin status changes and doctor updates notify after persistence. Notes-only admin edits do not notify.

Failures and missing configuration do not roll back successful account or appointment changes. Provider calls time out after ten seconds. Accepted indicates provider acceptance, not delivery. There is no durable retry queue; verify provider delivery before resending.

This application has enquiries and appointments, not customer registration or commerce orders. Doctor registration and resets generate passwords exceeding 12 characters; doctor password replacement/change uses an 8-128 character rule. Inputs below eight characters display `Password must contain at least 8 characters.` on client and server. Configure Firebase's password policy to match the application's eight-character minimum.
