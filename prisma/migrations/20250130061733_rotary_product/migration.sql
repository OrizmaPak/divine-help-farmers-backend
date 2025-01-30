-- CreateTable
CREATE TABLE "rotaryProduct" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "member" TEXT,
    "useraccount" INTEGER NOT NULL DEFAULT 1,
    "registrationcharge" TEXT,
    "createdby" INTEGER NOT NULL,
    "description" TEXT DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "productofficer" INTEGER,
    "poolnumber" TEXT NOT NULL,
    "rotaryschedule" TEXT DEFAULT 'PRODUCT',
    "frequency" TEXT,
    "frequencynumber" INTEGER,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "rotaryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rotaryProduct_product_key" ON "rotaryProduct"("product");
