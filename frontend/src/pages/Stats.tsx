import { useEffect, useState } from "react";
import { api, type StatsOut, type DateCount } from "../api";

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
        <div
          className="bg-[#f7931a] h-full rounded transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-gray-600">{value}</span>
    </div>
  );
}

function BarList({ title, data }: { title: string; data: DateCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="space-y-1">
          {data.map((d) => (
            <Bar key={d.date} value={d.count} max={max} label={d.date} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState<StatsOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>Failed to load stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center text-gray-500 py-8">Loading stats...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Stats</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-[#f7931a]">{stats.total_bills}</p>
            <p className="text-sm text-gray-500">Bills Created</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-[#f7931a]">{stats.total_participants}</p>
            <p className="text-sm text-gray-500">Participants</p>
          </div>
        </div>

        {stats.total_value_by_currency.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">By Currency</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-1 font-medium">Currency</th>
                  <th className="py-1 font-medium text-right">Bills</th>
                  <th className="py-1 font-medium text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {stats.total_value_by_currency.map((c) => (
                  <tr key={c.currency} className="border-b border-gray-100">
                    <td className="py-1 font-medium">{c.currency}</td>
                    <td className="py-1 text-right">{c.count}</td>
                    <td className="py-1 text-right">{c.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <BarList title="Bills per Day" data={stats.bills_over_time} />
        <BarList title="Participants per Day" data={stats.participants_over_time} />
      </div>
    </div>
  );
}
