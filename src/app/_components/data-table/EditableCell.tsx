import { Save, X } from "lucide-react";
import type { EditableCellProps } from "./types";

export function EditableCell({
  value,
  isEditing,
  editValue,
  onChange,
  onSave,
  onCancel,
  onStartEdit,
  isNumberType,
  validationError,
}: EditableCellProps): React.ReactNode {
  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <input
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border p-1 ${validationError ? "border-red-500" : ""}`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !validationError) {
                onSave();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!validationError) onSave();
            }}
            className={`ml-2 cursor-pointer ${validationError ? "text-gray-400" : "text-green-500"}`}
            disabled={!!validationError}
          >
            <Save size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="ml-2 cursor-pointer text-red-500"
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

  return (
    <div
      className="min-h-8 cursor-pointer p-1 hover:bg-gray-100"
      onClick={onStartEdit}
    >
      {value ? value : <span className="text-gray-400">Empty</span>}
    </div>
  );
}