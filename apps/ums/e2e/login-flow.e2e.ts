import { test, expect } from '@playwright/test';

test.describe('Login & Dashboard Flow', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Assuming the app redirects to /login if not authenticated
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('user can log in, view dashboard, and log out', async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Fill in credentials (using mock/test data for E2E)
    // Wait for the form to be ready
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'test.student@hkmministries.org');
    await page.fill('input[type="password"]', 'SecurePass123!');

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 5. Verify dashboard content loads
    await expect(page.locator('h1')).toContainText(/Dashboard/i);
    // Verify balance or classes section exists
    await expect(page.locator('text=/Balance|Upcoming Invoices/i')).toBeVisible();

    // 6. Log out
    await page.click('button:has-text("Log out"), a:has-text("Log out"), [aria-label="Logout"]');
    
    // 7. Verify redirect back to login or home
    await expect(page).toHaveURL(/.*\/login/);
  });
});
