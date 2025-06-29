-- CreateTable
CREATE TABLE "codeandmeaningforlanding" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "createdby" INTEGER NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "codeandmeaningforlanding_pkey" PRIMARY KEY ("id")
);
