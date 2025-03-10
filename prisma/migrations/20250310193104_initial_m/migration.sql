-- CreateTable
CREATE TABLE "paystackreferences" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "userid" TEXT,
    "email" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "paystackreferences_pkey" PRIMARY KEY ("id")
);
