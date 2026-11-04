-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "showName" TEXT NOT NULL,
    "dates" TEXT[],
    "rank" INTEGER NOT NULL DEFAULT 1,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hold_invoiceId_key" ON "Hold"("invoiceId");

-- CreateIndex
CREATE INDEX "Hold_userId_idx" ON "Hold"("userId");

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
