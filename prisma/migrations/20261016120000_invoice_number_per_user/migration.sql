-- Invoice numbers become unique per user instead of across every account.
-- The composite index is created before the global one is dropped, so there
-- is no moment without a uniqueness guarantee. Neither step can fail on
-- existing data: anything unique globally is already unique per user.

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";
