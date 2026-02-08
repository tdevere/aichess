import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testUser = {
    username: `testuser${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };

  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    await page.click('button[type="submit"]');
    
    // Should redirect to home page after successful registration
    await expect(page).toHaveURL('/');
    
    // Should show user info or welcome message
    await expect(page.locator('text=Quick Play')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user
    await page.goto('/register');
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Logout via user menu
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(testUser.username) }).click();
    await page.getByText('Logout').click();
    
    // Now login
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });

  test('should reject login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit with empty fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/required|must be/i')).toBeVisible({ timeout: 3000 });
  });
});
