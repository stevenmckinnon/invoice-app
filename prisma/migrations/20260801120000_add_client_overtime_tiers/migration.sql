-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "overtimeTierHours" DECIMAL(65,30),
ADD COLUMN     "overtimeFirstRate" TEXT,
ADD COLUMN     "overtimeAfterRate" TEXT;
