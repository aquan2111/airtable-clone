"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { api } from "~/trpc/react";
import BaseHeader from "~/app/_components/BaseHeader";
import TableTab from "~/app/_components/TableTab";
import TableToolbar from "~/app/_components/TableToolbar";
import DataTable from "~/app/_components/DataTable";
import ViewMenu from "~/app/_components/ViewMenu";

type SearchResult = {
  rowId: string;
  columnId: string;
};

export default function BasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: baseId } = use(params);
  const { data: tables } = api.table.getTablesByBase.useQuery({ baseId });

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(-1);

  useEffect(() => {
    if (tables && tables.length > 0 && !activeTableId) {
      setActiveTableId(tables[0]?.id ?? null);
    }
  }, [tables, activeTableId]);

  const { data: table } = api.table.getTableById.useQuery(
    { id: activeTableId! },
    { enabled: !!activeTableId },
  );

  const { data: views } = api.view.getViewsForTable.useQuery(
    { tableId: activeTableId! },
    { enabled: !!activeTableId },
  );

  useEffect(() => {
    if (table && views) {
      const fallbackViewId = views[0]?.id ?? null;
      const newViewId = table.activeViewId ?? fallbackViewId;
      if (newViewId !== activeViewId) {
        setActiveViewId(newViewId);
      }
    }
  }, [table, views, activeViewId]);

  // Remove onSuccess, onError, keepPreviousData from here
  const searchCellsQuery = api.cell.searchCellsInTable.useQuery(
    { tableId: activeTableId!, query: debouncedSearchQuery },
    {
      enabled: !!activeTableId && debouncedSearchQuery.length > 0,
      // keepPreviousData: true, // Remove or replace if needed based on TanStack Query version
    },
  );
  const isSearching = searchCellsQuery.isLoading || searchCellsQuery.isFetching; // Use isFetching too if you want loading indicator during refetch with previous data shown

  useEffect(() => {
    if (searchCellsQuery.isSuccess) {
      const data = searchCellsQuery.data;
      setSearchResults(data ?? []);
      setCurrentSearchResultIndex((data && data.length > 0) ? 0 : -1);
    } else if (searchCellsQuery.isError) {
      // Optionally handle the error, e.g., show a toast notification
      console.error("Error searching cells:", searchCellsQuery.error);
      setSearchResults([]);
      setCurrentSearchResultIndex(-1);
    }
    // No explicit handling needed for loading state here,
    // as isSearching covers that for the UI.
    // The previous results remain in the state until success or error updates it.
  }, [searchCellsQuery.data, searchCellsQuery.isSuccess, searchCellsQuery.isError, searchCellsQuery.error]); // Add dependencies

  useEffect(() => {
    if (debouncedSearchQuery.length === 0 || !activeTableId) {
      setSearchResults([]);
      setCurrentSearchResultIndex(-1);
    }
  }, [debouncedSearchQuery, activeTableId]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTableId]);

  const handleNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentSearchResultIndex(
      (prevIndex) => (prevIndex + 1) % searchResults.length,
    );
  }, [searchResults.length]);

  const handlePreviousSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentSearchResultIndex(
      (prevIndex) =>
        (prevIndex - 1 + searchResults.length) % searchResults.length,
    );
  }, [searchResults.length]);

  const toggleViewMenu = () => {
    setIsViewMenuOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen flex-col">
      <BaseHeader baseId={baseId} />
      <TableTab
        baseId={baseId}
        activeTableId={activeTableId}
        onTableChange={setActiveTableId}
      />

      <div className="flex flex-1 overflow-hidden">
        {isViewMenuOpen && activeTableId && (
          <ViewMenu
            tableId={activeTableId}
            activeViewId={activeViewId}
            onViewChange={setActiveViewId}
            onClose={() => setIsViewMenuOpen(false)}
          />
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          {activeTableId ? (
            <>
              <TableToolbar
                tableId={activeTableId}
                activeViewId={activeViewId}
                onViewChange={setActiveViewId}
                onToggleViewMenu={toggleViewMenu}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchResultCount={searchResults.length}
                currentSearchResultIndex={currentSearchResultIndex}
                onNextSearchResult={handleNextSearchResult}
                onPreviousSearchResult={handlePreviousSearchResult}
                isSearching={isSearching}
              />
              <DataTable
                tableId={activeTableId}
                viewId={activeViewId}
                searchResults={searchResults}
                currentSearchResultIndex={currentSearchResultIndex}
                searchQuery={debouncedSearchQuery}
              />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              {tables?.length
                ? "Select a table to view"
                : "Create a table to get started"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}