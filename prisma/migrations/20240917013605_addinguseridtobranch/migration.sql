-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "userid" INT4;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "branch" SET DEFAULT 1;
