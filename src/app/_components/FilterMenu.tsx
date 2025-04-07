"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { X, Trash } from "lucide-react";
import type { ComparisonFunction } from "@prisma/client";

type FilterMenuProps = {
  tableId: string;
  onClose: () => void;
};

export default function FilterMenu({ tableId, onClose }: FilterMenuProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [comparisonFunction, setComparisonFunction] = useState<ComparisonFunction>("EQUALS");
  const [comparisonValue, setComparisonValue] = useState<string>("");

  const { data: columns = [] } = api.column.getColumnsByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const { data: filters = [] } = api.filter.getAllActiveFiltersForTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const utils = api.useUtils();

  const addFilter = api.filter.createFilter.useMutation({
    onSuccess: () => {
      void utils.filter.getAllActiveFiltersForTable.invalidate({ tableId });
      void utils.row.getRowsByTable.invalidate({ tableId });
      setSelectedColumn("");
      setComparisonFunction("EQUALS");
      setComparisonValue("");
    },
  });

  const removeFilter = api.filter.updateFilter.useMutation({
    onSuccess: () => {
      void utils.filter.getAllActiveFiltersForTable.invalidate({ tableId });
    },
  });

  const handleAddFilter = () => {
    if (selectedColumn && comparisonValue) {
      addFilter.mutate({
        columnId: selectedColumn,
        comparisonFunction,
        comparisonValue,
      });
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    removeFilter.mutate({ id: filterId, isActive: false });
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-72 bg-white border rounded shadow-md z-50">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Filter</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Active Filters</h4>

          {filters.length === 0 ? (
            <p className="text-sm text-gray-500">No filters applied</p>
          ) : (
            <ul className="space-y-2">
              {filters.map((filter) => {
                const column = columns.find((col) => col.id === filter.columnId);
                return (
                  <li
                    key={filter.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{column?.name}</span>
                      <span className="text-gray-600 text-xs">
                        {filter.comparisonFunction} &quot;{filter.comparisonValue}&quot;
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Filter</h4>

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
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Comparison</label>
                    <select
                      value={comparisonFunction}
                      onChange={(e) =>
                        setComparisonFunction(e.target.value as ComparisonFunction)
                      }
                      className="w-full p-2 text-sm border rounded"
                    >
                      <option value="EQUALS">Equals</option>
                      <option value="NOT_EQUALS">Not Equals</option>
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                      <option value="GREATER_THAN_OR_EQUAL">Greater Than Or Equal</option>
                      <option value="LESS_THAN_OR_EQUAL">Less Than Or Equal</option>
                      <option value="CONTAINS">Contains</option>
                      <option value="NOT_CONTAINS">Not Contains</option>
                      <option value="IS_EMPTY">Is Empty</option>
                      <option value="IS_NOT_EMPTY">Is Not Empty</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <input
                      type="text"
                      value={comparisonValue}
                      onChange={(e) => setComparisonValue(e.target.value)}
                      className="w-full p-2 text-sm border rounded"
                      placeholder="Enter value..."
                    />
                  </div>

                  <button
                    onClick={handleAddFilter}
                    className="w-full p-2 bg-blue-600 text-white rounded"
                  >
                    Add Filter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
