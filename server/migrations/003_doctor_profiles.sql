ALTER TABLE gmc.doctors
  ADD COLUMN profile jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(profile) = 'object'),
  ADD COLUMN photo text NOT NULL DEFAULT '' CHECK (octet_length(photo) <= 350000);

COMMENT ON COLUMN gmc.doctors.profile IS 'Extended professional and clinic details; private identity fields remain in base columns.';
COMMENT ON COLUMN gmc.doctors.photo IS 'Validated, resized JPEG/PNG data URL; fetched separately from directory listings.';
