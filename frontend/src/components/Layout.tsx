import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-800 text-slate-100 flex flex-col">
      <header className="border-b border-slate-700 py-4 px-6 flex justify-center">
        <Link to="/" className="hover:opacity-80 transition">
          <img src="/logo.png" alt="SatSplit" className="h-10" />
        </Link>
      </header>
      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <footer className="border-t border-slate-700 py-4 text-center text-slate-500 text-sm">
        Split bills. Pay with Lightning.
      </footer>
    </div>
  );
}
