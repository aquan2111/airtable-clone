import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import type { 
  SortingState, 
  ColumnFiltersState 
} from "@tanstack/react-table";
import type { Column, Row, FilterType } from "../_components/data-table/types";

export function useDataTable(tableId: string) {
  const { data: table, refetch } = api.table.getTableById.useQuery({
    id: tableId,
  });

  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
    cellId?: string;
    value: string;
    validationError: string | null;
  } | null>(null);

  const [newColumnName, setNewColumnName] = useState<string>("");
  const [showNewColumnInput, setShowNewColumnInput] = useState<boolean>(false);
  const [editingColumn, setEditingColumn] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [showFilterInput, setShowFilterInput] = useState<boolean>(false);
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterComparison, setFilterComparison] = useState<string>("contains");
  const [filterValue, setFilterValue] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<
    { id: string; comparison: FilterType; value: string }[]
  >([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // Mutations
  const createColumnMutation = api.column.createColumn.useMutation({
    onSuccess: () => {
      void refetch();
      setShowNewColumnInput(false);
      setNewColumnName("");
    },
  });

  const deleteColumnMutation = api.column.deleteColumn.useMutation({
    onSuccess: () => void refetch(),
  });

  const createRowMutation = api.row.createRow.useMutation({
    onSuccess: () => void refetch(),
  });

  const deleteRowMutation = api.row.deleteRow.useMutation({
    onSuccess: () => void refetch(),
  });

  const createCellMutation = api.cell.createCell.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingCell(null);
    },
  });

  const updateColumnMutation = api.column.updateColumn.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingColumn(null);
    },
  });

  const updateCellMutation = api.cell.updateCell.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingCell(null);
    },
  });

  // Validate if a column can be changed to number type
  const canConvertToNumberType = useCallback(
    (columnId: string): boolean => {
      if (!table) return true;

      // Check if all cells in the column contain valid numbers or are empty
      const hasNonNumericValue = table.rows.some((row) => {
        const cell = row.cells.find((cell) => cell.columnId === columnId);
        if (!cell || cell.value === "") return false;
        return isNaN(Number(cell.value));
      });

      return !hasNonNumericValue;
    },
    [table],
  );

  // Validate cell value based on column type
  const validateCellValue = useCallback(
    (value: string, columnType: string): string | null => {
      if (columnType === "NUMBER" && value !== "") {
        if (isNaN(Number(value))) {
          return "Please enter a valid number";
        }
      }
      return null;
    },
    [],
  );

  // Handle cell value change with validation
  const handleCellValueChange = useCallback(
    (value: string) => {
      if (!editingCell || !table) return;

      const column = table.columns.find(
        (col) => col.id === editingCell.columnId,
      );
      if (!column) return;

      const validationError = validateCellValue(value, column.type);

      setEditingCell((prev) =>
        prev
          ? {
              ...prev,
              value,
              validationError,
            }
          : null,
      );
    },
    [editingCell, table, validateCellValue],
  );

  // Memoized handlers
  const handleCreateColumn = useCallback(() => {
    if (!table || !tableId) return;

    // Regular expression to match "ColumnX" pattern
    const columnPattern = /^Column(\d+)$/;
    const usedNumbers = new Set<number>();

    // Extract numbers from column names
    table.columns.forEach((col) => {
      const match = columnPattern.exec(col.name);
      if (match?.[1]) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    // Find the lowest available number
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    // Generate the new column name
    const newColumnName = `Column${nextNumber}`;

    createColumnMutation.mutate({
      name: newColumnName,
      tableId: tableId,
      type: "TEXT",
    });
  }, [table, tableId, createColumnMutation]);

  // Handle creating a new row
  const handleCreateRow = useCallback(() => {
    if (tableId) {
      createRowMutation.mutate({ tableId: tableId });
    }
  }, [tableId, createRowMutation]);

  // Handle cell value update
  const handleUpdateCell = useCallback(() => {
    if (editingCell && !editingCell.validationError) {
      if (editingCell.cellId) {
        // Update existing cell
        updateCellMutation.mutate({
          id: editingCell.cellId,
          value: editingCell.value,
        });
      } else {
        // Create new cell
        createCellMutation.mutate({
          rowId: editingCell.rowId,
          columnId: editingCell.columnId,
          value: editingCell.value,
        });
      }
    }
  }, [editingCell, updateCellMutation, createCellMutation]);

  // Handle column update
  const handleUpdateColumn = useCallback(
    (columnId: string, newName: string, newType: string) => {
      updateColumnMutation.mutate({
        id: columnId,
        name: newName,
        type: newType,
      });
    },
    [updateColumnMutation],
  );

  return {
    table,
    editingCell,
    setEditingCell,
    editingColumn,
    setEditingColumn,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    deleteColumnMutation,
    deleteRowMutation,
    canConvertToNumberType,
    validateCellValue,
    handleCellValueChange,
    handleCreateColumn,
    handleCreateRow,
    handleUpdateCell,
    handleUpdateColumn,
  };
}