import { Plus } from "lucide-react";
import type { TableToolbarProps } from "./types";

export function TableToolbar({
  onAddColumn,
  onAddRow,
  globalFilter,
  onGlobalFilterChange,
}: TableToolbarProps): React.ReactNode {
  return (
    <div>
      <div className="mb-4 flex items-center space-x-4">
        {/* Add column button */}
        <button
          className="flex cursor-pointer items-center rounded bg-blue-500 px-3 py-2 text-white disabled:cursor-not-allowed"
          onClick={onAddColumn}
        >
          <Plus size={16} className="mr-1" /> Add Column
        </button>

        {/* Add row button */}
        <button
          className="flex cursor-pointer items-center rounded bg-green-500 px-3 py-2 text-white disabled:cursor-not-allowed"
          onClick={onAddRow}
        >
          <Plus size={16} className="mr-1" /> Add Row
        </button>
      </div>

      {/* Global search */}
      <div className="mb-4 flex items-center">
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          placeholder="Search..."
          className="mr-4 w-64 rounded border p-2"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}