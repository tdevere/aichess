import { test, expect } from '@playwright/test';

test.describe('Puzzle Solving Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to puzzles page
    await page.goto('/puzzles');
    await page.waitForLoadState('networkidle');
  });

  test('should load and display puzzle', async ({ page }) => {
    // Check for puzzle elements
    await expect(page.locator('text=Chess Puzzle')).toBeVisible();
    await expect(page.locator('text=/Difficulty:/i')).toBeVisible();
    await expect(page.locator('text=/Theme:/i')).toBeVisible();
    await expect(page.locator('text=/Rating:/i')).toBeVisible();
    
    // Check for turn indicator
    await expect(page.locator('text=/(White|Black) to move/i')).toBeVisible();
    
    // Check for chessboard
    await expect(page.locator('[data-testid="board"], .chessboard')).toBeVisible();
  });

  test('should show hint when clicking hint button', async ({ page }) => {
    // Wait for puzzle to load
    await page.waitForSelector('text=Chess Puzzle');
    
    // Click hint button
    const hintButton = page.locator('button:has-text("Show Hint")');
    await expect(hintButton).toBeVisible();
    await hintButton.click();
    
    // Button should change to "Hint Active"
    await expect(page.locator('button:has-text("Hint Active")')).toBeVisible();
    
    // Hint counter should show
    await expect(page.locator('text=/Hints:.*1/i')).toBeVisible();
  });

  test('should show solution when clicking solution button', async ({ page }) => {
    await page.waitForSelector('text=Chess Puzzle');
    
    // Click solution button
    const solutionButton = page.locator('button:has-text("Show Solution")');
    await expect(solutionButton).toBeVisible();
    await solutionButton.click();
    
    // Solution panel should appear
    await expect(page.locator('text=/Complete Solution/i')).toBeVisible();
    
    // Should show move sequence
    await expect(page.locator('text=/1\\./i')).toBeVisible();
    
    // Hint counter should show 3 (penalty for solution)
    await expect(page.locator('text=/Hints:.*3/i')).toBeVisible();
  });

  test('should retry puzzle', async ({ page }) => {
    await page.waitForSelector('text=Chess Puzzle');
    
    // Show hint first
    await page.click('button:has-text("Show Hint")');
    await expect(page.locator('text=/Hints:.*1/i')).toBeVisible();
    
    // Click retry button
    const retryButton = page.locator('button:has-text("Retry Puzzle")');
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    
    // Timer should reset
    await expect(page.locator('text=/Time:.*0:0/i')).toBeVisible();
    
    // Hint count should remain (penalty persists)
    await expect(page.locator('text=/Hints:.*1/i')).toBeVisible();
  });

  test('should skip to next puzzle', async ({ page }) => {
    await page.waitForSelector('text=Chess Puzzle');
    
    // Get current puzzle rating
    const ratingText = await page.locator('text=/Rating:.*\\d+/i').textContent();
    const currentRating = ratingText?.match(/\d+/)?.[0];
    
    // Click skip button
    await page.click('button:has-text("Skip Puzzle")');
    
    // Should load new puzzle (rating likely different)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    const newRatingText = await page.locator('text=/Rating:.*\\d+/i').textContent();
    const newRating = newRatingText?.match(/\d+/)?.[0];
    
    // Timer should be reset
    await expect(page.locator('text=/Time:.*0:0/i')).toBeVisible();
  });

  test('should filter puzzles by difficulty', async ({ page }) => {
    await page.waitForSelector('text=Chess Puzzle');
    
    // Select beginner difficulty
    await page.selectOption('select', 'beginner');
    
    // Wait for new puzzle to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Should show beginner difficulty
    await expect(page.locator('text=/Difficulty:.*beginner/i')).toBeVisible();
  });

  test('should show elapsed time', async ({ page }) => {
    await page.waitForSelector('text=Chess Puzzle');
    
    // Check initial time
    await expect(page.locator('text=/Time:.*0:0/i')).toBeVisible();
    
    // Wait a few seconds
    await page.waitForTimeout(3000);
    
    // Time should have advanced
    await expect(page.locator('text=/Time:.*0:[1-9]/i')).toBeVisible();
  });
});
