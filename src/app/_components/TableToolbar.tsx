"use client";

import { useState } from "react"; // Keep for local menu state
// ** Add new Icon imports **
import { Search, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import FilterMenu from "./FilterMenu";
import SortMenu from "./SortMenu";
// Import api if still needed for the view query
import { api } from "~/trpc/react";


// ** Update Props **
type TableToolbarProps = {
  tableId: string;
  activeViewId: string | null;
  onViewChange: (viewId: string) => void;
  onToggleViewMenu: () => void;
  // --- Search Props ---
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResultCount: number;
  currentSearchResultIndex: number; // 0-based index
  onNextSearchResult: () => void;
  onPreviousSearchResult: () => void;
  isSearching: boolean; // Loading indicator
};

export default function TableToolbar({
  tableId,
  activeViewId,
  onViewChange, // Keep if view logic is still relevant here
  onToggleViewMenu,
  // --- Destructure Search Props ---
  searchQuery,
  onSearchQueryChange,
  searchResultCount,
  currentSearchResultIndex,
  onNextSearchResult,
  onPreviousSearchResult,
  isSearching,
}: TableToolbarProps) {
  // Keep state for local menus
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  // Remove local searchQuery state

  // Keep view query if needed for display
   const { data: view } = api.view.getViewById.useQuery(
     { id: activeViewId! },
     { enabled: !!activeViewId }
   );

  // --- Search Result Display Logic ---
  const hasResults = searchResultCount > 0;
  const resultDisplay = hasResults
    ? `${currentSearchResultIndex + 1} of ${searchResultCount}`
    : searchResultCount === 0 && searchQuery.length > 0 && !isSearching // Only show "0 results" after a search completes
    ? "0 results"
    : "";

  return (
    <div className="relative flex items-center justify-between py-2 px-4 border-b bg-white z-10">
      {/* Left side (View, Hide, Filter, Sort) - unchanged */}
      <div className="flex space-x-2 relative">
         {/* View Button */}
         <div className="relative">
           <button
             onClick={onToggleViewMenu}
             className="px-3 py-1 text-sm rounded hover:bg-gray-100"
           >
             View
           </button>
           {/* View Menu */}
         </div>
         {/* Hide Columns Button */}
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
         {/* Filter Button */}
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
                 // Make sure FilterMenu uses activeViewId if necessary
                 onClose={() => setIsFilterMenuOpen(false)}
               />
             </div>
           )}
         </div>
          {/* Sort Button */}
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
                 // Make sure SortMenu uses activeViewId if necessary
                 onClose={() => setIsSortMenuOpen(false)}
               />
             </div>
           )}
         </div>
      </div>

      {/* Right side search - Modified */}
      <div className="relative flex items-center space-x-2">
        <div className="relative">
           {/* Show loader or search icon */}
          {isSearching ? (
             <Loader2 className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
          ) : (
             <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          )}
          {/* Search Input */}
          <input
            type="text"
            value={searchQuery} // Use prop
            onChange={(e) => onSearchQueryChange(e.target.value)} // Use prop handler
            placeholder="Search..."
            className="pl-8 pr-4 py-1 text-sm border rounded w-64" // Adjust width as needed
          />
        </div>
        {/* Search Results Navigation - Show only when searching/searched */}
        {(searchQuery.length > 0 || hasResults) && ( // Show if text entered or if results exist
           <div className="flex items-center text-sm text-gray-600">
             {/* Display Count */}
             {resultDisplay && <span className="mr-2 tabular-nums">{resultDisplay}</span>}
             {/* Previous Button */}
             <button
               onClick={onPreviousSearchResult} // Use prop handler
               disabled={!hasResults} // Disable if no results
               className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
               aria-label="Previous search result"
             >
               <ChevronUp size={16} />
             </button>
             {/* Next Button */}
             <button
               onClick={onNextSearchResult} // Use prop handler
               disabled={!hasResults} // Disable if no results
               className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
               aria-label="Next search result"
             >
               <ChevronDown size={16} />
             </button>
           </div>
        )}
      </div>
    </div>
  );
}