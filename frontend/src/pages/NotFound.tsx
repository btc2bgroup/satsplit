import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center space-y-4 py-12">
      <h1 className="text-4xl font-bold text-slate-400">404</h1>
      <p className="text-slate-500">Page not found</p>
      <Link
        to="/"
        className="inline-block bg-[#f7931a] hover:bg-[#e8851a] text-white px-6 py-2 rounded-lg transition"
      >
        Go Home
      </Link>
    </div>
  );
}
