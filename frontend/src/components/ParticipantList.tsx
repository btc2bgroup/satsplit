import { useState } from "react";
import { api, type ParticipantOut } from "../api";
import { useVerifyPolling } from "../hooks/useVerifyPolling";

interface Props {
  shortCode: string;
  participants: ParticipantOut[];
  predefinedNames?: string[] | null;
  onStatusChanged: () => void;
}

export default function ParticipantList({ shortCode, participants, predefinedNames, onStatusChanged }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unpaidVerifiableIds = participants
    .filter((p) => p.status !== "paid" && p.verifiable)
    .map((p) => p.id);

  useVerifyPolling(shortCode, unpaidVerifiableIds, () => onStatusChanged());

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

  async function verify(p: ParticipantOut) {
    setLoading(p.id);
    setErrors((prev) => ({ ...prev, [p.id]: "" }));
    try {
      const updated = await api.verifyParticipant(shortCode, p.id);
      if (updated.status !== "paid") {
        setErrors((prev) => ({ ...prev, [p.id]: "No payment received yet." }));
      }
      onStatusChanged();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [p.id]: (err as Error).message }));
    } finally {
      setLoading(null);
    }
  }

  const notJoinedNames = predefinedNames
    ? predefinedNames.filter(
        (n) => !participants.some((p) => p.name.toLowerCase() === n.toLowerCase()),
      )
    : [];

  if (participants.length === 0 && notJoinedNames.length === 0) {
    return <p className="text-gray-500 text-sm">No participants yet.</p>;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
      <ul className="space-y-3">
        {participants.map((p) => {
          const isPaid = p.status === "paid";
          return (
            <li key={p.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-900">{p.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {isPaid ? (p.verified ? "Paid ✓ verified" : "Paid") : "Unpaid"}
                  </span>
                </div>
                {/* A verified payment is proven by the recipient's own wallet — there is
                    nothing sensible to un-mark, so no toggle for those rows. */}
                {p.verified ? null : isPaid ? (
                  <button
                    onClick={() => toggle(p)}
                    disabled={loading === p.id}
                    className="text-sm px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                  >
                    Mark Unpaid
                  </button>
                ) : p.verifiable ? (
                  <button
                    onClick={() => verify(p)}
                    disabled={loading === p.id}
                    className="text-sm px-3 py-1 rounded-lg bg-[#f7931a] hover:bg-[#e8851a] text-white disabled:opacity-50"
                  >
                    {loading === p.id ? "Checking..." : "Check payment"}
                  </button>
                ) : (
                  <button
                    onClick={() => toggle(p)}
                    disabled={loading === p.id}
                    className="text-sm px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
              {!isPaid && !p.verifiable && (
                <p className="text-xs text-gray-400">
                  This wallet doesn't support automatic payment verification.
                </p>
              )}
              {errors[p.id] && <p className="text-xs text-red-600">{errors[p.id]}</p>}
            </li>
          );
        })}
        {notJoinedNames.map((name) => (
          <li key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                Not joined
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
