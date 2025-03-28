"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      {/* Left: Logo */}
      <Link href="/" className="text-xl font-bold">
        Airtable
      </Link>

      {/* Right: Authenticated User Options */}
      <div className="relative flex items-center gap-4">
        {session ? (
          <>
            {/* My Dashboard Link */}
            <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
              My Dashboard
            </Link>

            {/* Profile Picture & Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {/* Profile Picture (Clickable) */}
              <Link href="/user">
                <Image
                  src={session.user?.image ?? "/default-avatar.png"} // Use default image if none
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full cursor-pointer"
                />
              </Link>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border">
                  <Link
                    href="/user"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/api/auth/signin"
            className="text-gray-700 hover:text-gray-900"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
