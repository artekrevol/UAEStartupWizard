import { test, expect, Page } from '@playwright/test';

// Helper function to fill out a form step and click next
async function completeFormStep(page: Page, fieldSelectors: Record<string, string>, values: Record<string, string>, nextButtonSelector: string) {
  // Fill in all fields in the form
  for (const [field, selector] of Object.entries(fieldSelectors)) {
    await page.fill(selector, values[field]);
  }
  
  // Click the next button to proceed
  await page.click(nextButtonSelector);
}

test.describe('Registration Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the registration wizard start page
    await page.goto('/register');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("Business Registration")');
  });

  test('Should complete all steps of registration wizard successfully', async ({ page }) => {
    // Step 1: Personal Information
    await completeFormStep(
      page,
      {
        firstName: 'input[name="firstName"]',
        lastName: 'input[name="lastName"]',
        email: 'input[name="email"]',
        phone: 'input[name="phone"]',
        password: 'input[name="password"]',
        confirmPassword: 'input[name="confirmPassword"]'
      },
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+97150123456789',
        password: 'SecureP@ss123',
        confirmPassword: 'SecureP@ss123'
      },
      'button:has-text("Next")'
    );
    
    // Verify step 2 is loaded
    await expect(page.locator('h2:has-text("Business Details")')).toBeVisible();
    
    // Step 2: Business Details
    await completeFormStep(
      page,
      {
        businessName: 'input[name="businessName"]',
        businessType: 'select[name="businessType"]',
        industry: 'select[name="industry"]',
        employeeCount: 'input[name="employeeCount"]'
      },
      {
        businessName: 'Acme Trading LLC',
        businessType: 'LLC',
        industry: 'Trading',
        employeeCount: '10'
      },
      'button:has-text("Next")'
    );
    
    // Verify step 3 is loaded
    await expect(page.locator('h2:has-text("Free Zone Selection")')).toBeVisible();
    
    // Step 3: Free Zone Selection
    // Select preferred free zone checkbox
    await page.check('input[name="preferredFreeZones"][value="DMCC"]');
    await page.check('input[name="preferredFreeZones"][value="JAFZA"]');
    
    // Click next
    await page.click('button:has-text("Next")');
    
    // Verify step 4 is loaded
    await expect(page.locator('h2:has-text("Document Requirements")')).toBeVisible();
    
    // Step 4: Document Requirements (acknowledgment step)
    await page.check('input[name="acknowledgement"]');
    await page.click('button:has-text("Complete Registration")');
    
    // Verify successful registration
    await expect(page.locator('h1:has-text("Registration Complete")')).toBeVisible();
    await expect(page.locator('text=Thank you for registering')).toBeVisible();
    
    // Verify dashboard redirect button is available
    await expect(page.locator('a:has-text("Go to Dashboard")')).toBeVisible();
  });
  
  test('Should validate required fields', async ({ page }) => {
    // Try to submit first step without filling required fields
    await page.click('button:has-text("Next")');
    
    // Check for validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Fill just the email field with invalid format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button:has-text("Next")');
    
    // Check for validation errors
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Fill password fields with mismatched passwords
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
    await page.click('button:has-text("Next")');
    
    // Check for validation error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });
  
  test('Should allow saving progress and resuming later', async ({ page }) => {
    // Step 1: Fill personal information
    await completeFormStep(
      page,
      {
        firstName: 'input[name="firstName"]',
        lastName: 'input[name="lastName"]',
        email: 'input[name="email"]',
        phone: 'input[name="phone"]',
        password: 'input[name="password"]',
        confirmPassword: 'input[name="confirmPassword"]'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+97150987654321',
        password: 'SecureP@ss123',
        confirmPassword: 'SecureP@ss123'
      },
      'button:has-text("Next")'
    );
    
    // On step 2, click the "Save and continue later" button
    await page.click('button:has-text("Save and continue later")');
    
    // Verify save confirmation
    await expect(page.locator('text=Your progress has been saved')).toBeVisible();
    
    // Click logout or return to homepage
    await page.click('a:has-text("Return to homepage")');
    
    // Simulate returning later by going to login page
    await page.goto('/login');
    
    // Login with the credentials
    await page.fill('input[name="email"]', 'jane.smith@example.com');
    await page.fill('input[name="password"]', 'SecureP@ss123');
    await page.click('button:has-text("Login")');
    
    // Verify there's a prompt to continue registration
    await expect(page.locator('text=You have an incomplete registration')).toBeVisible();
    await page.click('button:has-text("Continue Registration")');
    
    // Verify we're back at step 2
    await expect(page.locator('h2:has-text("Business Details")')).toBeVisible();
    
    // Verify the form remembers we're on step 2
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
  });
});