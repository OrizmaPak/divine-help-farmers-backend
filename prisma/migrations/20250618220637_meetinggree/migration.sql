-- CreateTable
CREATE TABLE "pendingofflinetransaction" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pendingofflinetransaction_pkey" PRIMARY KEY ("id")
);
