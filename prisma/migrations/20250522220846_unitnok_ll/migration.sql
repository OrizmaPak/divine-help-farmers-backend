-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "event" TEXT NOT NULL,
    "description" TEXT,
    "users" TEXT,
    "branch" TEXT,
    "banner1" TEXT,
    "banner2" TEXT,
    "startdatetime" TIMESTAMP(3) NOT NULL,
    "enddatetime" TIMESTAMP(3) NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
