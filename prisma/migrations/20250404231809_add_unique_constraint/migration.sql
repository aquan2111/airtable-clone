/*
  Warnings:

  - A unique constraint covering the columns `[columnId,comparisonFunction,comparisonValue]` on the table `Filter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[columnId]` on the table `HiddenColumn` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[columnId,order]` on the table `SortOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Filter_columnId_comparisonFunction_comparisonValue_key" ON "Filter"("columnId", "comparisonFunction", "comparisonValue");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenColumn_columnId_key" ON "HiddenColumn"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "SortOrder_columnId_order_key" ON "SortOrder"("columnId", "order");
