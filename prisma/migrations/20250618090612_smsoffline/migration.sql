-- CreateTable
CREATE TABLE "smsresponsetooffline" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "smsresponsetooffline_pkey" PRIMARY KEY ("id")
);
