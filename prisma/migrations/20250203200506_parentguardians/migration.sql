-- CreateTable
CREATE TABLE "parentguardians" (
    "id" SERIAL NOT NULL,
    "userid" INTEGER NOT NULL,
    "parentonename" TEXT NOT NULL,
    "parentoneoccupation" TEXT NOT NULL,
    "parentonestate" TEXT NOT NULL,
    "parentoneofficeaddress" TEXT NOT NULL,
    "parentonephone" TEXT NOT NULL,
    "parenttwoname" TEXT NOT NULL,
    "parenttwooccupation" TEXT NOT NULL,
    "parenttwoofficeaddress" TEXT NOT NULL,
    "parenttwostate" TEXT NOT NULL,
    "parenttwophone" TEXT NOT NULL,
    "parentoneimage" TEXT NOT NULL,
    "parenttwoimage" TEXT NOT NULL,
    "homeaddress" TEXT NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "parentguardians_pkey" PRIMARY KEY ("id")
);
