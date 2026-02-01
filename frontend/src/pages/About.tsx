export default function About() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">About SatSplit</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          SatSplit makes it easy to split any bill with friends and settle
          instantly over the Bitcoin Lightning Network. No sign-ups, no apps to
          install, no bank details to share.
        </p>
        <p>
          Simply enter the total amount, choose how many people are splitting,
          and share the link. Each person pays their share directly via a
          Lightning invoice. Payments are fast, cheap, and final.
        </p>
        <h2 className="text-base font-semibold text-gray-900 pt-2">How it works</h2>
        <ol className="space-y-2">
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">1.</span>
            The bill creator enters the total, currency, number of people, and their Lightning address.
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">2.</span>
            A unique link is generated that can be shared with everyone splitting the bill.
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">3.</span>
            Each participant opens the link, enters their name, and receives a Lightning invoice for their share.
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-gray-900">4.</span>
            Payments go directly to the bill creator's Lightning address. No middleman, no custody.
          </li>
        </ol>
        <h2 className="text-base font-semibold text-gray-900 pt-2">Why Lightning?</h2>
        <p>
          The Lightning Network enables instant Bitcoin payments with minimal
          fees. It works globally, 24/7, and doesn't require anyone to share
          bank account details or wait for transfers to clear.
        </p>
        <div className="border-t border-gray-200 pt-4 mt-4 text-center text-gray-500 space-y-1">
          <p>
            SatSplit is open source and available on{" "}
            <a
              href="https://github.com/btc2bgroup/satsplit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f7931a] hover:underline font-medium"
            >
              GitHub
            </a>
            .
          </p>
          <p>
            Powered by{" "}
            <a
              href="https://btc2bgroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f7931a] hover:underline font-medium"
            >
              btc2bgroup.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
