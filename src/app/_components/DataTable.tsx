"use client";

import {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
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
import { useVirtualizer } from "@tanstack/react-virtual";

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

type Cell = {
  id: string;
  value: string;
  columnId: string;
  rowId: string;
};

type Row = {
  id: string;
  cells: Cell[];
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
  const cellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const parentRef = useRef<HTMLDivElement>(null);
  const [prevScrollOffset, setPrevScrollOffset] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const [rowCache, setRowCache] = useState<Record<number, Row | undefined>>({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({});

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

  const { data: initialTableData } = api.row.getRowsByTable.useQuery(
    {
      tableId,
      offset: 0,
      limit: 20,
      filters: transformedFilters,
      sortOrders: viewId ? sortOrders : undefined,
    },
    { enabled: !!tableId },
  );

  // Extract totalCount (defaulting to 0 if not yet loaded)
  const initialTotalCount = Number(initialTableData?.totalCount ?? 0);

  const BASE_BUFFER_SIZE = 500; // Example: Start with a larger base
  const BUFFER_SIZE = Math.max(
    BASE_BUFFER_SIZE,
    Math.floor(initialTotalCount * 0.05),
  );

  const rowVirtualizer = useVirtualizer({
    count: initialTotalCount, // use the total count from initial data
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // adjust as needed for your row height
    overscan: 20,
  });

  const scrollToAndPrefetch = async (index: number) => {
    const prefetchStart = Math.max(0, index - BUFFER_SIZE);
    const prefetchEnd = Math.min(totalCount - 1, index + BUFFER_SIZE);

    await utils.row.getRowsByTable.prefetch({
      tableId,
      offset: prefetchStart,
      limit: prefetchEnd - prefetchStart + 1,
      filters: transformedFilters,
      sortOrders: viewId ? sortOrders : undefined,
    });

    rowVirtualizer.scrollToIndex(index, { align: "center" });
  };

  // Calculate the range to fetch based on scroll direction
  const virtualItems = rowVirtualizer.getVirtualItems();
  const startIndex = virtualItems[0]?.index ?? 0;
  const endIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;

  // Adjust buffer based on scroll direction and visible range size
  const visibleRangeSize = endIndex - startIndex + 1;
  const dynamicBuffer = Math.max(BUFFER_SIZE, visibleRangeSize * 2);

  // Adjust buffer based on scroll direction
  const leadingBuffer =
    scrollDirection === "down"
      ? Math.floor(dynamicBuffer * 0.2) // 30% buffer when scrolling down
      : Math.floor(dynamicBuffer * 0.8); // 70% buffer when scrolling up

  const trailingBuffer =
    scrollDirection === "up"
      ? Math.floor(dynamicBuffer * 0.2) // 30% buffer when scrolling up
      : Math.floor(dynamicBuffer * 0.8); // 70% buffer when scrolling down

  const queryStartIndex = Math.max(0, startIndex - leadingBuffer);
  const queryEndIndex = Math.min(
    initialTotalCount - 1,
    endIndex + trailingBuffer,
  );
  const computedLimit = queryEndIndex - queryStartIndex + 1;

  const {
    data: tableData,
    isLoading: isInitialLoading,
    isFetching: isFetchingRows,
  } = api.row.getRowsByTable.useQuery(
    {
      tableId,
      offset: queryStartIndex,
      limit: computedLimit,
      filters: transformedFilters,
      sortOrders: viewId ? sortOrders : undefined,
    },
    {
      enabled: !!tableId,
      gcTime: 5000,
      staleTime: 5000,
      placeholderData: (prev) => prev,
    },
  );

  // Extract totalCount and rows from the paginated query (which should update when totalCount changes)
  const totalCount = tableData?.totalCount ?? initialTotalCount;
  const rows = tableData?.rows ?? [];

  useEffect(() => {
    if (initialTotalCount === 0) return;

    void utils.row.getRowsByTable.prefetch({
      tableId,
      offset: 0,
      limit: 100,
      filters: transformedFilters,
      sortOrders: viewId ? sortOrders : undefined,
    });
  }, [tableId, filters, sortOrders]);

  // Update your table data effect
  useEffect(() => {
    if (!tableData?.rows || tableData.rows.length === 0) return;

    setRowCache((prevCache) => {
      const newCache = { ...prevCache };

      // Add new rows to cache, keyed by absolute index
      tableData.rows.forEach((row, index) => {
        const absoluteIndex = queryStartIndex + index;

        // Only update if the row ID changed or there's no cached row at this index
        if (
          !newCache[absoluteIndex] ||
          newCache[absoluteIndex]?.id !== row.id
        ) {
          newCache[absoluteIndex] = row;
        }
      });

      return newCache;
    });
  }, [tableData, queryStartIndex]);

  useEffect(() => {
    setIsTableLoading(true);
  }, [viewId, filters, sortOrders, hiddenColumns]);

  // Turn off when data is ready
  useEffect(() => {
    if (!isFetchingRows) {
      setIsTableLoading(false);
    }
  }, [isFetchingRows]);

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
        const rowIndex =
          virtualItems.find((v) => v.key === `row-${currentResult.rowId}`)
            ?.index ?? -1;
        if (rowIndex !== -1) {
          void scrollToAndPrefetch(rowIndex);
        }
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

  const updateScrollDirection = useCallback(() => {
    if (!parentRef.current) return;

    const currentScrollTop = parentRef.current.scrollTop;
    setScrollDirection(currentScrollTop > prevScrollOffset ? "down" : "up");
    setPrevScrollOffset(currentScrollTop);
  }, [prevScrollOffset]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    // Simple debounce implementation
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScrollDirection, 100);
    };

    scrollElement.addEventListener("scroll", debouncedHandler);
    return () => {
      clearTimeout(timeoutId);
      scrollElement.removeEventListener("scroll", debouncedHandler);
    };
  }, [updateScrollDirection]);

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

  const { data: allCells } = api.cell.getCellsByTable.useQuery({ tableId });

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

  const handleAddBulkRows = api.row.createBulkRows.useMutation({
    onSuccess: () => {
      void utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const cellMap = useMemo(() => {
    const map: Record<
      string,
      Record<string, { id: string; value: string }>
    > = {};

    (allCells ?? []).forEach((cell) => {
      map[cell.rowId] ??= {};
      map[cell.rowId]![cell.columnId] = {
        id: cell.id,
        value: cell.value ?? "",
      };
    });

    return map;
  }, [allCells]);

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

    useEffect(() => {
      if (columns.length > 0) {
        const widths: Record<string, string> = {};
        // Set default widths or use custom widths if you have them stored
        columns.forEach(col => {
          // Default width or get from preferences
          widths[col.id] = '200px'; // Default width
        });
        setColumnWidths(widths);
      }
    }, [columns]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between border-b p-2">
        <button
          onClick={() => {
            void handleAddBulkRows.mutate({ tableId, count: 10000 });
          }}
          className="ml-2 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
          title="Add 100k rows"
        >
          Add 100k Rows
        </button>
      </div>
      <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
        <div style={{ overflowX: "auto", width: "100%" }}>
          {isTableLoading ? (
            <div className="flex h-[600px] items-center justify-center text-sm text-gray-500">
              Loading table...
            </div>
          ) : (
            <table className="min-w-full table-fixed border-collapse">
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
                      style={{ width: columnWidths[column.id] ?? '200px' }}
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
                              sort.columnId === column.id &&
                              sort.order === "ASC",
                          ) && (
                            <ChevronUp
                              size={14}
                              className="ml-1 text-blue-500"
                            />
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
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  // First, try to get row from live rows (if in range), else fallback to cached version
                  const rowFromLiveData =
                    virtualRow.index >= queryStartIndex &&
                    virtualRow.index <= queryEndIndex
                      ? rows[virtualRow.index - queryStartIndex]
                      : undefined;

                  const row =
                    rowFromLiveData ?? rowCache[virtualRow.index] ?? null;

                  const isLoading = !row;

                  return (
                    <tr
                      key={`row-${virtualRow.index}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                      }}
                      className={`hover:bg-gray-50 ${isLoading ? "opacity-50" : ""}`}
                      onContextMenu={(e) => row && handleContextMenu(e, row.id)}
                    >
                      <td className="border-r border-gray-200 px-2 py-2 text-xs whitespace-nowrap text-gray-500">
                        {virtualRow.index + 1}
                      </td>

                      {visibleColumns.map((column) => {
                        const cellKey = `${row?.id ?? "placeholder"}-${column.id}`;

                        if (!row) {
                          return (
                            <td
                              key={cellKey}
                              className="relative border-r border-b border-gray-200 p-0 align-top"
                              style={{ width: columnWidths[column.id] ?? '200px' }}
                            >
                              <div className="h-10 w-full animate-pulse rounded bg-gray-100 transition-opacity duration-150" />
                            </td>
                          );
                        }

                        return (
                          <td
                            key={cellKey}
                            className={`relative border-r border-b border-gray-200 p-0 align-top opacity-100 transition-opacity duration-150 ${
                              highlightedCells.has(cellKey) &&
                              cellKey === currentMatchKey
                                ? "z-[1] outline outline-2 outline-offset-[-1px] outline-blue-500"
                                : ""
                            }`}
                            style={{ width: columnWidths[column.id] ?? '200px' }}
                          >
                            <EditableCell
                              rowId={row.id}
                              columnId={column.id}
                              tableId={tableId}
                              columnType={column.type}
                              searchQuery={searchQuery}
                              isHighlighted={highlightedCells.has(cellKey)}
                              cellValue={
                                cellMap?.[row.id]?.[column.id]?.value ?? ""
                              }
                              cellId={cellMap?.[row.id]?.[column.id]?.id}
                            />
                          </td>
                        );
                      })}

                      <td className="w-4 border-b border-gray-200" />
                    </tr>
                  );
                })}
                <tr
                  style={{
                    position: "absolute",
                    top: `${rowVirtualizer.getTotalSize()}px`,
                    left: 0,
                    width: "100%",
                  }}
                >
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
          )}
        </div>
      </div>
    </div>
  );
}
