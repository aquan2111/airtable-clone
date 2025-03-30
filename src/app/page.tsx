"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import BaseCard from "~/app/_components/BaseCard";

export default function Home() {
  const [session, setSession] = useState<null | { user: { id: string } }>(null);
  const router = useRouter();

  // Fetch authentication status on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = (await res.json()) as { user: { id: string } } | null;
        setSession(data);
      } catch (error) {
        console.error("Failed to fetch session:", error);
        setSession(null);
      }
    };
    void fetchSession();
  }, []);

  // Fetch user bases when logged in
  const { data: bases, isLoading, refetch } = api.base.getBasesByUser.useQuery(undefined, {
    enabled: !!session, // Only run the query when session exists
  });

  // Mutation to create a base
  const createBase = api.base.createBase.useMutation({
    onSuccess: (newBase) => {
      void refetch();
      router.push(`/base/${newBase.id}`); // Redirect to the newly created base
    },
  });

  const handleCreateBase = () => {
    createBase.mutate({ name: "Untitled Base" });
  };

  // Render login page when user is not authenticated
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-gray-900">
        <h1 className="text-4xl font-bold">Welcome to Airtable</h1>
        <p className="mt-4 text-lg">Manage your data with ease.</p>

        <Link
          href="/api/auth/signin"
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Bases</h1>
        <button 
          onClick={handleCreateBase} 
          className="rounded bg-blue-500 px-4 py-2 text-white"
          disabled={createBase.isPending}
        >
          Create Base
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6">Loading...</p>
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
