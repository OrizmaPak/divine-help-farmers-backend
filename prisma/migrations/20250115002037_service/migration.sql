-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "supplier" INTEGER NOT NULL,
    "servicetype" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "amountfrom" DOUBLE PRECISION,
    "amountto" DOUBLE PRECISION,
    "duration" INTEGER,
    "durationcategory" TEXT,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);
