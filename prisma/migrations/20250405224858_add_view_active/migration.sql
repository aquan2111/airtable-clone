/*
  Warnings:

  - A unique constraint covering the columns `[activeViewId]` on the table `Table` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Base" DROP CONSTRAINT "Base_userId_fkey";

-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_columnId_fkey";

-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_rowId_fkey";

-- DropForeignKey
ALTER TABLE "Row" DROP CONSTRAINT "Row_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Table" DROP CONSTRAINT "Table_baseId_fkey";

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "activeViewId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Table_activeViewId_key" ON "Table"("activeViewId");

-- AddForeignKey
ALTER TABLE "Base" ADD CONSTRAINT "Base_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_activeViewId_fkey" FOREIGN KEY ("activeViewId") REFERENCES "View"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Row" ADD CONSTRAINT "Row_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "Row"("id") ON DELETE CASCADE ON UPDATE CASCADE;
