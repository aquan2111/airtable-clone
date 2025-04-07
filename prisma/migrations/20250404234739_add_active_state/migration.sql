-- AlterTable
ALTER TABLE "Filter" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "HiddenColumn" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SortOrder" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
