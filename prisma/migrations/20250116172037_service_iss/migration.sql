-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "serviceid" DROP DEFAULT,
ALTER COLUMN "serviceid" SET DATA TYPE TEXT;
DROP SEQUENCE "Service_serviceid_seq";
