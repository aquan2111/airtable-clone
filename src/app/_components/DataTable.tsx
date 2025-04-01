"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

import { EditableColumnHeader } from "~/app/_components/data-table/EditableColumnHeader";
import { EditableCell } from "~/app/_components/data-table/EditableCell";
import { TableToolbar } from "~/app/_components/data-table/TableToolbar";
import { useDataTable } from "~/app/_hooks/useDataTable";
import type { DataTableProps, Row } from "~/app/_components/data-table/types";

export default function DataTable({
  tableId,
}: DataTableProps): React.ReactNode {
  const {
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
  } = useDataTable(tableId);

  // TanStack Table Setup
  const columnHelper = createColumnHelper<Row>();

  const generateColumns = () => {
    if (!table) return [];

    // Create column definitions
    const columns = table.columns.map((col) =>
      columnHelper.accessor(
        (row) => {
          const cell = row.cells?.find((c) => c.columnId === col.id);
          return cell?.value ?? "";
        },
        {
          id: col.id,
          header: ({ column }) => (
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <EditableColumnHeader
                  column={col}
                  isEditing={editingColumn?.id === col.id}
                  editValue={
                    editingColumn?.id === col.id ? editingColumn.name : ""
                  }
                  editType={
                    editingColumn?.id === col.id ? editingColumn.type : col.type
                  }
                  onEditChange={(value) =>
                    setEditingColumn((prev) =>
                      prev ? { ...prev, name: value } : null,
                    )
                  }
                  onTypeChange={(type) =>
                    setEditingColumn((prev) =>
                      prev ? { ...prev, type } : null,
                    )
                  }
                  onSave={() => {
                    if (editingColumn) {
                      handleUpdateColumn(
                        col.id,
                        editingColumn.name,
                        editingColumn.type,
                      );
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
                  hasNonNumericValues={!canConvertToNumberType(col.id)}
                />

                {/* Prominent Sort Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    column.toggleSorting();
                  }}
                  className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                  title="Toggle sort"
                >
                  {column.getIsSorted() === "asc"
                    ? "🔼"
                    : column.getIsSorted() === "desc"
                      ? "🔽"
                      : "⇅"}
                </button>
              </div>
            </div>
          ),

          cell: ({ row, column }) => {
            const rowId = row.original.id;
            const columnId = column.id;
            const cell = row.original.cells?.find(
              (c) => c.columnId === columnId,
            );
            const cellValue = cell?.value ?? "";
            const isEditing =
              editingCell?.rowId === rowId &&
              editingCell?.columnId === columnId;

            const columnDef = table.columns.find((c) => c.id === columnId);
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
                  const columnType =
                    table.columns.find((c) => c.id === columnId)?.type ??
                    "TEXT";
                  const validationError = validateCellValue(
                    cellValue,
                    columnType,
                  );

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
  };

  const columns = generateColumns();
  const data = table?.rows ?? [];

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting: sorting,
      columnFilters: columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
  });

  if (!table) {
    return <div className="p-4 text-center">Loading table data...</div>;
  }

  return (
    <div className="p-4">
      <TableToolbar
        onAddColumn={handleCreateColumn}
        onAddRow={handleCreateRow}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      {/* TanStack Table */}
      <div className="overflow-hidden rounded border">
        <table className="w-full">
          <thead>
            {tableInstance.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer border p-2 text-left"
                    onClick={() => header.column.toggleSorting()}
                  >
                    {flexRender(
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