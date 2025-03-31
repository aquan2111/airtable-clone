"use client";

import { use, useState, useEffect } from 'react';
import { api } from "~/trpc/react";
import BaseHeader from '~/app/_components/BaseHeader';
import TableTab from '~/app/_components/TableTab';
import DataTable from '~/app/_components/DataTable';

export default function BasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: baseId } = use(params);
  const { data: tables } = api.table.getTablesByBase.useQuery({ baseId });
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  
  // Set the first table as active if none is selected and tables exist
  useEffect(() => {
    if (tables && tables.length > 0 && !activeTableId) {
      setActiveTableId(tables[0]?.id ?? null);
    }
  }, [tables, activeTableId]);

  return (
    <div className="flex flex-col h-full">
      <BaseHeader baseId={baseId} />
      <TableTab 
        baseId={baseId} 
        activeTableId={activeTableId} 
        onTableChange={setActiveTableId} 
      />
      
      {activeTableId ? (
        <DataTable tableId={activeTableId} />
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          {tables?.length ? 'Select a table to view' : 'Create a table to get started'}
        </div>
      )}
    </div>
  );
}