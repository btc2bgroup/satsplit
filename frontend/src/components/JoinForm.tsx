import { type FormEvent, useState } from "react";

interface Props {
  onJoin: (name: string) => Promise<void>;
  availableNames?: string[];
}

export default function JoinForm({ onJoin, availableNames }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onJoin(name.trim());
    } catch (err) {
      setError((err instanceof Error && err.message) || "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7931a] transition";

  const selectClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-[#f7931a] transition appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10";

  const hasDropdown = availableNames && availableNames.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="join_name" className="block text-sm text-gray-600">
        {hasDropdown ? "Who is paying?" : "Your name"}
      </label>
      {hasDropdown ? (
        <select
          id="join_name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            Choose your name...
          </option>
          {availableNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ) : (
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
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || (hasDropdown && !name)}
        className="w-full bg-[#f7931a] hover:bg-[#e8851a] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join & Get Invoice"}
      </button>
    </form>
  );
}