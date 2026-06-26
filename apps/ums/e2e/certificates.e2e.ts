/**
 * BMI UMS E2E — Certificate Verification Happy Paths
 *
 * Covers:
 *   1. The public /verify route is accessible without login
 *   2. The verification form accepts a certificate ID
 *   3. A known-bad ID shows an appropriate "not found" response
 *   4. (Admin) /certificates route loads the certificate management view
 */
import { test, expect } from "@playwright/test";
import {
  loginAs,
  navigateTo,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from "./helpers";

test.describe("Certificate Verification (public route)", () => {
  test("verify page is accessible without authentication", async ({ page }) => {
    await page.goto("/verify");
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/login/);
    // Some verification-related text must appear
    await expect(
      page.getByText(/(verify|certificate|document)/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("verification form accepts an ID input", async ({ page }) => {
    await page.goto("/verify");
    const idInput = page
      .locator("input[type='text'], input[placeholder*='ID' i]")
      .first();
    await expect(idInput).toBeVisible({ timeout: 10_000 });
    await idInput.fill("INVALID-CERT-ID-12345");
    // Should not throw — button must remain clickable
    const verifyBtn = page.getByRole("button", {
      name: /(verify|check|search)/i,
    });
    await expect(verifyBtn.first()).toBeEnabled({ timeout: 5_000 });
  });

  test("invalid certificate ID returns not-found feedback", async ({
    page,
  }) => {
    await page.goto("/verify");
    const idInput = page
      .locator("input[type='text'], input[placeholder*='ID' i]")
      .first();
    await idInput.fill("INVALID-CERT-ID-12345");
    const verifyBtn = page
      .getByRole("button", { name: /(verify|check|search)/i })
      .first();
    await verifyBtn.click();

    // Expect some form of "not found" / "invalid" message
    await expect(
      page.getByText(/(not found|invalid|no record|error)/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Certificates Module (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await navigateTo(page, "Certificates");
  });

  test("certificates page heading is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /certificate/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("certificate table or list is rendered", async ({ page }) => {
    // Either a table or a list of certificate cards should appear
    const content = page.locator("table, [data-testid='cert-list']").first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});
