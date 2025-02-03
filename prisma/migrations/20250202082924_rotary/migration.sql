-- AlterTable
ALTER TABLE "rotaryaccount" ADD COLUMN     "branch" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "registrationcharge" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "registrationdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "registrationdesc" TEXT DEFAULT '',
ADD COLUMN     "registrationpoint" INTEGER DEFAULT 0;
