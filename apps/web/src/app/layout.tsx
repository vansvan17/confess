import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="border-b bg-white px-6 py-3 flex items-center gap-6">
          <a href="/" className="font-bold text-lg">
            Confess
          </a>
          <a href="/upload" className="text-sm text-gray-600 hover:text-gray-900">
            Upload
          </a>
          <a href="/query" className="text-sm text-gray-600 hover:text-gray-900">
            Query
          </a>
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </a>
        </nav>
        <main className="p-6 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
