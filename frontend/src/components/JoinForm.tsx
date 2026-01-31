import { type FormEvent, useState } from "react";

interface Props {
  onJoin: (name: string) => Promise<void>;
}

export default function JoinForm({ onJoin }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onJoin(name.trim());
    } catch (err: any) {
      setError(err.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7931a] transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="join_name" className="block text-sm text-gray-600">Your name</label>
      <input
        id="join_name"
        type="text"
        required
        minLength={1}
        maxLength={100}
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#f7931a] hover:bg-[#e8851a] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join & Get Invoice"}
      </button>
    </form>
  );
}
