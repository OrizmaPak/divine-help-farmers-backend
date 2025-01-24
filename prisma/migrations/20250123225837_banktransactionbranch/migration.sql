-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_property_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "property_account_prefix" TEXT DEFAULT '',
ADD COLUMN     "property_transaction_prefix" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "Property" (
    "id" SERIAL NOT NULL,
    "itemid" INTEGER NOT NULL,
    "itemname" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "branch" INTEGER NOT NULL,
    "units" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "pricetwo" DOUBLE PRECISION,
    "beginbalance" DOUBLE PRECISION,
    "qty" DOUBLE PRECISION,
    "minimumbalance" DOUBLE PRECISION,
    "group" TEXT,
    "applyto" TEXT NOT NULL,
    "itemclass" TEXT NOT NULL,
    "composite" TEXT NOT NULL,
    "compositeid" INTEGER,
    "description" TEXT,
    "imageone" TEXT,
    "imagetwo" TEXT,
    "imagethree" TEXT,
    "sellingprice" DOUBLE PRECISION,
    "reference" TEXT,
    "transactiondate" TEXT,
    "transactiondesc" TEXT,
    "transactionref" TEXT DEFAULT '',
    "reorderlevel" TEXT DEFAULT '2',
    "issue" TEXT,
    "issuetype" TEXT,
    "supplier" TEXT,
    "staff" TEXT DEFAULT '',
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateadded" TIMESTAMP(3) NOT NULL,
    "createdby" INTEGER NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compositedetails" (
    "id" SERIAL NOT NULL,
    "compositeid" INTEGER NOT NULL,
    "itemid" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdby" INTEGER NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "compositedetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorytimeline" (
    "id" SERIAL NOT NULL,
    "valuefrom" INTEGER NOT NULL,
    "valueto" INTEGER NOT NULL,
    "numberofdays" INTEGER NOT NULL,
    "createdby" INTEGER NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "categorytimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propertyproduct" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "member" TEXT,
    "useraccount" INTEGER NOT NULL DEFAULT 1,
    "registrationcharge" TEXT,
    "createdby" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "productofficer" INTEGER,
    "dateadded" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "propertyproduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propertyaccount" (
    "id" SERIAL NOT NULL,
    "productid" INTEGER NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "userid" INTEGER NOT NULL,
    "branch" INTEGER NOT NULL,
    "registrationcharge" INTEGER NOT NULL,
    "registrationdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrationpoint" TEXT,
    "accountofficer" INTEGER,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propertyaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propertyitems" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "itemid" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "userid" INTEGER NOT NULL,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propertyitems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "propertyproduct_product_key" ON "propertyproduct"("product");
