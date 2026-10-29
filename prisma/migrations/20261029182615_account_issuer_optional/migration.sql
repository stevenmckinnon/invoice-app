-- better-auth 1.7.14 (needed for the MCP plugins) no longer writes
-- `Account.issuer`, so a new sign-up would fail the NOT NULL. Existing rows
-- keep theirs; older code (1.7.2) still writes it.
ALTER TABLE "Account" ALTER COLUMN "issuer" DROP NOT NULL;
