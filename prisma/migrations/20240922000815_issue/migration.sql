-- AlterSequence
ALTER SEQUENCE "issue_id_seq" MAXVALUE 9223372036854775807;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "returned" BOOL NOT NULL DEFAULT false;
