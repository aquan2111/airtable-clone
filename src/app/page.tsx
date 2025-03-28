import Link from "next/link";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 text-gray-900">
      <h1 className="text-4xl font-bold">Welcome to Airtable Clone</h1>
      <p className="mt-4 text-lg">Manage your data with ease.</p>

      <Link
        href={session ? "/dashboard" : "/api/auth/signin"}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Open Dashboard
      </Link>
    </main>
  );
}
