-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "correctsId" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
