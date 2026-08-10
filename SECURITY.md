# Security Policy

## Reporting a Vulnerability

We take the security of SatSplit seriously. If you discover a security vulnerability, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report it privately via email:

📧 **ton@btc2bgroup.com**

Please include as much of the following as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue (proof of concept if available)
- Affected component (backend API, frontend, BTCPay integration, etc.)
- Any suggested fixes or mitigations

## What to Expect

- **Acknowledgement:** We aim to acknowledge your report within 72 hours.
- **Updates:** We will keep you informed of our progress while we investigate and remediate the issue.
- **Disclosure:** We ask that you give us a reasonable amount of time to address the issue before any public disclosure. We are happy to coordinate disclosure timing with you.
- **Credit:** With your permission, we will credit you for the discovery once the issue is resolved.


## Outbound requests to third-party URLs

SatSplit makes server-side requests to URLs supplied by third parties: the LNURL-pay
callback for a bill's lightning address, and the [LUD-21](https://github.com/lnurl/luds/blob/luds/21.md)
`verify` URL returned by that callback. Because anyone who can create a bill controls those
values, a verify URL is only stored and fetched when it:

- uses HTTPS,
- is on the same domain as the LNURL callback or the lightning address, and
- resolves to a publicly routable address (loopback, private, link-local, and reserved
  ranges are rejected, and the check is repeated immediately before each fetch).

Redirects are not followed, and response bodies are size-capped. A URL that fails any check is
discarded, and the participant falls back to manual paid/unpaid marking.

## Safe Harbor

We will not pursue legal action against researchers who:

- Act in good faith and avoid privacy violations, data destruction, or service disruption
- Do not exploit a vulnerability beyond what is necessary to demonstrate it
- Report the issue promptly and give us reasonable time to remediate

Thank you for helping keep SatSplit and its users safe!