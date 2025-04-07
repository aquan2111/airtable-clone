"use client";

import { api } from "~/trpc/react";
import { X, Eye, EyeOff } from "lucide-react";

type ColumnVisibilityMenuProps = {
  tableId: string;
  onClose: () => void;
};

export default function ColumnVisibilityMenu({ tableId, onClose }: ColumnVisibilityMenuProps) {
  const { data: allColumns = [] } = api.column.getColumnsByTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const { data: hiddenColumns = [] } = api.hiddenColumn.getAllActiveHiddenColumnsForTable.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const utils = api.useUtils();

  const createHiddenColumn = api.hiddenColumn.createHiddenColumn.useMutation({
    onSuccess: () => {
      void utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({ tableId });
      void utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const deactivateHiddenColumn = api.hiddenColumn.updateHiddenColumn.useMutation({
    onSuccess: () => {
      void utils.hiddenColumn.getAllActiveHiddenColumnsForTable.invalidate({ tableId });
      void utils.row.getRowsByTable.invalidate({ tableId });
    },
  });

  const hiddenColumnMap = Object.fromEntries(hiddenColumns.map((h) => [h.columnId, h]));

  const handleToggle = (columnId: string) => {
    const hiddenCol = hiddenColumnMap[columnId];
    if (hiddenCol) {
      // Unhide
      deactivateHiddenColumn.mutate({ id: hiddenCol.id, isActive: false });
    } else {
      // Hide
      createHiddenColumn.mutate({ columnId, tableId });
    }
  };

  return (
    <div className="absolute left-0 top-full mt-2 w-72 bg-white border rounded shadow-md z-50">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-medium">Column Visibility</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Toggle Columns</h4>
        <ul className="space-y-2">
          {allColumns.map((col) => {
            const isHidden = !!hiddenColumnMap[col.id];
            return (
              <li
                key={col.id}
                onClick={() => handleToggle(col.id)}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 cursor-pointer"
              >
                <span className="text-sm">{col.name}</span>
                {isHidden ? (
                  <EyeOff className="text-gray-400" size={16} />
                ) : (
                  <Eye className="text-gray-700" size={16} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
