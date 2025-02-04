-- AlterTable
ALTER TABLE "parentguardians" ALTER COLUMN "parentoneimage" DROP NOT NULL,
ALTER COLUMN "parenttwoimage" DROP NOT NULL;

-- CreateTable
CREATE TABLE "query" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "imageone" TEXT,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "query_pkey" PRIMARY KEY ("id")
);
