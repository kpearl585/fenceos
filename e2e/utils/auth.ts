import { Page } from '@playwright/test';

/**
 * Authentication utilities for E2E tests
 *
 * Uses Supabase authentication via the login page
 */

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Sign In")');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard/**', { timeout: 10000 });
}

export async function loginWithTestUser(page: Page) {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'test123456';

  await login(page, email, password);
}

export async function logout(page: Page) {
  // Navigate to logout endpoint
  await page.goto('/auth/logout');
  await page.waitForURL('/login', { timeout: 5000 });
}
