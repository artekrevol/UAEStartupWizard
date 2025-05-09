/**
 * End-to-End Test for User Registration Wizard
 * 
 * This test verifies the complete registration flow including:
 * 1. Filling out the registration form
 * 2. Validating form inputs
 * 3. Submitting the form
 * 4. Verifying successful registration
 */

import { test, expect, Page } from '@playwright/test';

test.describe('User Registration Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5000/register');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display registration form with all required fields', async () => {
    await expect(page.locator('h1:has-text("Create an Account")')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    
    // Check that all required form fields are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should validate form inputs and show error messages', async () => {
    // Submit form without filling in any fields
    await page.locator('button[type="submit"]').click();
    
    // Check that error messages are displayed
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Fill in invalid email
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('button[type="submit"]').click();
    
    // Check for email validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Fill in password that's too short
    await page.locator('input[name="password"]').fill('short');
    await page.locator('button[type="submit"]').click();
    
    // Check for password validation error
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should register a new user successfully', async () => {
    // Fill in all required fields with valid data
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('SecureP@ss123');
    await page.locator('input[name="confirmPassword"]').fill('SecureP@ss123');
    await page.locator('input[name="fullName"]').fill('Test User');
    await page.locator('input[name="companyName"]').fill('Test Company LLC');
    
    // Select business type if available
    const businessTypeSelect = page.locator('select[name="businessType"]');
    if (await businessTypeSelect.isVisible()) {
      await businessTypeSelect.selectOption('LLC');
    }
    
    // Check terms and conditions if available
    const termsCheckbox = page.locator('input[name="termsAccepted"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for registration to complete and verify success message
    await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });
    
    // Verify redirection to the login page or dashboard
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|dashboard)/);
  });

  test('should handle registration wizard steps if multi-step form', async () => {
    // This test is for multi-step registration forms
    const nextButton = page.locator('button:has-text("Next")');
    
    // Check if this is a multi-step wizard (if not, this test can be skipped)
    if (await nextButton.isVisible()) {
      // Fill first page (account details)
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('input[name="password"]').fill('SecureP@ss123');
      await page.locator('input[name="confirmPassword"]').fill('SecureP@ss123');
      await nextButton.click();
      
      // Fill second page (personal info)
      await page.locator('input[name="fullName"]').fill('Test User');
      await page.locator('input[name="phone"]').fill('+97150123456');
      await nextButton.click();
      
      // Fill third page (company info)
      await page.locator('input[name="companyName"]').fill('Test Company LLC');
      
      // Submit the form
      await page.locator('button[type="submit"]').click();
      
      // Wait for registration to complete and verify success message
      await expect(page.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });
});