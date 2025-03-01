-- CreateTable
CREATE TABLE "withdrawalrequest" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "userid" INTEGER NOT NULL,
    "description" TEXT,
    "requeststatus" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "createdby" INTEGER NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "withdrawalrequest_pkey" PRIMARY KEY ("id")
);
