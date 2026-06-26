/**
 * BMI UMS E2E — Dashboard Happy Paths
 *
 * Covers:
 *   1. Dashboard stat cards render after login
 *   2. Revenue trend chart is visible
 *   3. Recent activity panel is visible
 *   4. "New Admission" button opens the student registration modal
 */
import { test, expect } from "@playwright/test";
import { loginAs, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
  });

  test("four stat cards are rendered", async ({ page }) => {
    await expect(page.getByText("Total Students")).toBeVisible();
    await expect(page.getByText("YTD Revenue")).toBeVisible();
    await expect(page.getByText("New Admissions")).toBeVisible();
    await expect(page.getByText("Upcoming Events")).toBeVisible();
  });

  test("financial performance chart section is visible", async ({ page }) => {
    await expect(page.getByText("Financial Performance")).toBeVisible();
  });

  test("recent activity panel is visible", async ({ page }) => {
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("New Admission button opens registration modal", async ({ page }) => {
    await page.getByRole("button", { name: /new admission/i }).click();
    // The registration modal should appear
    await expect(
      page.getByRole("dialog").or(page.getByText(/student registration/i)),
    ).toBeVisible({ timeout: 5_000 });
  });
});
