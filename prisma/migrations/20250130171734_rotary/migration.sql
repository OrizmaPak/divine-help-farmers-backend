-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_rotary_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "rotary_account_prefix" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "rotaryaccount" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "productid" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT,
    "frequencynumber" INTEGER,
    "autorunnew" BOOLEAN NOT NULL DEFAULT true,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "rotaryaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotaryschedule" (
    "id" SERIAL NOT NULL,
    "accountnumber" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "duedate" TEXT,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentschedule" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "rotaryschedule_pkey" PRIMARY KEY ("id")
);
