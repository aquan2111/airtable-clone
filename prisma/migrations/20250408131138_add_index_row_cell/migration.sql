-- CreateIndex
CREATE INDEX "Cell_rowId_columnId_idx" ON "Cell"("rowId", "columnId");

-- CreateIndex
CREATE INDEX "Cell_columnId_value_idx" ON "Cell"("columnId", "value");

-- CreateIndex
CREATE INDEX "Row_id_tableId_idx" ON "Row"("id", "tableId");
