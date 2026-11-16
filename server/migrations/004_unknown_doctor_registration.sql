-- Unknown registration numbers may use NA; actual numbers remain unique.
DROP INDEX IF EXISTS gmc.doctors_registration_unique;
CREATE UNIQUE INDEX doctors_registration_unique
  ON gmc.doctors (lower(registration_number))
  WHERE lower(registration_number) <> 'na';
