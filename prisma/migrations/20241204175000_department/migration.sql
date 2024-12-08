-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "applyforsales" STRING DEFAULT 'JUST DEPARTMENT';
ALTER TABLE "Department" ADD COLUMN     "category" STRING DEFAULT 'STORE';

-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "membership" STRING DEFAULT '';
