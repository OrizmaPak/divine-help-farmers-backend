/*
  Warnings:

  - You are about to alter the column `sessiontoken` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10000)`.

*/
-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "sessiontoken" SET DATA TYPE VARCHAR(10000);
