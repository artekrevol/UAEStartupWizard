import { test, expect, Page } from '@playwright/test';

test.describe('Free Zone Comparison Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the free zones page
    await page.goto('/freezones');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("UAE Free Zones")');
  });

  test('Should allow comparing multiple free zones', async ({ page }) => {
    // Select at least 2 free zones for comparison
    await page.check('.freezone-card:nth-child(1) input[type="checkbox"]');
    await page.check('.freezone-card:nth-child(3) input[type="checkbox"]');
    
    // Click compare button
    await page.click('button:has-text("Compare Selected")');
    
    // Verify comparison view is loaded
    await expect(page.locator('h1:has-text("Free Zone Comparison")')).toBeVisible();
    
    // Verify at least 2 free zones are displayed in comparison table
    const comparisonCards = await page.locator('.comparison-card').count();
    expect(comparisonCards).toBeGreaterThanOrEqual(2);
    
    // Verify comparison metrics are displayed
    await expect(page.locator('text=License Cost')).toBeVisible();
    await expect(page.locator('text=Setup Time')).toBeVisible();
    await expect(page.locator('text=Visa Quota')).toBeVisible();
  });

  test('Should filter free zones based on criteria', async ({ page }) => {
    // Open the filter panel
    await page.click('button:has-text("Filter")');
    
    // Apply location filter
    await page.selectOption('select[name="location"]', 'Dubai');
    
    // Apply business activity filter
    await page.selectOption('select[name="businessActivity"]', 'Trading');
    
    // Click apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Verify filtered results
    await expect(page.locator('.filter-summary')).toContainText('Dubai');
    await expect(page.locator('.filter-summary')).toContainText('Trading');
    
    // Get number of results
    const filteredCount = await page.locator('.freezone-card').count();
    
    // Clear filters
    await page.click('button:has-text("Clear Filters")');
    
    // Get number of results after clearing
    const totalCount = await page.locator('.freezone-card').count();
    
    // Verify that filtering reduced the number of results
    expect(filteredCount).toBeLessThan(totalCount);
  });

  test('Should sort free zones by different criteria', async ({ page }) => {
    // Get the initial order of free zone names
    const initialNames = await page.$$eval('.freezone-card .freezone-name', 
      elements => elements.map(el => el.textContent?.trim()));
    
    // Sort by cost (low to high)
    await page.selectOption('select[name="sortBy"]', 'costLowToHigh');
    
    // Wait for the sorting to take effect
    await page.waitForTimeout(500);
    
    // Get the new order of free zone names
    const sortedNames = await page.$$eval('.freezone-card .freezone-name', 
      elements => elements.map(el => el.textContent?.trim()));
    
    // Verify the order has changed
    expect(sortedNames).not.toEqual(initialNames);
    
    // Sort by popularity (descending)
    await page.selectOption('select[name="sortBy"]', 'popularityDesc');
    
    // Wait for the sorting to take effect
    await page.waitForTimeout(500);
    
    // Get the popularity-sorted names
    const popularitySortedNames = await page.$$eval('.freezone-card .freezone-name', 
      elements => elements.map(el => el.textContent?.trim()));
    
    // Verify the order has changed again
    expect(popularitySortedNames).not.toEqual(sortedNames);
  });

  test('Should display detailed information for a selected free zone', async ({ page }) => {
    // Click on the first free zone card to view details
    await page.click('.freezone-card:first-child');
    
    // Verify the detail page is loaded
    await expect(page.locator('.freezone-detail-header')).toBeVisible();
    
    // Verify the presence of key information sections
    await expect(page.locator('h2:has-text("Overview")')).toBeVisible();
    await expect(page.locator('h2:has-text("Benefits")')).toBeVisible();
    await expect(page.locator('h2:has-text("License Types")')).toBeVisible();
    await expect(page.locator('h2:has-text("Setup Process")')).toBeVisible();
    
    // Check for the presence of a contact or inquiry form
    await expect(page.locator('form.inquiry-form, .contact-section')).toBeVisible();
  });

  test('Should allow saving free zones to favorites', async ({ page }) => {
    // First, ensure we're logged in
    if (!await page.locator('.user-profile-icon').isVisible()) {
      // Navigate to login page
      await page.goto('/login');
      
      // Login with test credentials
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123');
      await page.click('button:has-text("Login")');
      
      // Navigate back to free zones page
      await page.goto('/freezones');
    }
    
    // Click the favorite icon on the first free zone
    await page.click('.freezone-card:first-child .favorite-icon');
    
    // Verify success notification
    await expect(page.locator('text=Added to favorites')).toBeVisible();
    
    // Navigate to favorites page
    await page.click('a:has-text("Favorites")');
    
    // Verify the free zone appears in favorites list
    await expect(page.locator('.favorites-list .freezone-card')).toBeVisible();
    
    // Remove from favorites
    await page.click('.favorites-list .freezone-card:first-child .favorite-icon');
    
    // Verify removal notification
    await expect(page.locator('text=Removed from favorites')).toBeVisible();
  });
});