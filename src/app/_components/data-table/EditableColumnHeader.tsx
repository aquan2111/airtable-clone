import { Save, X, Pencil, Trash2 } from "lucide-react";
import type { EditableColumnHeaderProps } from "./types";

export function EditableColumnHeader({
  column,
  isEditing,
  editValue,
  editType,
  onEditChange,
  onTypeChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  hasNonNumericValues,
}: EditableColumnHeaderProps): React.ReactNode {
  return (
    <div className="flex items-center justify-between">
      {isEditing ? (
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="w-24 border p-1"
            autoFocus
            // Prevent propagation to avoid table re-renders
            onClick={(e) => e.stopPropagation()}
            // Add key press handler for Enter and Escape
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                onSave();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
          />
          <div className="flex items-center">
            <select
              value={editType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="border p-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
            </select>
            {column.type === "TEXT" &&
              editType === "NUMBER" &&
              hasNonNumericValues && (
                <span className="ml-2 text-xs text-red-500">
                  ⚠️ Clear non-numeric values first
                </span>
              )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <span>{column.name}</span>
          <span className="text-xs text-gray-500">
            {column.type === "NUMBER" ? "Number" : "Text"}
          </span>
        </div>
      )}

      <div className="flex space-x-2">
        {isEditing ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="cursor-pointer text-green-500"
              disabled={
                column.type === "TEXT" &&
                editType === "NUMBER" &&
                hasNonNumericValues
              }
            >
              <Save size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="cursor-pointer text-red-500"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className="cursor-pointer text-gray-500"
          >
            <Pencil size={16} />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="cursor-pointer text-red-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}