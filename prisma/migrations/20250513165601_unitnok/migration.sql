-- CreateTable
CREATE TABLE "messagehistory" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "ids" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "messagehistory_pkey" PRIMARY KEY ("id")
);
