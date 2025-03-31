"use client";

import { useState, useEffect } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { api } from "~/trpc/react";

interface BaseHeaderProps {
  baseId: string;
}

export default function BaseHeader({ baseId }: BaseHeaderProps) {
  const { data: base, refetch } = api.base.getBaseById.useQuery({ id: baseId });
  const [isEditingBaseName, setIsEditingBaseName] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  
  const updateBaseMutation = api.base.updateBase.useMutation({
    onSuccess: () => void refetch()
  });
  
  // Set base name for editing
  useEffect(() => {
    if (base?.name) {
      setNewBaseName(base.name);
    }
  }, [base]);
  
  // Handle base name update
  const handleUpdateBaseName = () => {
    if (newBaseName && base) {
      updateBaseMutation.mutate({ id: baseId, name: newBaseName });
      setIsEditingBaseName(false);
    }
  };
  
  return (
    <div className="bg-gray-100 p-3 border-b flex items-center">
      {isEditingBaseName ? (
        <div className="flex items-center">
          <input
            type="text"
            value={newBaseName}
            onChange={(e) => setNewBaseName(e.target.value)}
            className="border p-1 rounded mr-2"
            autoFocus
          />
          <button 
            onClick={handleUpdateBaseName}
            className="text-green-500 mr-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Save size={20} />
          </button>
          <button 
            onClick={() => setIsEditingBaseName(false)}
            className="text-red-500 cursor-pointer disabled:cursor-not-allowed" 
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <h2 className="text-xl font-bold mr-2">
            {base?.name ?? 'Loading...'}
          </h2>
          <button 
            onClick={() => setIsEditingBaseName(true)}
            className="text-gray-500 cursor-pointer disabled:cursor-not-allowed"
          >
            <Pencil size={16} />
          </button>
        </div>
      )}
    </div>
  );
}