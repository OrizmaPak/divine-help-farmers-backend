-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "issue" TEXT,
ADD COLUMN     "reassignedto" INTEGER DEFAULT 0,
ALTER COLUMN "serviceenddate" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "servicestartdate" SET DEFAULT CURRENT_TIMESTAMP;