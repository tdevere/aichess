import { test, expect } from '@playwright/test';

test.describe('Chess Game Flow', () => {
  let authContext: any;

  test.beforeAll(async ({ browser }) => {
    // Create authenticated context
    const page = await browser.newPage();
    await page.goto('/register');
    
    const testUser = {
      username: `player_${Date.now()}`,
      email: `player_${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };
    
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
    await page.close();
  });

  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should navigate to play page', async ({ page }) => {
    await page.goto('/');
    
    // Click play button
    await page.click('text=Play Chess');
    
    // Should navigate to play page
    await expect(page).toHaveURL('/play');
  });

  test('should display time control options', async ({ page }) => {
    await page.goto('/play');
    
    // Should show time control buttons
    await expect(page.locator('text=Bullet')).toBeVisible();
    await expect(page.locator('text=Blitz')).toBeVisible();
    await expect(page.locator('text=Rapid')).toBeVisible();
    await expect(page.locator('text=Daily')).toBeVisible();
  });

  test('should show active games if any', async ({ page }) => {
    await page.goto('/');
    
    // Check for active games section (may be empty)
    const activeGamesSection = page.locator('text=/active games?/i');
    
    // Should either show no games or list games
    await expect(page.locator('text=/no.*active.*games|active games?/i')).toBeVisible({ timeout: 5000 });
  });

  test('should load bot profiles page', async ({ page }) => {
    await page.goto('/play');
    
    // Look for bot play option (if implemented in UI)
    const botButton = page.locator('text=/play.*bot|bot.*game/i');
    
    if (await botButton.isVisible()) {
      await botButton.click();
      
      // Should show bot selection
      await expect(page.locator('text=/rookie|amateur|grandmaster/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
