-- AlterTable
ALTER TABLE "rotaryaccount" ADD COLUMN     "takeout" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rotaryschedule" ADD COLUMN     "payout" TEXT NOT NULL DEFAULT 'NO';
