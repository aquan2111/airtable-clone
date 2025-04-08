// src/app/_components/EditableCell.tsx

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Save, X } from "lucide-react";
import { api } from "~/trpc/react";

type EditableCellProps = {
  rowId: string;
  columnId: string;
  tableId: string;
  columnType: string;
  searchQuery: string;      // <-- Add prop for search term
  isHighlighted: boolean;  // <-- Add prop to know if this cell is a search result
};

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function EditableCell({
  rowId,
  columnId,
  tableId,
  columnType,
  searchQuery,      // <-- Destructure prop
  isHighlighted,    // <-- Destructure prop
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(''); // Current display value
  const [editValue, setEditValue] = useState(''); // Value while editing
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch all cells for the row (as per your component structure)
  const { data: cellsData } = api.cell.getCellsByRow.useQuery(
    { rowId },
    { enabled: !!rowId }
  );

  // Update state when data for the row is fetched/changed
  useEffect(() => {
    if (cellsData) {
      const cell = cellsData.find((c) => c.columnId === columnId);
      const cellValue = cell?.value ?? '';
      setValue(cellValue);
      // Ensure editValue is also updated if not currently editing
      // to reflect external changes. If editing, keep the user's input.
      if (!isEditing) {
          setEditValue(cellValue);
      }
    }
  }, [cellsData, columnId, isEditing]); // Add isEditing dependency

  const utils = api.useUtils();

  const updateCell = api.cell.updateCell.useMutation({
    onSuccess: async () => {
      // Invalidate necessary queries
      await utils.cell.getCellsByRow.invalidate({ rowId });
      await utils.row.getRowsByTable.invalidate({ tableId });
      // Potentially invalidate search if content changes matter
      // await utils.cell.searchCellsInTable.invalidate();
    },
    onError: (error) => {
        console.error("Failed to update cell:", error);
        alert("Failed to save changes.");
        // Optionally reset editValue back to original 'value' on error
        setEditValue(value);
    }
  });

  const handleStartEdit = () => {
    setEditValue(value); // Start editing with the current display value
    setValidationError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value); // Revert editValue back to the original display value
    setValidationError(null);
    setIsEditing(false);
  };

  const handleChange = (val: string) => {
    // Basic validation for NUMBER type
    if (columnType === "NUMBER") {
        // Allow empty string or just a minus sign during typing
        if (val === '' || val === '-') {
            setValidationError(null);
        }
        // Check if it's NOT a valid number representation
        else if (isNaN(Number(val))) {
            setValidationError("Must be a valid number");
        }
        // It's a valid number or potentially valid start
        else {
            setValidationError(null);
        }
    } else {
        setValidationError(null); // No validation for TEXT type here
    }
    setEditValue(val);
  };

  const handleSave = () => {
    // Prevent saving if validation error exists
    if (validationError) return;

    // Find the specific cell's ID from the fetched row data
    const cell = cellsData?.find((c) => c.columnId === columnId);
    if (!cell) {
      console.error("Cell data not found for updating - cannot get cell ID");
      setIsEditing(false); // Exit edit mode even if save failed
      return;
    }

    // Determine the value to save
    let valueToSave = editValue;
    if (columnType === "NUMBER") {
      if(editValue === '') {
        valueToSave = '';
      }
      else {
        valueToSave = String(Number(editValue));
      }
    }


    // Only call mutation if the value has actually changed
    if (valueToSave !== value) {
         updateCell.mutate({
            id: cell.id, // Use the specific cell ID
            value: valueToSave,
         });
         // Optimistically update display value, server will confirm/invalidate
         setValue(valueToSave ?? '');
    }


    setIsEditing(false);
  };

  // --- Highlighting Function ---
  const renderHighlightedValue = useCallback(() => {
    // Use the 'value' state for display
    // Only apply highlight if this cell is marked as highlighted,
    // there's a search query, it's a TEXT column, and has content.
    if (!isHighlighted || !searchQuery || columnType !== 'TEXT' || !value) {
      // If no value, show placeholder, otherwise show plain value
      return value ? value : <span className="text-gray-400">Empty</span>;
    }

    try {
      const escapedQuery = escapeRegExp(searchQuery);
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = value.split(regex).filter(part => part !== ''); // Split and remove empty strings

      return (
        <>
          {parts.map((part, index) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
              <span key={index} className="bg-yellow-300"> {/* Highlight style */}
                {part}
              </span>
            ) : (
              <span key={index}>{part}</span> // Normal text part
            )
          )}
        </>
      );
    } catch (error) {
      console.error("Regex error during highlighting:", error);
      // Fallback to plain value on error, handling empty case
      return value ? value : <span className="text-gray-400">Empty</span>;
    }
  }, [value, searchQuery, isHighlighted, columnType]); // Dependencies for the callback

  // --- Render Logic ---

  if (isEditing) {
    // --- Editing Mode UI ---
    return (
      <div className="flex flex-col p-1"> {/* Add padding to match display mode */}
        <div className="flex items-center">
          <input
            value={editValue}
            // Use 'text' for number input to allow intermediate states like "-" or empty
            type={columnType === "NUMBER" ? "text" : "text"}
            inputMode={columnType === "NUMBER" ? "numeric" : "text"} // Keyboard hint
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full border p-1 text-sm ${ // Added text-sm
              validationError ? "border-red-500" : "border-gray-300"
            } rounded`}
            autoFocus
            onClick={(e) => e.stopPropagation()} // Prevent triggering cell click/edit start
            onKeyDown={(e) => {
              e.stopPropagation(); // Prevent DataTable level key listeners
              if (e.key === "Enter" && !validationError) {
                handleSave();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave(); // handleSave already checks validationError
            }}
            className={`ml-2 flex-shrink-0 cursor-pointer p-1 ${ // Added padding & flex-shrink
              validationError ? "text-gray-400 cursor-not-allowed" : "text-green-500 hover:text-green-700"
            }`}
            disabled={!!validationError}
            title="Save (Enter)"
          >
            <Save size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            className="ml-1 flex-shrink-0 cursor-pointer p-1 text-red-500 hover:text-red-700" // Added padding & flex-shrink
            title="Cancel (Escape)"
          >
            <X size={16} />
          </button>
        </div>
        {validationError && (
          <div className="mt-1 text-xs text-red-500">{validationError}</div>
        )}
      </div>
    );
  }

  // --- Display Mode UI ---
  return (
    <div
        // Apply consistent padding & height. `whitespace-pre-wrap` respects newlines/spaces.
      className="min-h-[36px] cursor-pointer p-[5px] hover:bg-gray-100 text-sm whitespace-pre-wrap break-words" // Adjusted padding/height slightly
      onClick={(e) => { e.stopPropagation(); handleStartEdit(); }} // Ensure click propagation is stopped
      onDoubleClick={(e) => { e.stopPropagation(); handleStartEdit(); }} // Also handle double-click
    >
      {/* Use the highlighting renderer */}
      {renderHighlightedValue()}
    </div>
  );
}