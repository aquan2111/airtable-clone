"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  PlusCircle,
  MoreHorizontal,
  Hash,
  Type,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import EditableCell from "./EditableCell";
import ColumnMenu from "./ColumnMenu";

type DataTableProps = {
  tableId: string;
  viewId: string | null;
};

interface Filter {
  columnId: string;
  comparisonFunction:
    | "EQUALS"
    | "NOT_EQUALS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "GREATER_THAN_OR_EQUAL"
    | "LESS_THAN_OR_EQUAL"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "IS_EMPTY"
    | "IS_NOT_EMPTY";
  comparisonValue: string;
}
interface SortOrder {
  columnId: string;
  order: "ASC" | "DESC";
}

export default function DataTable({ tableId, viewId }: DataTableProps) {
  const [openColumnMenu, setOpenColumnMenu] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: columns = [] } = api.column.getColumnsByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const { data: hiddenColumns = [] } =
    api.hiddenColumn.getAllActiveHiddenColumnsForTable.useQuery(
      { tableId },
      { enabled: !!tableId }
    );

  const hiddenColumnIds = new Set(hiddenColumns.map((h) => h.columnId));
  const visibleColumns = columns.filter((col) => !hiddenColumnIds.has(col.id));

  const { data: filters = [] } =
    api.filter.getAllActiveFiltersForTable.useQuery(
      { tableId },
      { enabled: !!tableId }
    );

  const { data: sortOrders = [] } =
    api.sortOrder.getAllActiveSortsForTable.useQuery(
      { tableId },
      { enabled: !!tableId }
    );

  const transformedFilters = viewId
    ? filters.map(({ columnId, comparisonFunction, comparisonValue }) => ({
        columnId,
        comparisonFunction,
        comparisonValue: comparisonValue ?? undefined,
      }))
    : undefined;

  const { data: rows = [] } = api.row.getRowsByTable.useQuery(
    {
      tableId,
      filters: transformedFilters,
      sortOrders: viewId ? sortOrders : undefined,
    },
    { enabled: !!tableId }
  );

  const addRow = api.row.createRow.useMutation({
    onSuccess: () => {
      void utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const addColumn = api.column.createColumn.useMutation({
    onSuccess: () => {
      void utils.column.getColumnsByTable.invalidate({ tableId });
    },
  });

  const deleteRow = api.row.deleteRow.useMutation({
    onSuccess: () => {
      void utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const handleAddRow = () => {
    void addRow.mutate({ tableId });
  };

  const handleAddColumn = () => {
    void addColumn.mutate({
      tableId,
      name: `Column ${columns.length + 1}`,
      type: "TEXT",
    });
  };

  const handleDeleteRow = (rowId: string) => {
    void deleteRow.mutate({ id: rowId });
  };

  const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    const confirmDelete = window.confirm("Delete this row?");
    if (confirmDelete) {
      handleDeleteRow(rowId);
    }
  };

  const { data: activeFilters = [] } = tableId
    ? api.filter.getAllActiveFiltersForTable.useQuery(
        { tableId },
        { enabled: !!tableId }
      )
    : { data: [] as Filter[] };

  const { data: activeSorts = [] } = tableId
    ? api.sortOrder.getAllActiveSortsForTable.useQuery(
        { tableId },
        { enabled: !!tableId }
      )
    : { data: [] as SortOrder[] };

  return (
    <div className="flex-1 overflow-auto">
      <div className="inline-block min-w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="w-10 px-2 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  #
                </th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className="group relative px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        {column.type === "TEXT" ? (
                          <Type size={14} className="mr-1 text-gray-400" />
                        ) : (
                          <Hash size={14} className="mr-1 text-gray-400" />
                        )}
                        <span>{column.name}</span>
                        {activeSorts?.find(
                          (sort: SortOrder) =>
                            sort.columnId === column.id && sort.order === "ASC"
                        ) && (
                          <ChevronUp size={14} className="ml-1 text-blue-500" />
                        )}
                        {activeSorts?.find(
                          (sort: SortOrder) =>
                            sort.columnId === column.id && sort.order === "DESC"
                        ) && (
                          <ChevronDown size={14} className="ml-1 text-blue-500" />
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setOpenColumnMenu(
                            openColumnMenu === column.id ? null : column.id
                          )
                        }
                        className="ml-1 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>

                    {openColumnMenu === column.id && (
                      <ColumnMenu
                        column={column}
                        tableId={tableId}
                        viewId={viewId}
                        onClose={() => setOpenColumnMenu(null)}
                      />
                    )}
                  </th>
                ))}
                <th className="w-10 px-2 py-3">
                  <button
                    onClick={handleAddColumn}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Add column"
                  >
                    <PlusCircle size={16} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td
                    className="border-r border-gray-200 px-2 py-2 text-xs whitespace-nowrap text-gray-500"
                    onContextMenu={(e) => handleContextMenu(e, row.id)}
                  >
                    {index + 1}
                  </td>
                  {visibleColumns.map((column) => (
                    <td
                      key={`${row.id}-${column.id}`}
                      className="border-b border-gray-200 px-3 py-2"
                    >
                      <EditableCell
                        rowId={row.id}
                        columnId={column.id}
                        tableId={tableId}
                        columnType={column.type}
                      />
                    </td>
                  ))}
                  <td className="w-4"></td>
                </tr>
              ))}
              <tr>
                <td
                  className="border-r border-gray-200 px-2 py-2"
                  onClick={handleAddRow}
                >
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Add row"
                  >
                    <PlusCircle size={16} />
                  </button>
                </td>
                <td colSpan={visibleColumns.length + 1}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
