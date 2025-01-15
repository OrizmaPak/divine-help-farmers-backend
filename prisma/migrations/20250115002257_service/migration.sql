/*
  Warnings:

  - Added the required column `branch` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "branch" INTEGER NOT NULL;
