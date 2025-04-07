-- CreateIndex
CREATE INDEX "Cell_rowId_idx" ON "Cell"("rowId");

-- CreateIndex
CREATE INDEX "Cell_columnId_idx" ON "Cell"("columnId");

-- CreateIndex
CREATE INDEX "Column_tableId_idx" ON "Column"("tableId");

-- CreateIndex
CREATE INDEX "Row_tableId_idx" ON "Row"("tableId");