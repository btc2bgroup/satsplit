import type { BillOut } from "../api";

export default function BillSummary({ bill }: { bill: BillOut }) {
  const perPerson = (bill.amount / bill.num_people).toFixed(2);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">
        {bill.description || "Bill"}
      </h2>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-gray-500">Total</span>
        <span className="text-right font-medium">
          {bill.amount} {bill.currency}
        </span>
        <span className="text-gray-500">Split between</span>
        <span className="text-right font-medium">{bill.num_people} people</span>
        <span className="text-gray-500">Per person</span>
        <span className="text-right font-medium text-[#f7931a]">
          {perPerson} {bill.currency}
        </span>
      </div>
    </div>
  );
}
