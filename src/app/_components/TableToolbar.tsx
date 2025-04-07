"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Search } from "lucide-react";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import FilterMenu from "./FilterMenu";
import SortMenu from "./SortMenu";

type TableToolbarProps = {
  tableId: string;
  activeViewId: string | null;
  onViewChange: (viewId: string) => void;
  onToggleViewMenu: () => void; // Add the new prop here
};

export default function TableToolbar({
  tableId,
  activeViewId,
  onViewChange,
  onToggleViewMenu, // Destructure the new prop
}: TableToolbarProps) {
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: view } = api.view.getViewById.useQuery(
    { id: activeViewId! },
    { enabled: !!activeViewId }
  );

  return (
    <div className="relative flex items-center justify-between py-2 px-4 border-b bg-white z-10">
      <div className="flex space-x-2 relative">
        <div className="relative">
          <button
            onClick={onToggleViewMenu} // Use the passed `onToggleViewMenu` function
            className="px-3 py-1 text-sm rounded hover:bg-gray-100"
          >
            View
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
            className="px-3 py-1 text-sm rounded hover:bg-gray-100"
          >
            Hide columns
          </button>
          {isColumnMenuOpen && (
            <div className="absolute left-0 top-full mt-2 z-20">
              <ColumnVisibilityMenu
                tableId={tableId}
                onClose={() => setIsColumnMenuOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="px-3 py-1 text-sm rounded hover:bg-gray-100"
          >
            Filter
          </button>
          {isFilterMenuOpen && (
            <div className="absolute left-0 top-full mt-2 z-20">
              <FilterMenu
                tableId={tableId}
                onClose={() => setIsFilterMenuOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="px-3 py-1 text-sm rounded hover:bg-gray-100"
          >
            Sort
          </button>
          {isSortMenuOpen && (
            <div className="absolute left-0 top-full mt-2 z-20">
              <SortMenu
                tableId={tableId}
                onClose={() => setIsSortMenuOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="pl-8 pr-4 py-1 text-sm border rounded w-64"
        />
      </div>
    </div>
  );
}
