/*
  Warnings:

  - Added the required column `type` to the `promotiondemotion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promotiondemotion" ADD COLUMN     "type" TEXT NOT NULL;
