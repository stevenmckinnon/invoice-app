-- better-auth 1.7 added a required `issuer` column to its Account schema,
-- used to distinguish accounts across issuers with the same provider id.
-- Backfill existing rows with the synthetic issuer better-auth itself
-- generates for providers that don't have a real one: `local:<providerId>`
-- for the credential (email/password) provider, `local:oauth:<providerId>`
-- for everything else.
ALTER TABLE "Account" ADD COLUMN "issuer" TEXT;

UPDATE "Account"
SET "issuer" = CASE
  WHEN "providerId" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "providerId"
END;

ALTER TABLE "Account" ALTER COLUMN "issuer" SET NOT NULL;
