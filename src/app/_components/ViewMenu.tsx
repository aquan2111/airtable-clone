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
  const { data: views = [] } = api.view.getViewsByTable.useQuery({ tableId });

  // --- NEW: Fetch ALL configurations for the table ---
  const { data: allTableFilters = [] } = api.filter.getAllFiltersForTable.useQuery({ tableId }); // Assuming this endpoint exists
  const { data: allTableSorts = [] } = api.sortOrder.getAllSortsForTable.useQuery({ tableId }); // Assuming this endpoint exists
  const { data: allTableHiddenColumns = [] } = api.hiddenColumn.getAllHiddenColumnsForTable.useQuery({ tableId }); // Assuming this endpoint exists
  // --- Keep fetching active ones for create/save ---
  const { data: currentActiveFilters = [] } = api.filter.getAllActiveFiltersForTable.useQuery({ tableId });
  const { data: currentActiveSorts = [] } = api.sortOrder.getAllActiveSortsForTable.useQuery({ tableId });
  const { data: currentActiveHiddenColumns = [] } = api.hiddenColumn.getAllActiveHiddenColumnsForTable.useQuery({ tableId });


  // Mutations for view operations
  const createView = api.view.createView.useMutation();
  const updateView = api.view.updateView.useMutation();
  const deleteView = api.view.deleteView.useMutation();

  // Mutations for view configurations
  const addFilterToView = api.viewFilter.addFilterToView.useMutation();
  const removeFilterFromView = api.viewFilter.removeFilterFromView.useMutation();
  const addSortToView = api.viewSort.addSortToView.useMutation();
  const removeSortFromView = api.viewSort.removeSortFromView.useMutation();
  const addHiddenColumnToView = api.viewHiddenColumn.addHiddenColumnToView.useMutation();
  const removeHiddenColumnFromView = api.viewHiddenColumn.removeHiddenColumnFromView.useMutation();

  // Mutations for updating active states
  const updateFilterMutation = api.filter.updateFilter.useMutation();
  const updateSortOrderMutation = api.sortOrder.updateSortOrder.useMutation();
  const updateHiddenColumnMutation = api.hiddenColumn.updateHiddenColumn.useMutation();
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
        // 1. Fetch the selected view's configurations
        // Use prefetch or fetch here - fetch might be safer if data can be stale
        const viewData = await utils.view.getViewById.fetch({ id: viewId });
        if (!viewData) {
          console.error(`View data not found for ID: ${viewId}`);
          return;
        }

        // Create Sets for efficient lookup of which configs belong to the view
        const targetFilterIds = new Set(
          (viewData.filters ?? []).map((vf) => vf.filterId)
        );
        const targetSortIds = new Set(
          (viewData.sorts ?? []).map((vs) => vs.sortOrderId)
        );
        const targetHiddenColumnIds = new Set(
          (viewData.hidden ?? []).map((vh) => vh.hiddenColumnId)
        );

        // 2. Iterate through ALL table configurations and set their state
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
               })
             );
          // }
        }

        // Update Sorts
        for (const tableSort of allTableSorts) {
          const shouldBeActive = targetSortIds.has(tableSort.id);
           // Optimization: Only mutate if the state needs changing (Optional)
          // const currentSortState = currentActiveSorts.find(s => s.id === tableSort.id)?.isActive ?? false;
          // if (shouldBeActive !== currentSortState) {
             updatePromises.push(
               updateSortOrderMutation.mutateAsync({
                 id: tableSort.id,
                 isActive: shouldBeActive,
               })
             );
          // }
        }

        // Update Hidden Columns
        for (const tableHiddenCol of allTableHiddenColumns) {
          const shouldBeActive = targetHiddenColumnIds.has(tableHiddenCol.id);
          // Optimization: Only mutate if the state needs changing (Optional)
          // const currentHiddenColState = currentActiveHiddenColumns.find(h => h.id === tableHiddenCol.id)?.isActive ?? false;
          // if (shouldBeActive !== currentHiddenColState) {
              updatePromises.push(
                updateHiddenColumnMutation.mutateAsync({
                  id: tableHiddenCol.id,
                  isActive: shouldBeActive,
                })
              );
          // }
        }

        // 3. Wait for all updates to complete
        await Promise.all(updatePromises);

        // 4. Invalidate queries to refresh the UI data reflecting the new active state
        // It's crucial to invalidate the *active* state queries
        await utils.filter.getAllActiveFiltersForTable.invalidate({ tableId });
        await utils.sortOrder.getAllActiveSortsForTable.invalidate({ tableId });
        await utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({ tableId });
        // Also invalidate the table data itself if filtering/sorting/hiding affects it directly
        await utils.table.getTableById.invalidate({ id: tableId }); // Example: Adjust if your table data query is different

      } catch (error) {
        console.error(
          "Error syncing view state:",
          error instanceof Error ? error.message : String(error)
        );
      }
    },
    [
      tableId,
      // Depend on ALL table configurations now
      allTableFilters,
      allTableSorts,
      allTableHiddenColumns,
      // Keep mutations and utils
      utils,
      updateFilterMutation,
      updateSortOrderMutation,
      updateHiddenColumnMutation,
      // Keep active states only if using the optimization check (commented out above)
      // currentActiveFilters,
      // currentActiveSorts,
      // currentActiveHiddenColumns,
    ]
  );

  // Handle view change
  const handleViewChange = async (viewId: string) => {
    // Optimistic update for UI responsiveness (optional)
    onViewChange(viewId);

    // Update active view in DB *before* syncing state
    // If sync fails, the DB might be slightly ahead, but UI should reflect reality after invalidation.
    // Alternatively, put this after syncViewStateWithTable completes successfully.
    await setActiveViewMutation.mutateAsync({ tableId, viewId });

    // Apply the view's settings to the table's active state
    await syncViewStateWithTable(viewId);

    // Invalidation is now handled inside syncViewStateWithTable
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
                    })
                  ),
                  ...currentActiveSorts.map((sort) =>
                    addSortToView.mutateAsync({
                      viewId: newView.id,
                      sortOrderId: sort.id,
                    })
                  ),
                  ...currentActiveHiddenColumns.map((column) =>
                    addHiddenColumnToView.mutateAsync({
                      viewId: newView.id,
                      hiddenColumnId: column.id,
                    })
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
          }
        }
      );
    }
  };

   // Handle saving the current state to the active view
   const handleSaveView = async () => {
        // Ensure there is an active view and it's not the default one
        if (!activeViewId || isDefaultView(activeViewId)) return;

        try {
            // 1. Fetch the current configuration links for the active view
            //    Using prefetch/fetch ensures we have the latest associations before removing them.
            const viewData = await utils.view.getViewById.fetch({ id: activeViewId });
            if (!viewData) {
                console.error(`View data not found for ID: ${activeViewId} during save.`);
                return;
            }

            // 2. Remove all existing configuration links from the active view
            const removePromises = [
                ...(viewData.filters ?? []).map((f) =>
                    removeFilterFromView.mutateAsync({ viewId: activeViewId, filterId: f.filterId })
                ),
                ...(viewData.sorts ?? []).map((s) =>
                    removeSortFromView.mutateAsync({ viewId: activeViewId, sortOrderId: s.sortOrderId })
                ),
                ...(viewData.hidden ?? []).map((h) =>
                    removeHiddenColumnFromView.mutateAsync({
                        viewId: activeViewId,
                        hiddenColumnId: h.hiddenColumnId,
                    })
                ),
            ];
            await Promise.all(removePromises);

            // 3. Add links for the CURRENTLY ACTIVE table configurations to the active view
            const addPromises = [
                // Use the current *active* state, as that's what the user wants to save
                ...currentActiveFilters.map((f) =>
                    addFilterToView.mutateAsync({ viewId: activeViewId, filterId: f.id })
                ),
                ...currentActiveSorts.map((s) =>
                    addSortToView.mutateAsync({ viewId: activeViewId, sortOrderId: s.id })
                ),
                ...currentActiveHiddenColumns.map((h) =>
                    addHiddenColumnToView.mutateAsync({ viewId: activeViewId, hiddenColumnId: h.id })
                ),
            ];
            await Promise.all(addPromises);

            // 4. Invalidate relevant view data cache
            await utils.view.getViewsByTable.invalidate({ tableId }); // Refresh list if needed
            await utils.view.getViewById.invalidate({ id: activeViewId }); // Refresh specific view data

            // Maybe add some user feedback (e.g., a toast notification)
            console.log("View saved successfully");

        } catch (err) {
            console.error("Error saving view:", err);
            // Add user feedback for error
        }
    };


  const handleRename = (viewId: string) => {
    if (!editingViewName.trim() || isDefaultView(viewId)) return; // Prevent renaming default view
    updateView.mutate({
      id: viewId,
      name: editingViewName.trim(),
    }, {
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
        }
    });

  };

  const handleDelete = (viewId: string) => {
    if (isDefaultView(viewId)) return; // Prevent deleting default view

    // Find a fallback view *before* deleting
    const fallbackView = views.find((v) => v.id !== viewId && v.isDefault) ?? views.find((v) => v.id !== viewId);

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
        }
      }
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
          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Close views menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* View List */}
      <div className="mb-4 flex-grow space-y-1 overflow-y-auto pr-1"> {/* Added pr-1 for scrollbar */}
        {views.map((view) => (
          <div
            key={view.id}
            className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm ${
              activeViewId === view.id
                ? "bg-blue-100 font-medium text-blue-800"
                : "cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            }`}
            onClick={() => editingViewId !== view.id && handleViewChange(view.id) } // Prevent click during edit
          >
            {editingViewId === view.id ? (
              <input
                type="text"
                className="mr-1 flex-grow rounded border border-blue-300 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                autoFocus // Focus the input when it appears
              />
            ) : (
              <span className="truncate" title={view.name}>{view.name}{view.isDefault ? " (Default)" : ""}</span>
            )}

            {/* Actions only show for non-default views and not during edit */}
            {!view.isDefault && editingViewId !== view.id && (
              <div className="flex flex-shrink-0 items-center gap-2 pl-2 opacity-0 group-hover:opacity-100">
                <button
                    title="Rename View"
                    className="rounded text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent view change
                        setEditingViewId(view.id);
                        setEditingViewName(view.name);
                    }}
                >
                    <Edit className="h-4 w-4" />
                </button>
                <button
                    title="Delete View"
                    className="rounded text-gray-500 hover:text-red-600 focus:outline-none focus:ring-1 focus:ring-red-400"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent view change
                        if (window.confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
                           handleDelete(view.id);
                        }
                    }}
                 >
                   <Trash className="h-4 w-4" />
                 </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Save Actions */}
      <div className="mt-auto space-y-3 border-t pt-3">
        {/* Create New View */}
        <div className="flex items-center gap-2">
          <input
            className="flex-grow rounded border border-gray-300 px-2 py-1 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="New view name"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateView(); }}
          />
          <button
            onClick={handleCreateView}
            disabled={!newViewName.trim()}
            className="rounded p-1 text-green-600 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
            title="Create New View"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Save Current View */}
        <button
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-70"
          onClick={handleSaveView}
          // Disable if no view is active OR if the active view is the default view
          disabled={!activeViewId || isDefaultView(activeViewId)}
          title={isDefaultView(activeViewId) ? "Cannot overwrite the default view" : "Save current filters, sorts, and hidden columns to this view"}
        >
          <Save className="h-4 w-4" />
          Save Current View
        </button>
      </div>
    </div>
  );
}