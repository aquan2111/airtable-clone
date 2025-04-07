"use client";

import { use, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import BaseHeader from "~/app/_components/BaseHeader";
import TableTab from "~/app/_components/TableTab";
import TableToolbar from "~/app/_components/TableToolbar";
import DataTable from "~/app/_components/DataTable";
import ViewMenu from "~/app/_components/ViewMenu";

export default function BasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: baseId } = use(params);
  const { data: tables } = api.table.getTablesByBase.useQuery({ baseId });

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  // Set first table as active when tables are available
  useEffect(() => {
    if (tables && tables.length > 0 && !activeTableId) {
      setActiveTableId(tables[0]?.id ?? null);
    }
  }, [tables, activeTableId]);

  // Fetch table (with activeViewId) and its views
  const { data: table } = api.table.getTableById.useQuery(
    { id: activeTableId! },
    { enabled: !!activeTableId },
  );

  const { data: views } = api.view.getViewsForTable.useQuery(
    { tableId: activeTableId! },
    { enabled: !!activeTableId },
  );

  // Set activeViewId once both are fetched
  useEffect(() => {
    if (table && views) {
      const fallbackViewId = views[0]?.id ?? null;
      const newViewId = table.activeViewId ?? fallbackViewId;
      setActiveViewId(newViewId);
    }
  }, [table, views]);

  const toggleViewMenu = () => {
    setIsViewMenuOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen flex-col">
      <BaseHeader baseId={baseId} />
      <TableTab
        baseId={baseId}
        activeTableId={activeTableId}
        onTableChange={setActiveTableId}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ViewMenu on the left - only show when isViewMenuOpen is true */}
        {isViewMenuOpen && activeTableId && (
          <ViewMenu
            tableId={activeTableId}
            activeViewId={activeViewId}
            onViewChange={setActiveViewId}
            onClose={() => setIsViewMenuOpen(false)}
          />
        )}

        {/* Main page content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeTableId ? (
            <>
              <TableToolbar
                tableId={activeTableId}
                activeViewId={activeViewId}
                onViewChange={setActiveViewId}
                onToggleViewMenu={toggleViewMenu}
              />
              <DataTable tableId={activeTableId} viewId={activeViewId} />
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              {tables?.length
                ? "Select a table to view"
                : "Create a table to get started"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
