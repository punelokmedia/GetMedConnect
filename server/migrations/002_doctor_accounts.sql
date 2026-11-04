CREATE TABLE gmc.doctor_accounts (
  doctor_id uuid PRIMARY KEY REFERENCES gmc.doctors(id),
  firebase_uid text NOT NULL UNIQUE,
  login_email text NOT NULL,
  login_enabled boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT true,
  credentials_issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX doctor_accounts_email_unique ON gmc.doctor_accounts (lower(login_email));
REVOKE ALL ON gmc.doctor_accounts FROM PUBLIC;
