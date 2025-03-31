"use client";

import { useState, useCallback } from "react";
import { Plus, Save, Trash2, X, Pencil } from "lucide-react";
import { api } from "~/trpc/react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Define proper interfaces for your data structures
interface Column {
  id: string;
  name: string;
  type: string;
  tableId: string;
}

interface Cell {
  id: string;
  rowId: string;
  columnId: string;
  value: string;
}

interface Row {
  id: string;
  tableId: string;
  cells: Cell[];
}

interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
}

interface DataTableProps {
  tableId: string;
}

// Types for extracted components
interface EditableColumnHeaderProps {
  column: Column;
  isEditing: boolean;
  editValue: string;
  editType: string;
  onEditChange: (value: string) => void;
  onTypeChange: (type: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  hasNonNumericValues: boolean;
}

// Extracted editable column header component to prevent re-rendering issues
function EditableColumnHeader({
  column,
  isEditing,
  editValue,
  editType,
  onEditChange,
  onTypeChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  hasNonNumericValues,
}: EditableColumnHeaderProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between">
      {isEditing ? (
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="w-24 border p-1"
            autoFocus
            // Prevent propagation to avoid table re-renders
            onClick={(e) => e.stopPropagation()}
            // Add key press handler for Enter and Escape
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                onSave();
              } else if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
          <div className="flex items-center">
            <select 
              value={editType} 
              onChange={(e) => onTypeChange(e.target.value)}
              className="text-xs border p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
            </select>
            {column.type === "TEXT" && editType === "NUMBER" && hasNonNumericValues && (
              <span className="ml-2 text-xs text-red-500">
                ⚠️ Clear non-numeric values first
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <span>{column.name}</span>
          <span className="text-xs text-gray-500">
            {column.type === "NUMBER" ? "Number" : "Text"}
          </span>
        </div>
      )}

      <div className="flex space-x-2">
        {isEditing ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="cursor-pointer text-green-500"
              disabled={column.type === "TEXT" && editType === "NUMBER" && hasNonNumericValues}
            >
              <Save size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="cursor-pointer text-red-500"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className="cursor-pointer text-gray-500"
          >
            <Pencil size={16} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="cursor-pointer text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

interface EditableCellProps {
  value: string;
  isEditing: boolean;
  editValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  isNumberType: boolean;
  validationError: string | null;
}

// Extracted editable cell component
function EditableCell({ 
  value, 
  isEditing, 
  editValue, 
  onChange, 
  onSave, 
  onCancel, 
  onStartEdit,
  isNumberType,
  validationError 
}: EditableCellProps): React.ReactNode {
  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <input
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border p-1 ${validationError ? 'border-red-500' : ''}`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !validationError) {
                onSave();
              } else if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!validationError) onSave();
            }}
            className={`ml-2 cursor-pointer ${validationError ? 'text-gray-400' : 'text-green-500'}`}
            disabled={!!validationError}
          >
            <Save size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="ml-2 cursor-pointer text-red-500"
          >
            <X size={16} />
          </button>
        </div>
        {validationError && (
          <div className="text-xs text-red-500 mt-1">{validationError}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-8 cursor-pointer p-1 hover:bg-gray-100"
      onClick={onStartEdit}
    >
      {value ? value : <span className="text-gray-400">Empty</span>}
    </div>
  );
}

export default function DataTable({ tableId }: DataTableProps): React.ReactNode {
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
  const canConvertToNumberType = useCallback((columnId: string): boolean => {
    if (!table) return true;
    
    // Check if all cells in the column contain valid numbers or are empty
    const hasNonNumericValue = table.rows.some(row => {
      const cell = row.cells.find(cell => cell.columnId === columnId);
      if (!cell || cell.value === "") return false;
      return isNaN(Number(cell.value));
    });
    
    return !hasNonNumericValue;
  }, [table]);

  // Validate cell value based on column type
  const validateCellValue = useCallback((value: string, columnType: string): string | null => {
    if (columnType === "NUMBER" && value !== "") {
      if (isNaN(Number(value))) {
        return "Please enter a valid number";
      }
    }
    return null;
  }, []);

  // Handle cell value change with validation
  const handleCellValueChange = useCallback((value: string) => {
    if (!editingCell || !table) return;
    
    const column = table.columns.find(col => col.id === editingCell.columnId);
    if (!column) return;
    
    const validationError = validateCellValue(value, column.type);
    
    setEditingCell(prev => prev ? { 
      ...prev, 
      value,
      validationError 
    } : null);
  }, [editingCell, table, validateCellValue]);

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
    [updateColumnMutation]
  );

  // TanStack Table Setup
  const columnHelper = createColumnHelper<Row>();

  const generateColumns = useCallback(() => {
    if (!table) return [];

    // Create column definitions
    const columns = table.columns.map((col) =>
      columnHelper.accessor(
        (row) => {
          const cell = row.cells?.find((c: Cell) => c.columnId === col.id);
          return cell?.value ?? "";
        },
        {
          id: col.id,
          header: () => {
            const hasNonNumericValues = !canConvertToNumberType(col.id);
            
            return (
              <EditableColumnHeader
                column={col}
                isEditing={editingColumn?.id === col.id}
                editValue={editingColumn?.id === col.id ? editingColumn.name : ""}
                editType={editingColumn?.id === col.id ? editingColumn.type : col.type}
                onEditChange={(value: string) => 
                  setEditingColumn(prev => prev ? { ...prev, name: value } : null)
                }
                onTypeChange={(type: string) => 
                  setEditingColumn(prev => prev ? { ...prev, type } : null)
                }
                onSave={() => {
                  if (editingColumn) {
                    // Only allow changing to NUMBER if all values are valid numbers or empty
                    if (col.type === "TEXT" && editingColumn.type === "NUMBER" && hasNonNumericValues) {
                      return; // Prevent saving if invalid conversion
                    }
                    handleUpdateColumn(col.id, editingColumn.name, editingColumn.type);
                  }
                }}
                onCancel={() => setEditingColumn(null)}
                onStartEdit={() => 
                  setEditingColumn({
                    id: col.id,
                    name: col.name,
                    type: col.type,
                  })
                }
                onDelete={() => deleteColumnMutation.mutate({ id: col.id })}
                hasNonNumericValues={hasNonNumericValues}
              />
            );
          },
          cell: ({ row, column }) => {
            const rowId = row.original.id;
            const columnId = column.id;
            const cell = row.original.cells?.find(
              (c: Cell) => c.columnId === columnId,
            );
            const cellValue = cell?.value ?? "";
            const isEditing = 
              editingCell?.rowId === rowId && 
              editingCell?.columnId === columnId;
            
            const columnDef = table.columns.find(c => c.id === columnId);
            const isNumberType = columnDef?.type === "NUMBER";
            
            return (
              <EditableCell
                value={cellValue}
                isEditing={isEditing}
                editValue={isEditing ? editingCell.value : ""}
                onChange={handleCellValueChange}
                onSave={handleUpdateCell}
                onCancel={() => setEditingCell(null)}
                onStartEdit={() => {
                  const columnType = table.columns.find(c => c.id === columnId)?.type ?? "TEXT";
                  const validationError = validateCellValue(cellValue, columnType);
                  
                  setEditingCell({
                    rowId,
                    columnId,
                    cellId: cell?.id,
                    value: cellValue,
                    validationError,
                  });
                }}
                isNumberType={isNumberType}
                validationError={isEditing ? editingCell.validationError : null}
              />
            );
          },
        },
      ),
    );

    // Add row actions column with proper type handling
    return [
      ...columns,
      columnHelper.accessor((row) => row.id, {
        id: "actions",
        header: () => <span>Actions</span>,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteRowMutation.mutate({ id: row.original.id });
            }}
            className="cursor-pointer text-red-500 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
          </button>
        ),
      }),
    ];
  }, [
    table, 
    columnHelper, 
    editingColumn, 
    editingCell, 
    deleteColumnMutation, 
    handleUpdateCell, 
    handleUpdateColumn,
    deleteRowMutation,
    canConvertToNumberType,
    validateCellValue,
    handleCellValueChange
  ]);

  const columns = generateColumns();
  const data = table?.rows ?? [];

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!table) {
    return <div className="p-4 text-center">Loading table data...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center space-x-4">
        {/* Add column button */}
        <button
          className="flex cursor-pointer items-center rounded bg-blue-500 px-3 py-2 text-white disabled:cursor-not-allowed"
          onClick={handleCreateColumn} // Instantly creates a new column
        >
          <Plus size={16} className="mr-1" /> Add Column
        </button>

        {/* Add row button */}
        <button
          className="flex cursor-pointer items-center rounded bg-green-500 px-3 py-2 text-white disabled:cursor-not-allowed"
          onClick={handleCreateRow}
        >
          <Plus
            size={16}
            className="mr-1 cursor-pointer disabled:cursor-not-allowed"
          />{" "}
          Add Row
        </button>
      </div>

      {/* TanStack Table */}
      <div className="overflow-hidden rounded border">
        <table className="w-full">
          <thead>
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-200">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border p-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.length ? (
              tableInstance.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border p-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-4 text-center">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}