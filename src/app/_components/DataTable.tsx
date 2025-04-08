"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
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

type SearchResult = {
  rowId: string;
  columnId: string;
};

type DataTableProps = {
  tableId: string;
  viewId: string | null;
  searchResults: SearchResult[];
  currentSearchResultIndex: number;
  searchQuery: string;
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

export default function DataTable({
  tableId,
  viewId,
  searchResults,
  currentSearchResultIndex,
  searchQuery,
}: DataTableProps) {
  // --- State for UI elements within DataTable ---
  const [openColumnMenu, setOpenColumnMenu] = useState<string | null>(null);
  const cellRefs = useRef<Record<string, HTMLTableCellElement | null>>({}); // Keep for scrolling

  // --- Hooks for DataTable data ---
  const utils = api.useUtils();
  // Fetch columns, hidden columns, filters, sort orders, rows... (Keep this logic)
  const { data: columns = [] } = api.column.getColumnsByTable.useQuery(
    { tableId },
    { enabled: !!tableId },
  );
  const { data: hiddenColumns = [] } =
    api.hiddenColumn.getAllActiveHiddenColumnsForTable.useQuery(
      { tableId },
      { enabled: !!tableId },
    );
  const hiddenColumnIds = new Set(hiddenColumns.map((h) => h.columnId));
  const visibleColumns = columns.filter((col) => !hiddenColumnIds.has(col.id)); // Keep calculating visibleColumns

  const { data: filters = [] } =
    api.filter.getAllActiveFiltersForTable.useQuery(
      { tableId },
      { enabled: !!tableId },
    );
  const { data: sortOrders = [] } =
    api.sortOrder.getAllActiveSortsForTable.useQuery(
      { tableId },
      { enabled: !!tableId },
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
    { enabled: !!tableId },
  );

  // --- ** REMOVE Search State Management (useState, useDebounce, searchCellsQuery) ** ---
  // --- ** REMOVE Search Handlers (handleNext/Prev) ** ---
  // --- ** REMOVE Effect for clearing search results ** ---

  // --- Keep Scroll Effect (Depends on PROPS now) ---
  useEffect(() => {
    // Use props: currentSearchResultIndex, searchResults
    if (
      currentSearchResultIndex >= 0 &&
      searchResults[currentSearchResultIndex]
    ) {
      const currentResult = searchResults[currentSearchResultIndex];
      // Check visibility based on locally computed visibleColumns
      if (visibleColumns.some((col) => col.id === currentResult.columnId)) {
        const cellKey = `${currentResult.rowId}-${currentResult.columnId}`;
        const cellElement = cellRefs.current[cellKey];
        cellElement?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      } else {
        console.log("Search result is in a hidden column.");
      }
    }
    // Dependencies are the props and the locally derived visibleColumns
  }, [currentSearchResultIndex, searchResults, visibleColumns]);

  // --- Keep Highlight Calculation (Depends on PROPS now) ---
  const highlightedCells = useMemo(() => {
    const set = new Set<string>();
    searchResults.forEach((res) => set.add(`${res.rowId}-${res.columnId}`));
    return set;
  }, [searchResults]);

  const currentMatchKey = useMemo(() => {
    if (
      currentSearchResultIndex >= 0 &&
      searchResults[currentSearchResultIndex]
    ) {
      const current = searchResults[currentSearchResultIndex];
      return `${current.rowId}-${current.columnId}`;
    }
    return null;
  }, [searchResults, currentSearchResultIndex]); // Dependencies are props

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
        { enabled: !!tableId },
      )
    : { data: [] as Filter[] };

  const { data: activeSorts = [] } = tableId
    ? api.sortOrder.getAllActiveSortsForTable.useQuery(
        { tableId },
        { enabled: !!tableId },
      )
    : { data: [] as SortOrder[] };

  return (
    <div className="flex-1 overflow-auto">
      <div className="inline-block min-w-full">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              {/* Header rendering... (make sure activeSorts are available from fetch above) */}
              <tr className="border-b bg-gray-50">
                <th className="w-10 px-2 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  #
                </th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className="group relative px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  >
                    {/* ... Header cell content ... */}
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        {column.type === "TEXT" ? (
                          <Type size={14} className="mr-1 text-gray-400" />
                        ) : (
                          <Hash size={14} className="mr-1 text-gray-400" />
                        )}
                        <span>{column.name}</span>
                        {/* Use sortOrders fetched earlier */}
                        {sortOrders?.find(
                          (sort: SortOrder) =>
                            sort.columnId === column.id && sort.order === "ASC",
                        ) && (
                          <ChevronUp size={14} className="ml-1 text-blue-500" />
                        )}
                        {sortOrders?.find(
                          (sort: SortOrder) =>
                            sort.columnId === column.id &&
                            sort.order === "DESC",
                        ) && (
                          <ChevronDown
                            size={14}
                            className="ml-1 text-blue-500"
                          />
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setOpenColumnMenu(
                            openColumnMenu === column.id ? null : column.id,
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
                        viewId={viewId} // Pass viewId prop
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
                  {/* Row Number TD... */}
                  <td
                    className="border-r border-gray-200 px-2 py-2 text-xs whitespace-nowrap text-gray-500"
                    onContextMenu={(e) => handleContextMenu(e, row.id)}
                  >
                    {index + 1}
                  </td>
                  {visibleColumns.map((column) => {
                    // ** Highlight calculation uses MEMOIZED values derived from PROPS **
                    const cellKey = `${row.id}-${column.id}`;
                    const isHighlighted = highlightedCells.has(cellKey);
                    const isCurrentMatch = cellKey === currentMatchKey;

                    return (
                      <td
                        key={cellKey}
                        ref={(el) => { cellRefs.current[cellKey] = el; }}
                        // --- Adjust className ---
                        // Keep outline for current match, REMOVE general highlight background
                        className={`relative border-r border-b border-gray-200 p-0 align-top ${
                          isCurrentMatch
                            ? "z-[1] outline outline-2 outline-offset-[-1px] outline-blue-500"
                            : ""
                        // --- REMOVED: isHighlighted && !isCurrentMatch ? "bg-yellow-100" : "" ---
                        }`}
                      >
                        <EditableCell
                          rowId={row.id}
                          columnId={column.id}
                          tableId={tableId}
                          columnType={column.type}
                          searchQuery={searchQuery}
                          isHighlighted={isHighlighted} // Tell the cell if it needs to highlight internally
                        />
                      </td>
                    );
                  })}
                  {/* Alignment TD... */}
                  <td className="w-4 border-b border-gray-200"></td>
                </tr>
              ))}
              {/* Add Row Button Row */}
              <tr>
                <td className="border-r border-gray-200 px-2 py-2">
                  <button
                    onClick={handleAddRow}
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