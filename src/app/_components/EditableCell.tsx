// src/app/_components/EditableCell.tsx

import { useState, useEffect, useCallback } from "react";
import { Save, X, Loader2 } from "lucide-react"; // Added Loader2 for the spinner
import { api } from "~/trpc/react";

type EditableCellProps = {
  rowId: string;
  columnId: string;
  tableId: string;
  columnType: string;
  searchQuery: string;      
  isHighlighted: boolean;  
  cellValue: string;
  cellId?: string;
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
  searchQuery,      
  isHighlighted,   
  cellValue,
  cellId,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(''); // Current display value
  const [editValue, setEditValue] = useState(''); // Value while editing
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // New state to track saving status

  // Update state when data for the row is fetched/changed
  useEffect(() => {
    setValue(cellValue);
    if (!isEditing) {
      setEditValue(cellValue);
    }
  }, [cellValue, isEditing]);  

  const utils = api.useUtils();

  const updateCell = api.cell.updateCell.useMutation({
    onMutate: () => {
      // Start loading state before the mutation
      setIsSaving(true);
    },
    onSuccess: async (data) => {
      // Update local value immediately with the returned data
      setValue(data.value || '');
      
      // Invalidate necessary queries
      await Promise.all([
        utils.cell.getCellsByRow.invalidate({ rowId }),
        utils.row.getRowsByTable.invalidate({ tableId }),
      ]);
      
      // End loading state
      setIsSaving(false);
    },
    onError: (error) => {
      console.error("Failed to update cell:", error);
      alert("Failed to save changes.");
      // Reset editValue back to original 'value' on error
      setEditValue(value);
      setIsSaving(false);
    }
  });

  const handleStartEdit = () => {
    // Don't allow editing if currently saving
    if (isSaving) return;
    
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
    if (!cellId) {
      console.error("Cell ID not provided - cannot update cell");
      setIsEditing(false);
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
         // Set to non-editing state immediately (but saving state is true)
         setIsEditing(false);
         
         updateCell.mutate({
            id: cellId, // Use the specific cell ID
            value: valueToSave,
         });
         
         // We no longer update setValue here - we'll wait for the success callback
    } else {
      // If no change, just exit edit mode
      setIsEditing(false);
    }
  };

  // --- Highlighting Function ---
  const renderHighlightedValue = useCallback(() => {
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
  if (!cellId) {
    return (
      <div className="h-9 w-full animate-pulse rounded bg-gray-100" />
    );
  }
  
  return (
    <div
      // Apply consistent padding & height. `whitespace-pre-wrap` respects newlines/spaces.
      className={`min-h-[36px] ${isSaving ? 'cursor-wait' : 'cursor-pointer'} p-[5px] hover:bg-gray-100 text-sm whitespace-pre-wrap break-words`}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (!isSaving) handleStartEdit(); 
      }}
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        if (!isSaving) handleStartEdit(); 
      }}
    >
      {isSaving ? (
        <div className="flex items-center text-blue-500">
          <Loader2 size={14} className="mr-1 animate-spin" />
          <span>Saving...</span>
        </div>
      ) : (
        // Use the highlighting renderer
        renderHighlightedValue()
      )}
    </div>
  );
}