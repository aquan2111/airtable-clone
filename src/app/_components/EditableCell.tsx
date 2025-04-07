"use client";

import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { api } from "~/trpc/react";

type EditableCellProps = {
  rowId: string;
  columnId: string;
  tableId: string;
  columnType: string;
};

export default function EditableCell({
  rowId,
  columnId,
  tableId,
  columnType,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const [editValue, setEditValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: cellsData } = api.cell.getCellsByRow.useQuery(
    { rowId },
    { enabled: !!rowId }
  );

  useEffect(() => {
    if (cellsData) {
      const cell = cellsData.find((c) => c.columnId === columnId);
      setValue(cell?.value ?? '');
      setEditValue(cell?.value ?? '');
    }
  }, [cellsData, columnId]);

  const utils = api.useUtils();

  const updateCell = api.cell.updateCell.useMutation({
    onSuccess: async () => {
      await utils.cell.getCellsByRow.invalidate({ rowId });
      await utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const handleStartEdit = () => {
    setEditValue(value);
    setValidationError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
    setValidationError(null);
    setIsEditing(false);
  };

  const handleChange = (val: string) => {
    if (columnType === "NUMBER" && val && isNaN(Number(val))) {
      setValidationError("Must be a valid number");
    } else {
      setValidationError(null);
    }
    setEditValue(val);
  };

  const handleSave = () => {
    const cell = cellsData?.find((c) => c.columnId === columnId);
    if (!cell) {
      console.error("Cell not found for updating");
      return;
    }

    updateCell.mutate({
      id: cell.id,
      value: columnType === "NUMBER" ? String(editValue) : editValue,
    });

    setValue(editValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <input
            value={editValue}
            type={columnType === "NUMBER" ? "number" : "text"}
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full border p-1 ${
              validationError ? "border-red-500" : "border-gray-300"
            } rounded`}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
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
              if (!validationError) handleSave();
            }}
            className={`ml-2 cursor-pointer ${
              validationError ? "text-gray-400" : "text-green-500"
            }`}
            disabled={!!validationError}
          >
            <Save size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
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
      onClick={handleStartEdit}
    >
      {value ? value : <span className="text-gray-400">Empty</span>}
    </div>
  );
}
