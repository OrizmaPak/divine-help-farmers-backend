-- CreateTable
CREATE TABLE "paystackrecipient" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "dateadded" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "paystackrecipient_pkey" PRIMARY KEY ("id")
);
