-- CreateTable
CREATE TABLE "Supplier" (
    "id" INT4 NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    "supplier" STRING NOT NULL,
    "contactperson" STRING NOT NULL,
    "contactpersonphone" STRING NOT NULL,
    "officeaddress" STRING,
    "nationality" STRING NOT NULL,
    "state" STRING NOT NULL,
    "bank1" STRING,
    "accountnumber1" STRING,
    "bank2" STRING,
    "accountnumber2" STRING,
    "status" STRING NOT NULL DEFAULT 'ACTIVE',
    "dateadded" TIMESTAMP(3) NOT NULL,
    "createdby" INT4 NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplier_key" ON "Supplier"("supplier");
