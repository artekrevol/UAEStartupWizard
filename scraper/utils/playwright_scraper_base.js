/**
 * Base scraper class with Playwright integration for robust web scraping
 * This extends our existing scraper architecture with browser automation capabilities
 */
import { chromium } from 'playwright';
import { BaseScraper } from './scraper_base.js';

class PlaywrightScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    
    this.headless = options.headless !== false; // default to headless mode
    this.slowMo = options.slowMo || 50; // default slowing down by 50ms
    this.timeout = options.timeout || 30000; // default 30s timeout
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshots = options.screenshots || false; // whether to take screenshots
    this.screenshotPath = options.screenshotPath || './screenshots';
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36';
  }

  /**
   * Initialize the Playwright browser and page
   */
  async initialize() {
    try {
      console.log('Initializing Playwright browser...');
      
      const launchOptions = {
        headless: true,
        slowMo: this.slowMo,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
      
      this.browser = await chromium.launch(launchOptions);
      
      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      });
      
      this.page = await this.context.newPage();
      
      // Set default timeout
      this.page.setDefaultTimeout(this.timeout);
      
      // Setup basic error handling
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`Browser console error: ${msg.text()}`);
        }
      });
      
      this.page.on('pageerror', error => {
        console.log(`Page error: ${error.message}`);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Playwright:', error);
      return false;
    }
  }

  /**
   * Navigate to a URL with retry logic
   * @param {string} url - The URL to navigate to
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async navigateTo(url, options = {}) {
    const maxRetries = options.retries || 3;
    const waitUntil = options.waitUntil || 'networkidle';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Navigating to ${url} (attempt ${attempt}/${maxRetries})...`);
        
        const response = await this.page.goto(url, {
          waitUntil,
          timeout: this.timeout
        });
        
        // Take screenshot if enabled
        if (this.screenshots) {
          const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
          await this.takeScreenshot(`${urlSlug}_load`);
        }
        
        if (response && response.ok()) {
          console.log(`Successfully navigated to ${url}`);
          return true;
        } else {
          console.warn(`Navigation to ${url} received status ${response?.status()}`);
          // Wait before retry
          await this.sleep(2000 * attempt);
        }
      } catch (error) {
        console.error(`Error navigating to ${url} (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          console.error('Max navigation retries reached');
          return false;
        }
        
        // Wait between retries
        await this.sleep(2000 * attempt);
      }
    }
    
    return false;
  }

  /**
   * Extract text from an element using Playwright
   * @param {string} selector - CSS selector for the element
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The extracted text
   */
  async extractText(selector, options = {}) {
    try {
      // Wait for the selector to be visible
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: options.timeout || this.timeout
      });
      
      // Extract the text content
      const text = await this.page.$eval(selector, el => el.textContent);
      
      // Clean and return the text
      return options.clean !== false ? this.cleanText(text) : text;
    } catch (error) {
      console.error(`Failed to extract text from ${selector}:`, error.message);
      return '';
    }
  }

  /**
   * Extract multiple texts from elements using Playwright
   * @param {string} selector - CSS selector for the elements
   * @param {Object} options - Additional options
   * @returns {Promise<string[]>} - Array of extracted texts
   */
  async extractTexts(selector, options = {}) {
    try {
      // Wait for at least one element to be visible
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: options.timeout || this.timeout
      });
      
      // Extract all text contents
      const texts = await this.page.$$eval(selector, elements => 
        elements.map(el => el.textContent)
      );
      
      // Clean and return the texts
      return options.clean !== false 
        ? texts.map(text => this.cleanText(text))
        : texts;
    } catch (error) {
      console.error(`Failed to extract texts from ${selector}:`, error.message);
      return [];
    }
  }

  /**
   * Extract an attribute from an element
   * @param {string} selector - CSS selector for the element
   * @param {string} attribute - Attribute name to extract
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The extracted attribute value
   */
  async extractAttribute(selector, attribute, options = {}) {
    try {
      // Wait for the selector to be present in DOM
      await this.page.waitForSelector(selector, { 
        state: 'attached',
        timeout: options.timeout || this.timeout
      });
      
      // Extract the attribute
      return await this.page.$eval(
        selector, 
        (el, attr) => el.getAttribute(attr), 
        attribute
      );
    } catch (error) {
      console.error(`Failed to extract attribute ${attribute} from ${selector}:`, error.message);
      return '';
    }
  }

  /**
   * Fill a form field
   * @param {string} selector - CSS selector for the input field
   * @param {string} value - Value to fill in
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} - Whether fill was successful
   */
  async fillField(selector, value, options = {}) {
    try {
      // Wait for the field to be visible and enabled
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: options.timeout || this.timeout
      });
      
      // Fill the field
      await this.page.fill(selector, value);
      
      if (options.pressEnter) {
        await this.page.press(selector, 'Enter');
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to fill field ${selector}:`, error.message);
      return false;
    }
  }

  /**
   * Click on an element
   * @param {string} selector - CSS selector for the element to click
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} - Whether click was successful
   */
  async clickElement(selector, options = {}) {
    try {
      // Wait for the element to be visible and enabled
      await this.page.waitForSelector(selector, { 
        state: 'visible',
        timeout: options.timeout || this.timeout
      });
      
      // Click the element
      await this.page.click(selector, {
        button: options.button || 'left',
        clickCount: options.clickCount || 1,
        delay: options.delay || 0
      });
      
      // Take screenshot if enabled
      if (this.screenshots) {
        await this.takeScreenshot(`click_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to click element ${selector}:`, error.message);
      return false;
    }
  }

  /**
   * Take a screenshot of the current page
   * @param {string} name - Name for the screenshot file
   * @returns {Promise<string|null>} - Path to the saved screenshot or null if failed
   */
  async takeScreenshot(name) {
    if (!this.screenshots) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${this.screenshotPath}/${name}_${timestamp}.png`;
      
      await this.page.screenshot({ path: fileName, fullPage: true });
      
      console.log(`Screenshot saved to ${fileName}`);
      return fileName;
    } catch (error) {
      console.error('Failed to take screenshot:', error.message);
      return null;
    }
  }

  /**
   * Extract structured data using Playwright
   * @param {Function} extractionLogic - Function that receives page and returns structured data
   * @returns {Promise<any>} - The extracted data
   */
  async extractData(extractionLogic) {
    try {
      return await extractionLogic(this.page);
    } catch (error) {
      console.error('Failed to extract structured data:', error.message);
      return null;
    }
  }

  /**
   * Wait for a specific condition to be met
   * @param {Function} conditionFn - Function that returns true when condition is met
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} - Whether condition was met
   */
  async waitForCondition(conditionFn, options = {}) {
    const timeout = options.timeout || this.timeout;
    const pollInterval = options.pollInterval || 100;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        if (await conditionFn(this.page)) {
          return true;
        }
      } catch (error) {
        // Ignore errors and continue polling
      }
      
      await this.sleep(pollInterval);
    }
    
    console.error('Timeout waiting for condition');
    return false;
  }

  /**
   * Close the browser and clean up resources
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
      }
      
      // Call parent cleanup
      await super.cleanup();
      
    } catch (error) {
      console.error('Error during Playwright cleanup:', error);
    }
  }
}

export { PlaywrightScraper };