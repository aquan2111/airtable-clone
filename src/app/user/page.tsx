import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function UserProfile() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold">User Profile</h1>
      <div className="mt-4 flex items-center gap-4">
        <Image
          src={session.user?.image ?? "/default-avatar.png"}
          alt="User Profile"
          width={80}
          height={80}
          className="rounded-full"
        />
        <div>
          <p className="text-lg font-semibold">{session.user?.name}</p>
          <p className="text-gray-600">{session.user?.email}</p>
        </div>
      </div>

      <h2 className="mt-6 text-2xl font-bold">Your Bases</h2>
      {/* Fetch and display bases here */}
    </main>
  );
}
