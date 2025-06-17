-- CreateTable
CREATE TABLE "branchchanged" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "branch" TEXT NOT NULL,
    "previousbranch" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "branchchanged_pkey" PRIMARY KEY ("id")
);
