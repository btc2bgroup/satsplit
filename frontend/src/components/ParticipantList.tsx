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
    return <p className="text-gray-500 text-sm">No participants yet.</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
      <ul className="space-y-3">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-900">{p.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {p.status === "paid" ? "Paid" : "Unpaid"}
              </span>
            </div>
            <button
              onClick={() => toggle(p)}
              disabled={loading === p.id}
              className="text-sm px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
            >
              {p.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
