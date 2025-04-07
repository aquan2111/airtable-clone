"use client";

import { useState } from 'react';
import { api } from "~/trpc/react";
// --- Import Prisma type for ComparisonFunction ---
import type { ComparisonFunction } from "@prisma/client";
// --------------------------------------------------
import { X, Edit, Trash, EyeOff, SortAsc, SortDesc, Filter } from 'lucide-react';

type ColumnMenuProps = {
  column: {
    id: string;
    name: string;
    type: string; // Should be 'TEXT' | 'NUMBER' based on usage
  };
  tableId: string;
  viewId: string | null;
  onClose: () => void;
  // Keep onOpenFilterMenu as an optional alternative if needed elsewhere,
  // but the primary "Add Filter" button will now use the inline UI.
  onOpenFilterMenu?: (columnId: string) => void;
};

export default function ColumnMenu({
  column,
  tableId,
  viewId,
  onClose,
  onOpenFilterMenu // Keep prop if needed for other triggers
}: ColumnMenuProps) {
  // --- State Variables ---
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [columnType, setColumnType] = useState(column.type);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // State for inline filter creation
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterComparisonFunc, setNewFilterComparisonFunc] = useState<ComparisonFunction>("EQUALS");
  const [newFilterValue, setNewFilterValue] = useState("");
  const [addFilterError, setAddFilterError] = useState<string | null>(null); // Optional: Error state for filter add
  // --------------------

  const utils = api.useUtils();

  // --- tRPC Mutations ---

  // Update Column
  const updateColumn = api.column.updateColumn.useMutation({
     onSuccess: () => {
       void utils.column.getColumnsByTable.invalidate({ tableId });
       setIsEditing(false);
       setUpdateError(null);
     },
     onError: (error) => {
        if (error.message === "Cannot convert to NUMBER type: Column contains non-numeric values") {
            setUpdateError("Cannot change type to Number: Column contains text values that cannot be converted.");
        } else {
            setUpdateError("Failed to update column. Please try again.");
            console.error("Update column error:", error);
        }
     }
  });

  // Delete Column
  const deleteColumn = api.column.deleteColumn.useMutation({
    onSuccess: () => {
      void utils.column.getColumnsByTable.invalidate({ tableId });
      void utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({ tableId });
      void utils.filter.getAllActiveFiltersForTable.invalidate({ tableId }); // Invalidate filters too
      void utils.sortOrder.getAllActiveSortsForTable.invalidate({ tableId }); // Invalidate sorts if needed
      void utils.row.getRowsByTable.invalidate({ tableId });
      onClose();
    },
    onError: (error) => {
        console.error("Delete column error:", error);
        // Add user feedback if needed
    }
  });

  // Add Sort Order
  const addSort = api.sortOrder.createSortOrder.useMutation({
    onSuccess: () => {
      if (viewId) {
        void utils.row.getRowsByTable.invalidate({ tableId });
      }
      onClose(); // Close menu after sorting
    },
    onError: (error) => {
        console.error("Add sort error:", error);
        // Add user feedback if needed
    }
  });

  // Add Filter (Updated onSuccess)
  const addFilter = api.filter.createFilter.useMutation({
    onSuccess: () => {
        void utils.filter.getAllActiveFiltersForTable.invalidate({ tableId });
        void utils.row.getRowsByTable.invalidate({ tableId });
        // Reset state and close the filter UI within ColumnMenu
        setIsAddingFilter(false);
        setNewFilterComparisonFunc("EQUALS");
        setNewFilterValue("");
        setAddFilterError(null); // Clear filter error on success
        // Keep menu open after adding filter
        // onClose();
    },
    onError: (error) => {
        console.error("Failed to add filter:", error);
        setAddFilterError("Failed to add filter. Please try again."); // Set error state
    }
  });

  // Hide Column
  const hideColumnMutation = api.hiddenColumn.createHiddenColumn.useMutation({
    onSuccess: () => {
      void utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({ tableId });
      void utils.row.getRowsByTable.invalidate({ tableId });
      onClose(); // Close the menu after successful hiding
    },
    onError: (error) => {
      console.error("Failed to hide column:", error);
      // Add user feedback if needed
    }
  });
  // --- End tRPC Mutations ---


  // --- Handler Functions ---

  // Update Column Handler
  const handleUpdateColumn = () => {
      setUpdateError(null);
      void updateColumn.mutate({ id: column.id, name: columnName, type: columnType as "TEXT" | "NUMBER" });
  };

  // Delete Column Handler
  const handleDeleteColumn = () => {
      const confirmDelete = window.confirm("Are you sure you want to delete this column? All associated data will be lost.");
      if (confirmDelete) {
        void deleteColumn.mutate({ id: column.id });
      }
  };

  // Sort Handlers
  const handleSortAsc = () => {
      if (viewId) { void addSort.mutate({ columnId: column.id, order: "ASC" }); }
      else { console.warn("Cannot sort: viewId not available."); onClose(); }
  };
  const handleSortDesc = () => {
       if (viewId) { void addSort.mutate({ columnId: column.id, order: "DESC" }); }
       else { console.warn("Cannot sort: viewId not available."); onClose(); }
  };

  // Toggle Inline Filter UI Handler
  const handleAddFilter = () => {
    // Reset state when opening the filter UI
    setNewFilterComparisonFunc("EQUALS");
    setNewFilterValue("");
    setAddFilterError(null); // Clear any previous filter error
    setIsAddingFilter(true); // Show the filter inputs
    setIsEditing(false); // Ensure edit mode is off
  };

  // Save New Filter Handler
  const handleSaveNewFilter = () => {
      setAddFilterError(null); // Clear previous error
      const needsValue = !["IS_EMPTY", "IS_NOT_EMPTY"].includes(newFilterComparisonFunc);

      if (needsValue && !newFilterValue.trim()) {
         setAddFilterError("Please enter a value for the filter.");
         return; // Stop if validation fails
      }

      addFilter.mutate({
        columnId: column.id,
        comparisonFunction: newFilterComparisonFunc,
        comparisonValue: needsValue ? newFilterValue : "",
      });
  };

  // Hide Column Handler
  const handleHideColumn = () => {
    hideColumnMutation.mutate({
        columnId: column.id,
        tableId: tableId,
    });
  };
  // --- End Handler Functions ---


  // --- Determine Menu Title ---
  const getMenuTitle = () => {
      if (isAddingFilter) return `Filter by ${column.name}`;
      if (isEditing) return `Edit ${column.name}`;
      return 'Column Menu';
  }
  // --- End Menu Title ---


  // --- JSX Return ---
  return (
    <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-20 w-64"> {/* Increased z-index slightly */}
      {/* Header */}
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="font-medium text-sm">{getMenuTitle()}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close menu">
          <X size={14} />
        </button>
      </div>

      {/* --- Conditional Content --- */}
      {isAddingFilter ? (
        // ----- UI for Adding a Filter -----
        <div className="p-3 space-y-3">
           <div>
              <label htmlFor={`comparison-${column.id}`} className="block text-xs text-gray-500 mb-1">Comparison</label>
              <select
                  id={`comparison-${column.id}`}
                  value={newFilterComparisonFunc}
                  onChange={(e) => setNewFilterComparisonFunc(e.target.value as ComparisonFunction)}
                  className="w-full p-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={addFilter.isPending}
              >
                  <option value="EQUALS">Equals</option>
                  <option value="NOT_EQUALS">Not Equals</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="NOT_CONTAINS">Not Contains</option>
                  {column.type === 'NUMBER' && (
                    <>
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                      <option value="GREATER_THAN_OR_EQUAL">Greater Than Or Equal</option>
                      <option value="LESS_THAN_OR_EQUAL">Less Than Or Equal</option>
                    </>
                  )}
                  <option value="IS_EMPTY">Is Empty</option>
                  <option value="IS_NOT_EMPTY">Is Not Empty</option>
              </select>
           </div>

           {!["IS_EMPTY", "IS_NOT_EMPTY"].includes(newFilterComparisonFunc) && (
              <div>
                  <label htmlFor={`value-${column.id}`} className="block text-xs text-gray-500 mb-1">Value</label>
                  <input
                      id={`value-${column.id}`}
                      type={column.type === 'NUMBER' ? 'number' : 'text'}
                      value={newFilterValue}
                      onChange={(e) => setNewFilterValue(e.target.value)}
                      className="w-full p-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter filter value..."
                      disabled={addFilter.isPending}
                      aria-describedby={addFilterError ? `filter-error-${column.id}` : undefined}
                  />
              </div>
            )}

           {/* Filter Error Display */}
           {addFilterError && (
                <p id={`filter-error-${column.id}`} className="text-xs text-red-600">{addFilterError}</p>
           )}

           <div className="flex justify-end space-x-2 pt-1">
              <button
                 type="button"
                 onClick={() => { setIsAddingFilter(false); setAddFilterError(null); } } // Go back to main menu, clear error
                 className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                 disabled={addFilter.isPending}
              >
                 Cancel
              </button>
              <button
                 type="button"
                 onClick={handleSaveNewFilter}
                 className={`px-3 py-1 text-sm bg-blue-600 text-white rounded ${addFilter.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                 disabled={addFilter.isPending}
              >
                 {addFilter.isPending ? "Adding..." : "Add Filter"}
              </button>
           </div>
        </div> // End isAddingFilter view

      ) : isEditing ? (
         // ----- Editing View -----
         <div className="p-3">
             <div>
                 <label htmlFor={`edit-name-${column.id}`} className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                 <input id={`edit-name-${column.id}`} type="text" value={columnName} onChange={(e) => setColumnName(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
             </div>
             <div className="mt-3">
                 <label htmlFor={`edit-type-${column.id}`} className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                 <select id={`edit-type-${column.id}`} value={columnType} onChange={(e) => setColumnType(e.target.value)} className="w-full p-2 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                     <option value="TEXT">Text</option>
                     <option value="NUMBER">Number</option>
                 </select>
             </div>
             {updateError && ( <p className="text-sm text-red-600 mt-2 mb-2">{updateError}</p> )}
             <div className="flex justify-end space-x-2 mt-4">
                 <button type="button" onClick={() => { setIsEditing(false); setUpdateError(null); setColumnName(column.name); setColumnType(column.type); }} className="px-3 py-1 text-sm border rounded hover:bg-gray-50" disabled={updateColumn.isPending}> Cancel </button>
                 <button type="button" onClick={handleUpdateColumn} className={`px-3 py-1 text-sm bg-blue-600 text-white rounded ${updateColumn.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`} disabled={updateColumn.isPending}> {updateColumn.isPending ? "Saving..." : "Save"} </button>
             </div>
         </div> // End isEditing view

      ) : (
         // ----- Normal View (Menu Options) -----
         <div className="py-1">
            <button type="button" onClick={() => { setIsEditing(true); setIsAddingFilter(false); setUpdateError(null); setColumnName(column.name); setColumnType(column.type); }} className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"> <Edit size={14} className="mr-2" /> Edit Column </button>
            <button type="button" onClick={handleSortAsc} className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100" disabled={!viewId || addSort.isPending}> <SortAsc size={14} className="mr-2" /> Sort Ascending </button>
            <button type="button" onClick={handleSortDesc} className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100" disabled={!viewId || addSort.isPending}> <SortDesc size={14} className="mr-2" /> Sort Descending </button>
            <button type="button" onClick={handleAddFilter} className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100" disabled={addFilter.isPending}> <Filter size={14} className="mr-2" /> Add Filter </button>
            <button type="button" onClick={handleHideColumn} className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100" disabled={hideColumnMutation.isPending}> <EyeOff size={14} className="mr-2" /> {hideColumnMutation.isPending ? "Hiding..." : "Hide Column"} </button>
            <hr className="my-1" />
            <button type="button" onClick={handleDeleteColumn} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100" disabled={deleteColumn.isPending}> <Trash size={14} className="mr-2" /> {deleteColumn.isPending ? "Deleting..." : "Delete Column"} </button>
         </div> // End Normal view
      )}
      {/* --- End Conditional Content --- */}
    </div> // End main wrapper
  );
}