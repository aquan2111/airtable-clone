"use client";

import { use } from 'react';
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function BasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: baseId } = use(params);
  
  const _router = useRouter();
  
  const { data: base } = api.base.getBaseById.useQuery({ id: baseId });
  
  const { data: tables, refetch } = api.table.getTablesByBase.useQuery({ baseId });

  // Debug logging
  console.log('Tables data:', JSON.stringify(tables, null, 2));

  const createTableMutation = api.table.createTable.useMutation({
    onSuccess: () => void refetch()
  });
  
  const deleteTableMutation = api.table.deleteTable.useMutation({
    onSuccess: () => void refetch()
  });

  const [newTableName, setNewTableName] = useState("");

  return (
    <div>
      {/* <nav className="flex items-center justify-between p-4 bg-gray-200">
        <h1 className="text-lg font-bold">Airtable Clone</h1>
        <h2 className="text-md">Base: {base?.name ?? 'Loading...'}</h2>
      </nav> */}

      <div className="p-4 flex gap-4 border-b">
        <input
          type="text"
          placeholder="New Table Name"
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={() => {
            if (newTableName) {
              createTableMutation.mutate({ name: newTableName, baseId });
              setNewTableName("");
            }
          }}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Add Table
        </button>
      </div>

      <div className="p-4 space-y-6">
        {tables?.length === 0 && <p>No tables found</p>}
        {tables?.map((table) => (
          <div key={table.id} className="border rounded">
            <div className="flex justify-between p-4 bg-gray-100">
              <h3 className="text-xl font-bold">{table.name}</h3>
              <button
                onClick={() => deleteTableMutation.mutate({ id: table.id })}
                className="text-red-500"
              >
                Delete
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-200">
                    {table.columns.map((col) => (
                      <th key={col.id} className="p-2 border text-left">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 && (
                    <tr>
                      <td colSpan={table.columns.length} className="text-center p-4">
                        No rows found
                      </td>
                    </tr>
                  )}
                  {table.rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      {table.columns.map((col) => {
                        const cell = row.cells?.find(
                          (cell) => cell.columnId === col.id
                        );
                        return (
                          <td key={col.id} className="p-2 border">
                            {cell?.value ?? '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}