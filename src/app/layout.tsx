import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import Navbar from "~/app/_components/NavBar"; 

export const metadata: Metadata = {
  title: "Airtable Clone",
  description: "A fast and scalable Airtable alternative.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-gray-100">
        <SessionProvider> {/* ✅ Wrap everything inside SessionProvider */}
          <TRPCReactProvider>
            <Navbar />
            <main className="container mx-auto px-4 py-6">{children}</main>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
