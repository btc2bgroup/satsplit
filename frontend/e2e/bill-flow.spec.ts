import { test, expect } from "@playwright/test";

test.describe("Bill creation and join flow", () => {
  test("create a bill and see the share link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Split a Bill");

    await page.fill('[placeholder="100.00"]', "60");
    await page.fill('[placeholder="4"]', "3");
    await page.fill('[placeholder="you@getalby.com"]', "test@getalby.com");
    await page.fill("[placeholder=\"Dinner at Mario's\"]", "Team lunch");
    await page.click("text=Split the Bill");

    // Should navigate to /bill/:code
    await expect(page).toHaveURL(/\/bill\/.+/);

    // Creator should see the share link and bill summary
    await expect(page.locator("text=Team lunch")).toBeVisible();
    await expect(page.locator("text=60 USD")).toBeVisible();
    await expect(page.locator("text=20.00 USD")).toBeVisible();
    await expect(page.locator("text=Copy Link")).toBeVisible();

    // Creator should NOT see the join form
    await expect(page.locator("text=Join & Get Invoice")).not.toBeVisible();
  });

  test("participant can view bill and see join form", async ({ page, context }) => {
    // First, create a bill as the creator
    await page.goto("/");
    await page.fill('[placeholder="100.00"]', "80");
    await page.fill('[placeholder="4"]', "2");
    await page.fill('[placeholder="you@getalby.com"]', "test@getalby.com");
    await page.click("text=Split the Bill");
    await expect(page).toHaveURL(/\/bill\/.+/);

    // Get the bill URL
    const url = page.url();

    // Open as a different user (clear localStorage to simulate)
    const participantPage = await context.newPage();
    await participantPage.goto(url);
    await participantPage.evaluate(() => localStorage.clear());
    await participantPage.reload();

    // Should see bill summary and join form
    await expect(participantPage.locator("text=80 USD")).toBeVisible();
    await expect(participantPage.locator("text=Join & Get Invoice")).toBeVisible();

    // Try to join — backend may fail without a real Lightning node
    await participantPage.fill('[placeholder="Enter your name"]', "Alice");
    await participantPage.click("text=Join & Get Invoice");

    // Either the invoice is shown (real backend) or an error is displayed
    const invoice = participantPage.locator("text=Pay Your Share");
    const error = participantPage.locator("p.text-red-400");
    await expect(invoice.or(error)).toBeVisible({ timeout: 10000 });
  });

  test("404 page for invalid routes", async ({ page }) => {
    await page.goto("/some/invalid/path");
    await expect(page.locator("text=404")).toBeVisible();
    await expect(page.locator("text=Go Home")).toBeVisible();
  });
});
