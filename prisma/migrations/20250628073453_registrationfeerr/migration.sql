/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `codeandmeaningforlanding` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "codeandmeaningforlanding_code_key" ON "codeandmeaningforlanding"("code");
