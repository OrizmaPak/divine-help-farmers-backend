-- AlterTable
ALTER TABLE "rotaryschedule" ALTER COLUMN "currentschedule" SET DEFAULT 'true';

-- CreateTable
CREATE TABLE "level" (
    "id" SERIAL NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "basicsalary" DOUBLE PRECISION,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowances" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "allowance" DOUBLE PRECISION NOT NULL,
    "allowancetype" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deductions" (
    "id" SERIAL NOT NULL,
    "level" INTEGER NOT NULL,
    "deduction" DOUBLE PRECISION NOT NULL,
    "deductiontype" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "deductions_pkey" PRIMARY KEY ("id")
);
