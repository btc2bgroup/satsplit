import type { BillOut } from "../api";

export default function BillSummary({ bill }: { bill: BillOut }) {
  const perPerson = (bill.amount / bill.num_people).toFixed(2);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">
        {bill.description || "Bill"}
      </h2>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-slate-400">Total</span>
        <span className="text-right font-medium">
          {bill.amount} {bill.currency}
        </span>
        <span className="text-slate-400">Split between</span>
        <span className="text-right font-medium">{bill.num_people} people</span>
        <span className="text-slate-400">Per person</span>
        <span className="text-right font-medium text-[#f7931a]">
          {perPerson} {bill.currency}
        </span>
      </div>
    </div>
  );
}
