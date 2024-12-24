-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Lastseen" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "collateral" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';
