import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="flex justify-center mb-8">
            <Link to="/" className="hover:opacity-80 transition">
              <img src="/logo.png" alt="SatSplit" className="h-16" />
            </Link>
          </div>
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
        Split bills. Pay with Lightning.
      </footer>
    </div>
  );
}
