-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "userid" INT4 DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userpermissions" STRING DEFAULT '';
