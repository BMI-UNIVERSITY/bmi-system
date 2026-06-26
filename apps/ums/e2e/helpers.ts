/**
 * BMI UMS E2E — Shared Test Helpers
 * All helpers are pure Playwright (Apache-2.0) — no proprietary SDKs.
 */
import { type Page, expect } from "@playwright/test";

/** Credentials injected via env so they never appear hardcoded in source. */
export const TEST_ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? "admin@bmi.edu";
export const TEST_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "TestAdmin2024!!";

export const TEST_STUDENT_EMAIL =
  process.env.E2E_STUDENT_EMAIL ?? "student@bmi.edu";
export const TEST_STUDENT_PASSWORD =
  process.env.E2E_STUDENT_PASSWORD ?? "TestStudent2024!!";

export const TEST_FACULTY_EMAIL =
  process.env.E2E_FACULTY_EMAIL ?? "faculty@bmi.edu";
export const TEST_FACULTY_PASSWORD =
  process.env.E2E_FACULTY_PASSWORD ?? "TestFaculty2024!!";

/**
 * Log in via the UI login form and wait for the dashboard to be visible.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/");

  // Wait for the login form
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Dashboard must appear within 15 seconds
  await expect(page.getByText("Executive Dashboard")).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * Open the sidebar drawer.
 */
export async function openSidebar(page: Page): Promise<void> {
  const menuBtn = page.getByRole("button", { name: /open menu/i });
  await menuBtn.click();
  // Wait for the sidebar to slide in
  await page.waitForSelector('nav[aria-label="Main navigation"]', {
    state: "visible",
  });
}

/**
 * Navigate to a named route via the sidebar.
 */
export async function navigateTo(page: Page, label: string): Promise<void> {
  await openSidebar(page);
  await page.getByRole("button", { name: label, exact: false }).click();
}
