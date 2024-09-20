/*
  Warnings:

  - The `module` column on the `Activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Branch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `DefineMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Department` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `allow_back_dated_transaction` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `allow_future_transaction` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `schedule_maintenace_charge` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sms_charge_members` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "module";
ALTER TABLE "Activity" ADD COLUMN     "module" STRING NOT NULL DEFAULT 'AUTH';

-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "status";
ALTER TABLE "Branch" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "DefineMember" DROP COLUMN "status";
ALTER TABLE "DefineMember" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "status";
ALTER TABLE "Department" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Organisationsettings" DROP COLUMN "allow_back_dated_transaction";
ALTER TABLE "Organisationsettings" ADD COLUMN     "allow_back_dated_transaction" STRING NOT NULL DEFAULT 'NO';
ALTER TABLE "Organisationsettings" DROP COLUMN "allow_future_transaction";
ALTER TABLE "Organisationsettings" ADD COLUMN     "allow_future_transaction" STRING NOT NULL DEFAULT 'NO';
ALTER TABLE "Organisationsettings" DROP COLUMN "schedule_maintenace_charge";
ALTER TABLE "Organisationsettings" ADD COLUMN     "schedule_maintenace_charge" STRING NOT NULL DEFAULT 'NO';
ALTER TABLE "Organisationsettings" DROP COLUMN "sms_charge_members";
ALTER TABLE "Organisationsettings" ADD COLUMN     "sms_charge_members" STRING NOT NULL DEFAULT 'YES';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" ADD COLUMN     "role" STRING NOT NULL DEFAULT 'USER';
ALTER TABLE "User" DROP COLUMN "status";
ALTER TABLE "User" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';
