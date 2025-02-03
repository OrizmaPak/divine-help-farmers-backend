-- CreateTable
CREATE TABLE "referee" (
    "id" SERIAL NOT NULL,
    "refereename" TEXT NOT NULL,
    "refereeofficeaddress" TEXT NOT NULL,
    "refereeresidentialaddress" TEXT NOT NULL,
    "refereeoccupation" TEXT NOT NULL,
    "refereephone" TEXT NOT NULL,
    "refereeyearsknown" INTEGER NOT NULL,
    "imageone" TEXT,
    "imagetwo" TEXT,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "referee_pkey" PRIMARY KEY ("id")
);
