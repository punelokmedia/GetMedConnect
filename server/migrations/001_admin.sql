CREATE SCHEMA IF NOT EXISTS gmc;

CREATE TABLE IF NOT EXISTS gmc.leads (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  specialty text NOT NULL,
  city text NOT NULL,
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS gmc.doctors (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  specialty text NOT NULL,
  city text NOT NULL,
  registration_number text NOT NULL,
  status text NOT NULL CHECK (status IN ('Pending', 'Active', 'Inactive')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS doctors_registration_unique ON gmc.doctors (lower(registration_number));

CREATE TABLE IF NOT EXISTS gmc.appointments (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES gmc.leads(id),
  doctor_id uuid NOT NULL REFERENCES gmc.doctors(id),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-show')),
  outcome text NOT NULL CHECK (outcome IN ('Pending', 'Converted', 'Not converted')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (outcome = 'Pending' OR status = 'Completed')
);
CREATE INDEX IF NOT EXISTS appointments_lead_idx ON gmc.appointments (lead_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx ON gmc.appointments (doctor_id);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot ON gmc.appointments (doctor_id, scheduled_at) WHERE status IN ('Scheduled', 'Confirmed');
REVOKE ALL ON SCHEMA gmc FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gmc FROM PUBLIC;
