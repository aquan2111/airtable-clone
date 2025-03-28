"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

interface BaseProps {
  id: string;
  name: string;
  refetch: () => void;
}

export default function BaseCard({ id, name, refetch }: BaseProps) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(name);

  const updateBase = api.base.updateBase.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(false);
    },
  });

  const deleteBase = api.base.deleteBase.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleUpdateBase = () => {
    if (newName.trim() && newName !== name) {
      updateBase.mutate({ id, name: newName });
    } else {
      setEditing(false);
    }
  };

  const handleDeleteBase = () => {
    if (confirm("Are you sure you want to delete this base?")) {
      deleteBase.mutate({ id });
    }
  };

  return (
    <div className="relative rounded-lg border p-4 shadow hover:shadow-lg">
      {editing ? (
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleUpdateBase}
          className="w-full rounded border p-2"
          autoFocus
        />
      ) : (
        <h2 className="text-xl font-semibold">{name}</h2>
      )}

      <div className="mt-2 flex justify-between">
        <Link href={`/base/${id}`} className="text-blue-500 hover:underline">
          Open
        </Link>
        <div className="space-x-2">
          <button onClick={() => setEditing(true)} className="text-gray-500" disabled={updateBase.isPending}>
            ✏️
          </button>
          <button onClick={handleDeleteBase} className="text-red-500" disabled={deleteBase.isPending}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
