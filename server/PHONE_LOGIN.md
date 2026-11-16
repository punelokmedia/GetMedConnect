# Firebase doctor phone login

The doctor portal supports email/password and Firebase SMS verification. No separate SMS bearer token is used or stored. The existing Firebase web configuration and server Admin credentials must belong to the same project.

1. In Firebase Console, open Authentication > Sign-in method and enable Phone.
2. Add the deployed doctor website hostname under Authentication > Settings > Authorized domains. For local testing, authorize localhost as appropriate.
3. Configure the Firebase SMS region policy to allow the countries served, and ensure the project has the billing and SMS quota required by Firebase. See the [official phone authentication setup](https://firebase.google.com/docs/auth/web/phone-auth).
4. Register each doctor's unique mobile number. Indian ten-digit mobile numbers are normalized to +91; other numbers need an explicit country code.
5. Newly created doctor logins link the saved phone to the same Firebase UID. For existing doctor accounts, use **Link registered phone** in the admin Doctor login access table. Use this again after changing the registered phone. Firebase rejects a number already linked to a different user; resolve that association in Firebase rather than creating duplicate doctor accounts.
6. Deploy the updated server, admin and doctor frontends. Test with Firebase's configured fictional phone numbers before a real SMS test.

The doctor enters their number, completes reCAPTCHA, receives a six-digit SMS code and confirms it. Firebase sends the SMS directly. Only an enabled linked doctor account is authorized by the API. Phone sessions must match the current registered doctor phone; an unlinked Firebase phone user cannot access doctor records. Existing temporary-password replacement requirements remain in effect. Linking a phone revokes existing refresh tokens.

Never put service-account credentials or private tokens into VITE_ variables. A token pasted into chat is not required for this implementation; if it is a private credential, revoke it with its issuer.
