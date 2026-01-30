import { useState } from "react";
import { api, type ParticipantOut } from "../api";

interface Props {
  shortCode: string;
  participants: ParticipantOut[];
  onStatusChanged: () => void;
}

export default function ParticipantList({ shortCode, participants, onStatusChanged }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(p: ParticipantOut) {
    const newStatus = p.status === "paid" ? "invoice_created" : "paid";
    setLoading(p.id);
    try {
      await api.updateParticipantStatus(shortCode, p.id, newStatus);
      onStatusChanged();
    } finally {
      setLoading(null);
    }
  }

  if (participants.length === 0) {
    return <p className="text-slate-400 text-sm">No participants yet.</p>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Participants</h3>
      <ul className="space-y-3">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-slate-200">{p.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "paid"
                    ? "bg-green-900/50 text-green-400"
                    : "bg-yellow-900/50 text-yellow-400"
                }`}
              >
                {p.status === "paid" ? "Paid" : "Unpaid"}
              </span>
            </div>
            <button
              onClick={() => toggle(p)}
              disabled={loading === p.id}
              className="text-sm px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50"
            >
              {p.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
