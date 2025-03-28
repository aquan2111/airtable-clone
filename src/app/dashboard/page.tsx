"use client";

import { api } from "~/trpc/react";
import { useState } from "react";
import BaseCard from "~/app/_components/BaseCard"; // Import BaseCard component

export default function Dashboard() {
  const { data: bases, isLoading, refetch } = api.base.getBasesByUser.useQuery();
  const [newBaseName, setNewBaseName] = useState("");

  const createBase = api.base.createBase.useMutation({
    onSuccess: () => {
      void refetch();
      setNewBaseName("");
    },
  });

  const handleCreateBase = () => {
    if (!newBaseName.trim()) return;
    createBase.mutate({ name: newBaseName });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">My Bases</h1>

      <div className="mt-6">
        <input
          type="text"
          placeholder="New base name..."
          value={newBaseName}
          onChange={(e) => setNewBaseName(e.target.value)}
          className="mr-2 rounded border p-2"
        />
        <button 
          onClick={handleCreateBase} 
          className="rounded bg-blue-500 px-4 py-2 text-white"
          disabled={createBase.isPending}
        >
          Create Base
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {bases?.map((base) => (
            <BaseCard key={base.id} id={base.id} name={base.name} refetch={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
