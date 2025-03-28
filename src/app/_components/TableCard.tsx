"use client";

import Link from "next/link";

export default function TableCard({ table }: { table: { id: string; name: string } }) {
  return (
    <div className="rounded-lg border p-4 shadow hover:shadow-lg">
      <h2 className="text-xl font-semibold">{table.name}</h2>
      <Link href={`/table/${table.id}`} className="text-blue-500 hover:underline">
        Open Table
      </Link>
    </div>
  );
}
