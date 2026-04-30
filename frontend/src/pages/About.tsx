import SEO from "../components/SEO";

const faq = [
  {
    q: "Is SatSplit free?",
    a: "Yes. SatSplit charges no fees. Standard Lightning Network routing fees may apply on the payer's wallet.",
  },
  {
    q: "Do I need an account?",
    a: "No. Neither the bill creator nor the people paying need to sign up or share any personal details.",
  },
  {
    q: "Does SatSplit hold the money?",
    a: "No. SatSplit is non-custodial. Payments go directly from each payer to the bill creator's Lightning address.",
  },
  {
    q: "What is a Lightning address?",
    a: "A human-readable identifier that looks like an email (for example you@walletofsatoshi.com) and resolves to a Lightning payment endpoint.",
  },
  {
    q: "Which wallets work?",
    a: "Any Lightning wallet that can pay a BOLT11 invoice — including Wallet of Satoshi, Phoenix, Breez, Zeus, Alby, Cash App, and Strike.",
  },
  {
    q: "Can I split a bill in dollars or euros?",
    a: "Yes. Bills can be entered in fiat currency and converted to sats at current rates when each person pays.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "SatSplit",
      url: "https://satsplit.app/",
      logo: "https://satsplit.app/logo.png",
      sameAs: [
        "https://github.com/btc2bgroup/satsplit",
        "https://btc2bgroup.com",
      ],
    },
    {
      "@type": "HowTo",
      name: "How to split a bill with Bitcoin Lightning using SatSplit",
      description:
        "Create a shared bill, share the link, and have each person pay their share via Lightning invoice directly to the creator's Lightning address.",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Enter the bill details",
          text: "The bill creator enters the total, currency, number of people, and their Lightning address.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Share the link",
          text: "A unique link is generated that can be shared with everyone splitting the bill.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Each person pays their share",
          text: "Each participant opens the link, enters their name, and receives a Lightning invoice for their share.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Funds settle directly",
          text: "Payments go directly to the bill creator's Lightning address. No middleman, no custody.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function About() {
  return (
    <div className="space-y-6">
      <SEO
        title="About SatSplit — How Lightning Bill Splitting Works"
        description="SatSplit is a free, non-custodial way to split bills and settle instantly over the Bitcoin Lightning Network. No accounts, no apps, no middleman."
        path="/about"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        <h2 className="text-base font-semibold text-gray-900 pt-2">Frequently asked questions</h2>
        <dl className="space-y-3">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-gray-900">{f.q}</dt>
              <dd className="mt-1">{f.a}</dd>
            </div>
          ))}
        </dl>
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