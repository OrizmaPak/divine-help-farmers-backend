-- AlterTable
ALTER TABLE "guarantor" ADD COLUMN     "imageone" TEXT,
ADD COLUMN     "imagetwo" TEXT;

-- CreateTable
CREATE TABLE "employmentrecord" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "employer" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "years" INTEGER NOT NULL,
    "reasonofleaving" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "employmentrecord_pkey" PRIMARY KEY ("id")
);
