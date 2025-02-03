-- AlterTable
ALTER TABLE "rotaryaccount" ADD COLUMN     "dateupdated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "rotaryschedule" ADD COLUMN     "payoutref" TEXT DEFAULT '';
