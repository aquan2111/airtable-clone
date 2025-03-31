"use client";

import { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { api } from "~/trpc/react";
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

// Define proper interfaces for your data structures
interface Column {
  id: string;
  name: string;
  type: string;
  tableId: string;
}

interface Cell {
  id: string;
  rowId: string;
  columnId: string;
  value: string;
}

interface Row {
  id: string;
  tableId: string;
  cells: Cell[];
}

interface Table {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
}

interface DataTableProps {
  tableId: string;
}

export default function DataTable({ tableId }: DataTableProps) {
  const { data: table, refetch } = api.table.getTableById.useQuery({ id: tableId });
  
  const [editingCell, setEditingCell] = useState<{ 
    rowId: string; 
    columnId: string; 
    cellId?: string;
    value: string 
  } | null>(null);
  
  const [newColumnName, setNewColumnName] = useState("");
  const [showNewColumnInput, setShowNewColumnInput] = useState(false);
  
  // Mutations
  const createColumnMutation = api.column.createColumn.useMutation({
    onSuccess: () => {
      void refetch();
      setShowNewColumnInput(false);
      setNewColumnName("");
    }
  });

  const deleteColumnMutation = api.column.deleteColumn.useMutation({
    onSuccess: () => void refetch()
  });

  const createRowMutation = api.row.createRow.useMutation({
    onSuccess: () => void refetch()
  });

  const deleteRowMutation = api.row.deleteRow.useMutation({
    onSuccess: () => void refetch()
  });

  const createCellMutation = api.cell.createCell.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingCell(null);
    }
  });

  const updateCellMutation = api.cell.updateCell.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingCell(null);
    }
  });
  
  // Handle creating a new column
  const handleCreateColumn = () => {
    if (newColumnName && tableId) {
      createColumnMutation.mutate({ 
        name: newColumnName, 
        tableId: tableId,
        type: "TEXT" // Default type
      });
    }
  };

  // Handle creating a new row
  const handleCreateRow = () => {
    if (tableId) {
      createRowMutation.mutate({ tableId: tableId });
    }
  };

  // Handle cell value update
  const handleUpdateCell = () => {
    if (editingCell) {
      if (editingCell.cellId) {
        // Update existing cell
        updateCellMutation.mutate({
          id: editingCell.cellId,
          value: editingCell.value
        });
      } else {
        // Create new cell
        createCellMutation.mutate({
          rowId: editingCell.rowId,
          columnId: editingCell.columnId,
          value: editingCell.value
        });
      }
    }
  };

  // TanStack Table Setup
  const columnHelper = createColumnHelper<Row>();
  
  const generateColumns = () => {
    if (!table) return [];
    
    // Create column definitions
    const columns = table.columns.map(col => 
      columnHelper.accessor((row) => {
        const cell = row.cells?.find((c: Cell) => c.columnId === col.id);
        return cell?.value ?? '';
      }, {
        id: col.id,
        header: () => (
          <div className="flex items-center justify-between">
            <span>{col.name}</span>
            <button 
              onClick={() => deleteColumnMutation.mutate({ id: col.id })}
              className="text-red-500 ml-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
        cell: ({ row, column }) => {
          const rowId = row.original.id;
          const columnId = column.id;
          const cell = row.original.cells?.find((c: Cell) => c.columnId === columnId);
          const cellValue = cell?.value ?? '';
          
          if (editingCell && editingCell.rowId === rowId && editingCell.columnId === columnId) {
            return (
              <div className="flex items-center">
                <input
                  value={editingCell.value}
                  onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                  className="border p-1 w-full"
                  autoFocus
                />
                <button onClick={handleUpdateCell} className="text-green-500 ml-2 cursor-pointer disabled:cursor-not-allowed">
                  <Save size={16} />
                </button>
                <button onClick={() => setEditingCell(null)} className="text-red-500 ml-2 cursor-pointer disabled:cursor-not-allowed">
                  <X size={16} />
                </button>
              </div>
            );
          }
          
          return (
            <div 
              className="cursor-pointer p-1 hover:bg-gray-100 min-h-8"
              onClick={() => setEditingCell({ 
                rowId, 
                columnId, 
                cellId: cell?.id, 
                value: cellValue 
              })}
            >
              {cellValue ? cellValue : <span className="text-gray-400">Empty</span>}
            </div>
          );
        }
      })
    );
    
    // Add row actions column with proper type handling
    return [
      ...columns,
      columnHelper.accessor((row) => row.id, {
        id: 'actions',
        header: () => <span>Actions</span>,
        cell: ({ row }) => (
          <button
            onClick={() => deleteRowMutation.mutate({ id: row.original.id })}
            className="text-red-500 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
          </button>
        ),
      })
    ];
  };
  
  const columns = generateColumns();
  const data = (table?.rows as Row[]) ?? [];
  
  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!table) {
    return <div className="p-4 text-center">Loading table data...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center space-x-4">
        {/* Add column button/input */}
        {showNewColumnInput ? (
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="border p-1 rounded mr-2"
              autoFocus
            />
            <button 
              onClick={handleCreateColumn}
              className="text-green-500 mr-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save size={20} />
            </button>
            <button 
              onClick={() => setShowNewColumnInput(false)}
              className="text-red-500 cursor-pointer disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <button 
            className="bg-blue-500 text-white px-3 py-2 rounded flex items-center cursor-pointer disabled:cursor-not-allowed"
            onClick={() => setShowNewColumnInput(true)}
          >
            <Plus size={16} className="mr-1 cursor-pointer disabled:cursor-not-allowed" /> Add Column
          </button>
        )}
        
        {/* Add row button */}
        <button 
          className="bg-green-500 text-white px-3 py-2 rounded flex items-center cursor-pointer disabled:cursor-not-allowed"
          onClick={handleCreateRow}
        >
          <Plus size={16} className="mr-1 cursor-pointer disabled:cursor-not-allowed" /> Add Row
        </button>
      </div>
      
      {/* TanStack Table */}
      <div className="border rounded overflow-hidden">
        <table className="w-full">
          <thead>
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-200">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-2 text-left border">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.length ? (
              tableInstance.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-2 border">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center p-4">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}