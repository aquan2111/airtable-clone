/*
  Warnings:

  - Added the required column `orderIndex` to the `Column` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderIndex` to the `Row` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderIndex` to the `Table` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "orderIndex" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "orderIndex" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "orderIndex" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Column_tableId_orderIndex_idx" ON "Column"("tableId", "orderIndex");

-- CreateIndex
CREATE INDEX "Row_tableId_orderIndex_idx" ON "Row"("tableId", "orderIndex");

-- CreateIndex
CREATE INDEX "Table_baseId_orderIndex_idx" ON "Table"("baseId", "orderIndex");
