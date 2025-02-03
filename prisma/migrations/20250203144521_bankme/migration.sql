-- AlterTable
ALTER TABLE "Accounts" ALTER COLUMN "dateadded" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "level" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "guarantor" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "guarantorname" TEXT NOT NULL,
    "guarantorofficeaddress" TEXT NOT NULL,
    "guarantorresidentialaddress" TEXT NOT NULL,
    "guarantoroccupation" TEXT NOT NULL,
    "guarantorphone" TEXT NOT NULL,
    "yearsknown" INTEGER NOT NULL,
    "createdby" INTEGER NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "guarantor_pkey" PRIMARY KEY ("id")
);
