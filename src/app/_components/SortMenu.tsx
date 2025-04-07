"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { X, ArrowDown, ArrowUp, Trash } from "lucide-react";

type SortMenuProps = {
  tableId: string;
  onClose: () => void;
};

export default function SortMenu({ tableId, onClose }: SortMenuProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("ASC");

  const { data: columns = [] } = api.column.getColumnsByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  // Fetch active sorts for the table
  const { data: sortOrders = [] } = api.sortOrder.getAllActiveSortsForTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const utils = api.useUtils();

  // Mutations for adding/removing sorts
  const addSort = api.sortOrder.createSortOrder.useMutation({
    onSuccess: () => {
      void utils.sortOrder.getAllActiveSortsForTable.invalidate({ tableId });
      void utils.row.getRowsByTable.invalidate({ tableId });
      setSelectedColumn("");
      setSortDirection("ASC");
    },
  });

  const removeSort = api.sortOrder.updateSortOrder.useMutation({
    onSuccess: () => {
      void utils.sortOrder.getAllActiveSortsForTable.invalidate({ tableId });
    },
  });

  const handleAddSort = () => {
    if (selectedColumn) {
      addSort.mutate({
        columnId: selectedColumn,
        order: sortDirection,
      });
    }
  };

  const handleRemoveSort = (sortOrderId: string) => {
    removeSort.mutate({ id: sortOrderId, isActive: false });
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-72 bg-white border rounded shadow-md z-50">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Sort</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Active Sorts</h4>

          {sortOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No sorts applied</p>
          ) : (
            <ul className="space-y-2">
              {sortOrders.map((sort) => {
                const column = columns.find((col) => col.id === sort.columnId);
                return (
                  <li key={sort.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">{column?.name}</span>
                      {sort.order === "ASC" ? (
                        <ArrowUp size={14} className="text-blue-600" />
                      ) : (
                        <ArrowDown size={14} className="text-blue-600" />
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSort(sort.id)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Sort</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Column</label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full p-2 text-sm border rounded"
                >
                  <option value="">Select column...</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedColumn && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Direction</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSortDirection("ASC")}
                      className={`flex-1 p-2 border rounded flex items-center justify-center ${
                        sortDirection === "ASC" ? "bg-blue-50 border-blue-300" : ""
                      }`}
                    >
                      <ArrowUp size={14} className="mr-1" />
                      Ascending
                    </button>
                    <button
                      onClick={() => setSortDirection("DESC")}
                      className={`flex-1 p-2 border rounded flex items-center justify-center ${
                        sortDirection === "DESC" ? "bg-blue-50 border-blue-300" : ""
                      }`}
                    >
                      <ArrowDown size={14} className="mr-1" />
                      Descending
                    </button>
                  </div>
                </div>
              )}

              {selectedColumn && (
                <button onClick={handleAddSort} className="w-full p-2 bg-blue-600 text-white rounded">
                  Add Sort
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
