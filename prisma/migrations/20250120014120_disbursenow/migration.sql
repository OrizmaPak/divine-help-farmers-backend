-- CreateTable
CREATE TABLE "otp" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "otp" TEXT NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);
