/*
  Warnings:

  - Added the required column `member` to the `Position` table without a default value. This is not possible if the table is not empty.

*/
-- AlterSequence
ALTER SEQUENCE "Member_id_seq" MAXVALUE 9223372036854775807;

-- AlterSequence
ALTER SEQUENCE "Membership_id_seq" MAXVALUE 9223372036854775807;

-- AlterSequence
ALTER SEQUENCE "Position_id_seq" MAXVALUE 9223372036854775807;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "member" INT4 NOT NULL;
