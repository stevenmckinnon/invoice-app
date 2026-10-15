-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "travelWorkBill" TEXT NOT NULL DEFAULT 'both',
ADD COLUMN     "travelWorkPerDiem" TEXT NOT NULL DEFAULT 'travel';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "terms" JSONB;

-- CreateTable
CREATE TABLE "InvoiceDay" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "alsoTravel" TEXT,
    "direction" TEXT,
    "overtimeHours" DECIMAL(65,30),
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "InvoiceDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceDay_invoiceId_date_key" ON "InvoiceDay"("invoiceId", "date");

-- AddForeignKey
ALTER TABLE "InvoiceDay" ADD CONSTRAINT "InvoiceDay_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
