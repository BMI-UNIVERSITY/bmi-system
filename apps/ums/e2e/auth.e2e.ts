/**
 * BMI UMS E2E — Authentication Happy Paths
 *
 * Covers:
 *   1. Login page renders correctly
 *   2. Successful admin login → dashboard loads
 *   3. Wrong credentials shows error message
 *   4. Logout returns to login page
 */
import { test, expect } from "@playwright/test";
import {
  loginAs,
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
} from "./helpers";

test.describe("Authentication", () => {
  test("login page renders the university branding", async ({ page }) => {
    await page.goto("/");
    // The login page must display the university name
    await expect(page.getByText(/BMI University/i)).toBeVisible();
    // Email and password fields must be present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Submit button must exist
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("wrong credentials shows an error message", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="email"]', "nobody@bmi.edu");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Error feedback must appear — the exact copy may vary
    await expect(
      page.getByText(/(invalid|incorrect|failed|error)/i),
    ).toBeVisible({ timeout: 10_000 });
    // Must still be on the login page
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("successful admin login lands on the dashboard", async ({ page }) => {
    await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    // URL should be at dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
    // Stat cards must be rendered
    await expect(page.getByText("Total Students")).toBeVisible();
  });

  test("logout clears session and returns to login page", async ({ page }) => {
    await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    // Open sidebar and click logout
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("button", { name: /log out/i }).click();

    // Should be back on the login form
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
