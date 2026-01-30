import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 py-4 px-6">
        <Link to="/" className="text-xl font-bold text-[#f7931a] hover:opacity-80 transition">
          GoingDutch
        </Link>
      </header>
      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <footer className="border-t border-slate-800 py-4 text-center text-slate-500 text-sm">
        Split bills. Pay with Lightning.
      </footer>
    </div>
  );
}
