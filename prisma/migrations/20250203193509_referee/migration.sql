-- CreateTable
CREATE TABLE "qualification" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "certificationdate" TIMESTAMP(3) NOT NULL,
    "imageone" TEXT,
    "imagetwo" TEXT,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualification" TEXT NOT NULL,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "qualification_pkey" PRIMARY KEY ("id")
);
