/*
  Warnings:

  - You are about to drop the column `createdBy` on the `View` table. All the data in the column will be lost.
  - You are about to drop the column `filters` on the `View` table. All the data in the column will be lost.
  - You are about to drop the column `hiddenCols` on the `View` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `View` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `View` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "View" DROP COLUMN "createdBy",
DROP COLUMN "filters",
DROP COLUMN "hiddenCols",
DROP COLUMN "sortOrder",
ADD COLUMN     "creatorId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "comparisonFunction" TEXT NOT NULL,
    "comparisonValue" TEXT,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SortOrder" (
    "id" TEXT NOT NULL,
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "order" TEXT NOT NULL,

    CONSTRAINT "SortOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiddenColumn" (
    "viewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,

    CONSTRAINT "HiddenColumn_pkey" PRIMARY KEY ("viewId","columnId")
);

-- CreateIndex
CREATE INDEX "HiddenColumn_viewId_idx" ON "HiddenColumn"("viewId");

-- CreateIndex
CREATE INDEX "HiddenColumn_columnId_idx" ON "HiddenColumn"("columnId");

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortOrder" ADD CONSTRAINT "SortOrder_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortOrder" ADD CONSTRAINT "SortOrder_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenColumn" ADD CONSTRAINT "HiddenColumn_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenColumn" ADD CONSTRAINT "HiddenColumn_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;
