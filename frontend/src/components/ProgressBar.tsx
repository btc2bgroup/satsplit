import type { BillStatus } from "../api";

export default function ProgressBar({ status }: { status: BillStatus }) {
  const joinedPct = (status.joined / status.num_people) * 100;
  const paidPct = (status.paid / status.num_people) * 100;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Joined</span>
          <span>
            {status.joined}/{status.num_people}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#f7931a] h-2 rounded-full transition-all duration-500"
            style={{ width: `${joinedPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Paid</span>
          <span>
            {status.paid}/{status.num_people}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
