-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "otherdetails" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "cashref" TEXT DEFAULT '',
ADD COLUMN     "transactionref" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "banktransaction" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "userid" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "debit" INTEGER,
    "credit" INTEGER,
    "ttype" TEXT,
    "tfrom" TEXT,
    "createdby" INTEGER NOT NULL DEFAULT 0,
    "valuedate" TIMESTAMP(3),
    "reference" TEXT,
    "transactiondate" TIMESTAMP(3),
    "transactiondesc" TEXT,
    "transactionref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "whichaccount" TEXT,
    "rawdata" TEXT,

    CONSTRAINT "banktransaction_pkey" PRIMARY KEY ("id")
);
