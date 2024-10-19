-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "maxbalance" FLOAT8;
ALTER TABLE "savingsproduct" ALTER COLUMN "withdrawallimit" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "withdrawalcharges" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "withdrawalchargetype" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "withdrawalchargeinterval" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "depositcharge" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "withdrawallimittype" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "activationfee" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "minimumaccountbalance" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydeposittype" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositfrequency" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositpenalty" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositpenaltytype" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositpenaltyfrom" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositpenaltyfallbackfrom" DROP NOT NULL;
ALTER TABLE "savingsproduct" ALTER COLUMN "depositechargetype" DROP NOT NULL;
