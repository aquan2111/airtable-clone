"use client";

import { useState, useEffect } from 'react';
import { Plus, Save, X, Edit, Trash } from 'lucide-react';
import { api } from "~/trpc/react";

interface TableTabProps {
  baseId: string;
  activeTableId: string | null;
  onTableChange: (tableId: string | null) => void;
}

export default function TableTab({ baseId, activeTableId, onTableChange }: TableTabProps) {
  const { data: tables, refetch } = api.table.getTablesByBase.useQuery({ baseId });
  const [showNewTableInput, setShowNewTableInput] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [actionTableId, setActionTableId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState("");
  
  const createTableMutation = api.table.createTable.useMutation({
    onSuccess: (newTable) => {
      void refetch();
      setShowNewTableInput(false);
      setNewTableName("");
      // Auto-select the newly created table
      if (newTable.id) {
        onTableChange(newTable.id);
      }
    }
  });
  
  const updateTableMutation = api.table.updateTable.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingTableId(null);
    }
  });
  
  const deleteTableMutation = api.table.deleteTable.useMutation({
    onSuccess: async () => {
      await refetch();
      setActionTableId(null);
      
      // Check if the deleted table was the active table
      if (activeTableId === actionTableId) {
        // If there are other tables, select the first one
        if (tables && tables.length > 1) {
          const newActiveTable = tables.find(t => t.id !== actionTableId);
          if (newActiveTable) {
            onTableChange(newActiveTable.id);
          }
        } else {
          // If this was the last table, set activeTableId to null
          onTableChange(null);
        }
      }
    }
  });
  
  // Update activeTableId when tables change
  useEffect(() => {
    if (!tables || tables.length === 0) {
      // If there are no tables, set activeTableId to null
      onTableChange(null);
    } else if (!activeTableId || !tables.some(t => t.id === activeTableId)) {
      // If the active table no longer exists, select the first available table
      if (tables.length > 0 && tables[0]) {
        onTableChange(tables[0].id);
      }
    }
  }, [tables, activeTableId, onTableChange]);
  
  // Generate next table name - using similar approach as in your home page
  const getNextTableName = () => {
    if (!tables || tables.length === 0) return "Table1";
    
    const tablePattern = /^Table(\d+)$/;
    const usedNumbers = new Set<number>();
    
    tables.forEach(table => {
      if (table.name) {
        const match = tablePattern.exec(table.name);
        if (match?.[1]) {
          usedNumbers.add(parseInt(match[1], 10));
        }
      }
    });
    
    // Find the lowest available number
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }
    
    return `Table${nextNumber}`;
  };
  
  // Handle creating a new table
  const handleCreateTable = () => {
    // Generate a name if the input is empty
    const tableName = newTableName.trim() || getNextTableName();
    createTableMutation.mutate({ name: tableName, baseId });
  };
  
  // Handle creating a new table without showing input
  const handleQuickCreateTable = () => {
    const tableName = getNextTableName();
    createTableMutation.mutate({ name: tableName, baseId });
  };
  
  // Toggle action mode for a table
  const toggleActionMode = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActionTableId(actionTableId === tableId ? null : tableId);
  };
  
  // Handle editing table name
  const handleEditTable = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const table = tables?.find(t => t.id === tableId);
    if (table) {
      setEditingTableId(table.id);
      setEditingTableName(table.name ?? "");
      setActionTableId(null);
    }
  };
  
  // Handle deleting table
  const handleDeleteTable = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this table? This action cannot be undone.")) {
      deleteTableMutation.mutate({ id: tableId });
    }
  };
  
  // Handle saving edited table name
  const handleSaveTableName = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editingTableId && editingTableName.trim()) {
      updateTableMutation.mutate({
        id: editingTableId,
        name: editingTableName
      });
    }
  };
  
  // Close action mode when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setActionTableId(null);
    };
    
    if (actionTableId) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [actionTableId]);
  
  return (
    <div className="bg-gray-50 border-b flex items-center overflow-x-auto">
      {tables?.map((table) => (
        <div key={table.id} className="border-r">
          {editingTableId === table.id ? (
            // Edit mode
            <div className="flex items-center p-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingTableName}
                onChange={(e) => setEditingTableName(e.target.value)}
                className="border p-1 rounded mr-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button 
                onClick={(e) => handleSaveTableName(e)}
                className="text-green-500 mr-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Save size={20} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTableId(null);
                }}
                className="text-red-500 cursor-pointer disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>
          ) : actionTableId === table.id ? (
            // Action mode
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <button
                className={`p-3 ${activeTableId === table.id ? 'bg-white font-bold' : ''} cursor-pointer disabled:cursor-not-allowed`}
                onClick={() => onTableChange(table.id)}
              >
                {table.name ?? ""}
              </button>
              <div className="flex border-l">
                <button 
                  className="p-2 text-blue-500 hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
                  onClick={(e) => handleEditTable(e, table.id)}
                  title="Rename table"
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="p-2 text-red-500 hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
                  onClick={(e) => handleDeleteTable(e, table.id)}
                  title="Delete table"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ) : (
            // Normal mode
            <div className="flex items-center" onContextMenu={(e) => toggleActionMode(e, table.id)}>
              <button
                className={`p-3 ${activeTableId === table.id ? 'bg-white font-bold' : ''} cursor-pointer disabled:cursor-not-allowed`}
                onClick={() => onTableChange(table.id)}
              >
                {table.name ?? ""}
              </button>
            </div>
          )}
        </div>
      ))}
      
      {showNewTableInput ? (
        <div className="flex items-center p-2">
          <input
            type="text"
            placeholder={getNextTableName()}
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            className="border p-1 rounded mr-2"
            autoFocus
          />
          <button 
            onClick={handleCreateTable}
            className="text-green-500 mr-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Save size={20} />
          </button>
          <button 
            onClick={() => setShowNewTableInput(false)}
            className="text-red-500 cursor-pointer disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <button 
          className="p-3 text-blue-500 flex items-center cursor-pointer disabled:cursor-not-allowed"
          onClick={handleQuickCreateTable}
        >
          <Plus size={16} className="mr-1" /> New Table
        </button>
      )}
    </div>
  );
}