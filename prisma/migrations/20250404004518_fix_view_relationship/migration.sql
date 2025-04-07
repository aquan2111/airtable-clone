/*
  Warnings:

  - You are about to drop the column `viewId` on the `Filter` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `HiddenColumn` table. All the data in the column will be lost.
  - You are about to drop the column `viewId` on the `HiddenColumn` table. All the data in the column will be lost.
  - You are about to drop the column `viewId` on the `SortOrder` table. All the data in the column will be lost.
  - Changed the type of `type` on the `Column` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `comparisonFunction` on the `Filter` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `order` on the `SortOrder` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ColumnType" AS ENUM ('TEXT', 'NUMBER');

-- CreateEnum
CREATE TYPE "ComparisonFunction" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'CONTAINS', 'NOT_CONTAINS', 'IS_EMPTY', 'IS_NOT_EMPTY');

-- CreateEnum
CREATE TYPE "SortDirection" AS ENUM ('ASC', 'DESC');

-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Filter" DROP CONSTRAINT "Filter_viewId_fkey";

-- DropForeignKey
ALTER TABLE "HiddenColumn" DROP CONSTRAINT "HiddenColumn_userId_fkey";

-- DropForeignKey
ALTER TABLE "HiddenColumn" DROP CONSTRAINT "HiddenColumn_viewId_fkey";

-- DropForeignKey
ALTER TABLE "SortOrder" DROP CONSTRAINT "SortOrder_viewId_fkey";

-- DropIndex
DROP INDEX "HiddenColumn_columnId_idx";

-- DropIndex
DROP INDEX "HiddenColumn_userId_columnId_key";

-- DropIndex
DROP INDEX "HiddenColumn_viewId_idx";

-- AlterTable
ALTER TABLE "Column" DROP COLUMN "type",
ADD COLUMN     "type" "ColumnType" NOT NULL;

-- AlterTable
ALTER TABLE "Filter" DROP COLUMN "viewId",
DROP COLUMN "comparisonFunction",
ADD COLUMN     "comparisonFunction" "ComparisonFunction" NOT NULL;

-- AlterTable
ALTER TABLE "HiddenColumn" DROP COLUMN "userId",
DROP COLUMN "viewId";

-- AlterTable
ALTER TABLE "SortOrder" DROP COLUMN "viewId",
DROP COLUMN "order",
ADD COLUMN     "order" "SortDirection" NOT NULL;

-- AlterTable
ALTER TABLE "View" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ViewFilter" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,

    CONSTRAINT "ViewFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewSort" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "sortOrderId" TEXT NOT NULL,

    CONSTRAINT "ViewSort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewHiddenColumn" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "hiddenColumnId" TEXT NOT NULL,

    CONSTRAINT "ViewHiddenColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewFilter_viewId_filterId_key" ON "ViewFilter"("viewId", "filterId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewSort_viewId_sortOrderId_key" ON "ViewSort"("viewId", "sortOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ViewHiddenColumn_viewId_hiddenColumnId_key" ON "ViewHiddenColumn"("viewId", "hiddenColumnId");

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewFilter" ADD CONSTRAINT "ViewFilter_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewFilter" ADD CONSTRAINT "ViewFilter_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "Filter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewSort" ADD CONSTRAINT "ViewSort_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewSort" ADD CONSTRAINT "ViewSort_sortOrderId_fkey" FOREIGN KEY ("sortOrderId") REFERENCES "SortOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHiddenColumn" ADD CONSTRAINT "ViewHiddenColumn_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHiddenColumn" ADD CONSTRAINT "ViewHiddenColumn_hiddenColumnId_fkey" FOREIGN KEY ("hiddenColumnId") REFERENCES "HiddenColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
