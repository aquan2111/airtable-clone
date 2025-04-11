"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { X, Edit, Trash, Plus, Save } from "lucide-react";

type ViewMenuProps = {
  tableId: string;
  activeViewId: string | null;
  onViewChange: (viewId: string) => void;
  onClose: () => void;
};

export default function ViewMenu({
  tableId,
  activeViewId,
  onViewChange,
  onClose,
}: ViewMenuProps) {
  const [newViewName, setNewViewName] = useState("");
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState("");

  const utils = api.useUtils();

  // Fetch all views for the table
  const { data: views = [], isLoading: isViewsLoading } =
    api.view.getViewsByTable.useQuery({ tableId });

  // --- NEW: Fetch ALL configurations for the table ---
  const { data: allTableFilters = [] } =
    api.filter.getAllFiltersForTable.useQuery({ tableId }); // Assuming this endpoint exists
  const { data: allTableSorts = [] } =
    api.sortOrder.getAllSortsForTable.useQuery({ tableId }); // Assuming this endpoint exists
  const { data: allTableHiddenColumns = [] } =
    api.hiddenColumn.getAllHiddenColumnsForTable.useQuery({ tableId }); // Assuming this endpoint exists
  // --- Keep fetching active ones for create/save ---
  const { data: currentActiveFilters = [] } =
    api.filter.getAllActiveFiltersForTable.useQuery({ tableId });
  const { data: currentActiveSorts = [] } =
    api.sortOrder.getAllActiveSortsForTable.useQuery({ tableId });
  const { data: currentActiveHiddenColumns = [] } =
    api.hiddenColumn.getAllActiveHiddenColumnsForTable.useQuery({ tableId });

  // Mutations for view operations
  const createView = api.view.createView.useMutation();
  const updateView = api.view.updateView.useMutation();
  const deleteView = api.view.deleteView.useMutation();

  // Mutations for view configurations
  const addFilterToView = api.viewFilter.addFilterToView.useMutation();
  const removeFilterFromView =
    api.viewFilter.removeFilterFromView.useMutation();
  const addSortToView = api.viewSort.addSortToView.useMutation();
  const removeSortFromView = api.viewSort.removeSortFromView.useMutation();
  const addHiddenColumnToView =
    api.viewHiddenColumn.addHiddenColumnToView.useMutation();
  const removeHiddenColumnFromView =
    api.viewHiddenColumn.removeHiddenColumnFromView.useMutation();

  // Mutations for updating active states
  const updateFilterMutation = api.filter.updateFilter.useMutation();
  const updateSortOrderMutation = api.sortOrder.updateSortOrder.useMutation();
  const updateHiddenColumnMutation =
    api.hiddenColumn.updateHiddenColumn.useMutation();
  const setActiveViewMutation = api.table.setActiveView.useMutation();

  // Determine if a view is the default view
  const isDefaultView = (viewId: string | null): boolean => {
    if (!viewId) return false; // Handle null case explicitly
    const view = views.find((v) => v.id === viewId);
    return view?.isDefault ?? false; // Default to false if view not found
  };

  // Synchronize the table's state with the selected view
  const syncViewStateWithTable = useCallback(
    async (viewId: string) => {
      if (!viewId) return;

      try {
        // Use prefetch or fetch here - fetch might be safer if data can be stale
        const viewData = await utils.view.getViewById.fetch({ id: viewId });
        if (!viewData) {
          console.error(`View data not found for ID: ${viewId}`);
          return;
        }

        // Create Sets for efficient lookup of which configs belong to the view
        const targetFilterIds = new Set(
          (viewData.filters ?? []).map((vf) => vf.filterId),
        );
        const targetSortIds = new Set(
          (viewData.sorts ?? []).map((vs) => vs.sortOrderId),
        );
        const targetHiddenColumnIds = new Set(
          (viewData.hidden ?? []).map((vh) => vh.hiddenColumnId),
        );

        const updatePromises = [];

        // Update Filters
        for (const tableFilter of allTableFilters) {
          const shouldBeActive = targetFilterIds.has(tableFilter.id);
          // Optimization: Only mutate if the state needs changing (Optional)
          // const currentFilterState = currentActiveFilters.find(f => f.id === tableFilter.id)?.isActive ?? false;
          // if (shouldBeActive !== currentFilterState) {
          updatePromises.push(
            updateFilterMutation.mutateAsync({
              id: tableFilter.id,
              // Use the comparisonValue from the actual filter definition
              comparisonValue: tableFilter.comparisonValue ?? "",
              isActive: shouldBeActive,
            }),
          );
          // }
        }

        // Update Sorts
        for (const tableSort of allTableSorts) {
          const shouldBeActive = targetSortIds.has(tableSort.id);
          updatePromises.push(
            updateSortOrderMutation.mutateAsync({
              id: tableSort.id,
              isActive: shouldBeActive,
            }),
          );
        }

        // Update Hidden Columns
        for (const tableHiddenCol of allTableHiddenColumns) {
          const shouldBeActive = targetHiddenColumnIds.has(tableHiddenCol.id);
          updatePromises.push(
            updateHiddenColumnMutation.mutateAsync({
              id: tableHiddenCol.id,
              isActive: shouldBeActive,
            }),
          );
        }

        await Promise.all(updatePromises);

        // It's crucial to invalidate the *active* state queries
        await utils.filter.getAllActiveFiltersForTable.invalidate({ tableId });
        await utils.sortOrder.getAllActiveSortsForTable.invalidate({ tableId });
        await utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({
          tableId,
        });
        // Also invalidate the table data itself if filtering/sorting/hiding affects it directly
        await utils.table.getTableById.invalidate({ id: tableId }); // Example: Adjust if your table data query is different
      } catch (error) {
        console.error(
          "Error syncing view state:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    [
      tableId,
      allTableFilters,
      allTableSorts,
      allTableHiddenColumns,
      utils,
      updateFilterMutation,
      updateSortOrderMutation,
      updateHiddenColumnMutation,
    ],
  );

  // Handle view change
  const handleViewChange = async (viewId: string) => {
    onViewChange(viewId);
    await setActiveViewMutation.mutateAsync({ tableId, viewId });
    await syncViewStateWithTable(viewId);
  };

  // Handle creating a new view
  const handleCreateView = () => {
    if (newViewName.trim()) {
      createView.mutate(
        {
          tableId,
          name: newViewName.trim(),
          isDefault: false,
        },
        {
          onSuccess: (newView) => {
            // Associate the CURRENTLY ACTIVE filters/sorts/hidden with the NEW view
            void (async () => {
              try {
                await Promise.all([
                  // Use current *active* state here - this is correct for saving the *current* setup
                  ...currentActiveFilters.map((filter) =>
                    addFilterToView.mutateAsync({
                      viewId: newView.id,
                      filterId: filter.id,
                    }),
                  ),
                  ...currentActiveSorts.map((sort) =>
                    addSortToView.mutateAsync({
                      viewId: newView.id,
                      sortOrderId: sort.id,
                    }),
                  ),
                  ...currentActiveHiddenColumns.map((column) =>
                    addHiddenColumnToView.mutateAsync({
                      viewId: newView.id,
                      hiddenColumnId: column.id,
                    }),
                  ),
                ]);

                // Invalidate the list of views
                await utils.view.getViewsByTable.invalidate({ tableId });
                // Invalidate the specific view data in case we need it later
                await utils.view.getViewById.invalidate({ id: newView.id });

                setNewViewName("");
                // Switch to the newly created view
                void handleViewChange(newView.id);
              } catch (error) {
                console.error("Error associating state with new view:", error);
              }
            })();
          },
          onError: (error) => {
            console.error("Error creating view:", error);
          },
        },
      );
    }
  };

  // Handle saving the current state to the active view
  const handleSaveView = async () => {
    // Ensure there is an active view and it's not the default one
    if (!activeViewId || isDefaultView(activeViewId)) return;

    try {
      //    Using prefetch/fetch ensures we have the latest associations before removing them.
      const viewData = await utils.view.getViewById.fetch({ id: activeViewId });
      if (!viewData) {
        console.error(
          `View data not found for ID: ${activeViewId} during save.`,
        );
        return;
      }

      const removePromises = [
        ...(viewData.filters ?? []).map((f) =>
          removeFilterFromView.mutateAsync({
            viewId: activeViewId,
            filterId: f.filterId,
          }),
        ),
        ...(viewData.sorts ?? []).map((s) =>
          removeSortFromView.mutateAsync({
            viewId: activeViewId,
            sortOrderId: s.sortOrderId,
          }),
        ),
        ...(viewData.hidden ?? []).map((h) =>
          removeHiddenColumnFromView.mutateAsync({
            viewId: activeViewId,
            hiddenColumnId: h.hiddenColumnId,
          }),
        ),
      ];
      await Promise.all(removePromises);

      const addPromises = [
        // Use the current *active* state, as that's what the user wants to save
        ...currentActiveFilters.map((f) =>
          addFilterToView.mutateAsync({ viewId: activeViewId, filterId: f.id }),
        ),
        ...currentActiveSorts.map((s) =>
          addSortToView.mutateAsync({
            viewId: activeViewId,
            sortOrderId: s.id,
          }),
        ),
        ...currentActiveHiddenColumns.map((h) =>
          addHiddenColumnToView.mutateAsync({
            viewId: activeViewId,
            hiddenColumnId: h.id,
          }),
        ),
      ];
      await Promise.all(addPromises);

      await utils.view.getViewsByTable.invalidate({ tableId }); // Refresh list if needed
      await utils.view.getViewById.invalidate({ id: activeViewId }); // Refresh specific view data

      // Maybe add some user feedback (e.g., a toast notification)
      console.log("View saved successfully");
    } catch (err) {
      console.error("Error saving view:", err);
    }
  };

  const handleRename = (viewId: string) => {
    if (!editingViewName.trim() || isDefaultView(viewId)) return; // Prevent renaming default view
    updateView.mutate(
      {
        id: viewId,
        name: editingViewName.trim(),
      },
      {
        onSuccess: () => {
          void utils.view.getViewsByTable.invalidate({ tableId });
          void utils.view.getViewById.invalidate({ id: viewId });
          setEditingViewId(null);
          setEditingViewName("");
        },
        onError: (error) => {
          console.error("Error renaming view:", error);
          // Revert state or provide feedback
          setEditingViewId(null); // Exit editing mode even on error
        },
      },
    );
  };

  const handleDelete = (viewId: string) => {
    if (isDefaultView(viewId)) return; // Prevent deleting default view

    // Find a fallback view *before* deleting
    const fallbackView =
      views.find((v) => v.id !== viewId && v.isDefault) ??
      views.find((v) => v.id !== viewId);

    deleteView.mutate(
      { id: viewId },
      {
        onSuccess: () => {
          // Invalidate view list
          void utils.view.getViewsByTable.invalidate({ tableId });
          // Clear specific view cache
          void utils.view.getViewById.invalidate({ id: viewId });

          // If the deleted view was active, switch to a fallback (preferably default)
          if (activeViewId === viewId) {
            if (fallbackView) {
              void handleViewChange(fallbackView.id);
            } else {
              // Handle edge case: no views left (shouldn't happen if default always exists)
              onViewChange(""); // Or handle appropriately
              console.warn("Deleted the last view?");
            }
          }
        },
        onError: (error) => {
          console.error("Error deleting view:", error);
        },
      },
    );
  };

  // --- Render logic remains largely the same ---
  // Added padding, margins for better spacing. Added focus styles.
  return (
    <div className="flex h-full w-64 flex-col border-r bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">Views</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          aria-label="Close views menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* View List */}
      <div className="mb-4 flex-grow space-y-1 overflow-y-auto pr-1">
        {isViewsLoading ? (
          <div className="py-2 text-center text-sm text-gray-500">
            Loading views...
          </div>
        ) : (
          views.map((view) => (
            <div
              key={view.id}
              className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm ${
                activeViewId === view.id
                  ? "bg-blue-100 font-medium text-blue-800"
                  : "cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
              onClick={() =>
                editingViewId !== view.id && handleViewChange(view.id)
              } // Prevent click during edit
            >
              {editingViewId === view.id ? (
                <input
                  type="text"
                  className="mr-1 flex-grow rounded border border-blue-300 px-1 py-0.5 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={editingViewName}
                  onChange={(e) => setEditingViewName(e.target.value)}
                  onBlur={() => handleRename(view.id)} // Save on blur
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(view.id);
                    if (e.key === "Escape") {
                      setEditingViewId(null); // Cancel edit on escape
                      setEditingViewName("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent view change click
                  autoFocus
                />
              ) : (
                <span className="truncate" title={view.name}>
                  {view.name}
                  {view.isDefault ? " (Default)" : ""}
                </span>
              )}

              {!view.isDefault && editingViewId !== view.id && (
                <div className="flex flex-shrink-0 items-center gap-2 pl-2 opacity-0 group-hover:opacity-100">
                  <button
                    title="Rename View"
                    className="rounded text-gray-500 hover:text-blue-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingViewId(view.id);
                      setEditingViewName(view.name);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    title="Delete View"
                    className="rounded text-gray-500 hover:text-red-600 focus:ring-1 focus:ring-red-400 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Are you sure you want to delete the view "${view.name}"?`,
                        )
                      ) {
                        handleDelete(view.id);
                      }
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
