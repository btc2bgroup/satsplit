import { test, expect, type Page } from "@playwright/test";

/**
 * LUD-21 payment verification.
 *
 * A real Lightning settlement is not reproducible in CI, so the API is route-mocked and
 * these tests cover the UI contract: what the owner and the payer see as an invoice goes
 * from unpaid to verified, and the fallback when the wallet cannot be verified.
 */

const CODE = "e2ecode";

const participant = (overrides: Record<string, unknown> = {}) => ({
  id: "11111111-1111-1111-1111-111111111111",
  name: "Alice",
  share_amount_msats: 50_000_000,
  share_amount_fiat: 25,
  status: "invoice_created",
  bolt11_invoice: "lnbc250n1pexample",
  payment_hash: null,
  verifiable: true,
  verified: false,
  preimage: null,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const bill = (participants: unknown[]) => ({
  id: "22222222-2222-2222-2222-222222222222",
  short_code: CODE,
  amount: 50,
  currency: "USD",
  num_people: 2,
  lightning_address: "test@example.com",
  description: "Dinner",
  participant_names: null,
  created_at: "2026-01-01T00:00:00Z",
  participants,
});

interface MockOptions {
  /** What the verify endpoint reports. */
  settles: boolean;
  verifiable?: boolean;
  /** Set to fail verify with this status instead of returning a participant. */
  verifyStatus?: number;
}

async function mockApi(page: Page, options: MockOptions) {
  const { settles, verifiable = true, verifyStatus } = options;
  let settled = false;
  const calls = { verify: 0 };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const current = participant({
      verifiable,
      status: settled ? "paid" : "invoice_created",
      verified: settled,
      preimage: settled ? "ab".repeat(32) : null,
    });

    if (url.pathname.endsWith("/verify") && method === "POST") {
      calls.verify += 1;
      if (verifyStatus) {
        await route.fulfill({ status: verifyStatus, json: { detail: "not supported" } });
        return;
      }
      if (settles) settled = true;
      await route.fulfill({ json: participant({ verifiable, status: settled ? "paid" : "invoice_created", verified: settled }) });
      return;
    }

    if (url.pathname.endsWith("/join") && method === "POST") {
      await route.fulfill({
        status: 201,
        json: { participant: current, bolt11_invoice: current.bolt11_invoice },
      });
      return;
    }

    if (url.pathname.endsWith("/status")) {
      await route.fulfill({
        json: { short_code: CODE, num_people: 2, joined: 1, paid: settled ? 1 : 0 },
      });
      return;
    }

    await route.fulfill({ json: bill([current]) });
  });

  return calls;
}

async function asOwner(page: Page) {
  await page.addInitScript((code) => {
    localStorage.setItem("created_bills", JSON.stringify([code]));
  }, CODE);
}

test.describe("LUD-21 verification — bill owner", () => {
  test("an unpaid share is confirmed automatically once it settles", async ({ page }) => {
    await mockApi(page, { settles: true });
    await asOwner(page);

    await page.goto(`/bill/${CODE}`);

    await expect(page.locator("text=Paid ✓ verified")).toBeVisible({ timeout: 15000 });
    // A verified payment cannot sensibly be un-marked.
    await expect(page.locator("text=Mark Unpaid")).toHaveCount(0);
  });

  test("checking an unpaid share reports that no payment has arrived", async ({ page }) => {
    await mockApi(page, { settles: false });
    await asOwner(page);

    await page.goto(`/bill/${CODE}`);

    await page.click("text=Check payment");
    await expect(page.locator("text=No payment received yet.")).toBeVisible();
    await expect(page.locator("text=Unpaid")).toBeVisible();
  });

  test("falls back to the manual toggle when the wallet cannot be verified", async ({ page }) => {
    const calls = await mockApi(page, { settles: false, verifiable: false });
    await asOwner(page);

    await page.goto(`/bill/${CODE}`);

    await expect(page.locator("text=Mark Paid")).toBeVisible();
    await expect(
      page.locator("text=This wallet doesn't support automatic payment verification."),
    ).toBeVisible();
    await expect(page.locator("text=Check payment")).toHaveCount(0);
    expect(calls.verify).toBe(0);
  });
});

test.describe("LUD-21 verification — payer", () => {
  test("the payer sees the invoice and a waiting hint while unpaid", async ({ page }) => {
    await mockApi(page, { settles: false });

    await page.goto(`/bill/${CODE}`);
    await page.fill('[placeholder="Enter your name"]', "Alice");
    await page.click("text=Join & Get Invoice");

    await expect(page.locator("text=Pay Your Share")).toBeVisible();
    await expect(
      page.locator("text=Waiting for payment — this updates automatically."),
    ).toBeVisible();
  });

  test("the payer sees a confirmation once their payment settles", async ({ page }) => {
    await mockApi(page, { settles: true });

    await page.goto(`/bill/${CODE}`);
    await page.fill('[placeholder="Enter your name"]', "Alice");
    await page.click("text=Join & Get Invoice");

    // No assertion on the intermediate invoice view: the first verify poll fires on
    // mount, so a fast response settles it before the QR is ever observable.
    await expect(page.locator("text=Payment received")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Copy Invoice")).toHaveCount(0);
  });

  test("the payer keeps a plain invoice when verification is unsupported", async ({ page }) => {
    const calls = await mockApi(page, { settles: true, verifiable: false });

    await page.goto(`/bill/${CODE}`);
    await page.fill('[placeholder="Enter your name"]', "Alice");
    await page.click("text=Join & Get Invoice");

    await expect(page.locator("text=Pay Your Share")).toBeVisible();
    await expect(page.locator("text=Copy Invoice")).toBeVisible();
    expect(calls.verify).toBe(0);
  });
});
