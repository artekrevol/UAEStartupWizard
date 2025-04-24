/**
 * Advanced Search Service
 * 
 * This service integrates with search APIs and web scraping tools
 * to find relevant information for UAE free zones.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logActivity } from './logger';

interface SearchResult {
  query: string;
  results: {
    title: string;
    url: string;
    snippet: string;
  }[];
  success: boolean;
  error?: string;
}

interface ScrapingResult {
  url: string;
  title: string;
  content: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Search the web for information using SerpAPI
 */
export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResult> {
  return new Promise((resolve) => {
    // Create a Python process to use SerpAPI
    const searchProcess = spawn('python', [
      '-c',
      `
import sys
import json
import os
from serpapi import GoogleSearch

try:
    query = "${query}"
    
    # Check if SERP API key is available
    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        raise ValueError("SERPAPI_API_KEY environment variable is not set")
    
    # Run the search
    search = GoogleSearch({
        "q": query,
        "location": "United Arab Emirates",
        "gl": "ae",
        "hl": "en",
        "api_key": api_key,
        "num": ${numResults}
    })
    
    result = search.get_dict()
    
    # Process search results
    search_results = []
    
    if "organic_results" in result:
        for item in result["organic_results"]:
            search_results.append({
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
    
    output = {
        "query": query,
        "results": search_results,
        "success": True
    }
    
    print(json.dumps(output))
    sys.exit(0)
except Exception as e:
    output = {
        "query": "${query}",
        "results": [],
        "success": False,
        "error": str(e)
    }
    print(json.dumps(output))
    sys.exit(1)
      `
    ]);
    
    let resultData = '';
    let errorData = '';
    
    searchProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    searchProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    searchProcess.on('close', (code) => {
      if (code !== 0 || errorData) {
        logActivity(
          'research', 
          `Search failed for query: "${query}"`,
          { error: errorData }
        );
        
        // Check if SERPAPI is missing
        if (errorData.includes("No module named 'serpapi'")) {
          // Fall back to alternative search method
          logActivity(
            'research', 
            `SerpAPI module not found, falling back to alternative search for query: "${query}"`,
            {}
          );
          
          resolve(fallbackSearch(query, numResults));
          return;
        }
        
        resolve({
          query,
          results: [],
          success: false,
          error: errorData
        });
        return;
      }
      
      try {
        const result = JSON.parse(resultData) as SearchResult;
        logActivity(
          'research', 
          `Search completed for query: "${query}", found ${result.results.length} results`,
          { numResults: result.results.length }
        );
        resolve(result);
      } catch (error) {
        logActivity(
          'research', 
          `Failed to parse search results for query: "${query}"`,
          { error: (error as Error).message }
        );
        resolve({
          query,
          results: [],
          success: false,
          error: `Failed to parse results: ${(error as Error).message}`
        });
      }
    });
  });
}

/**
 * Fallback search method when SerpAPI is not available
 */
async function fallbackSearch(query: string, numResults: number = 5): Promise<SearchResult> {
  return new Promise((resolve) => {
    // Create a Python process to use a fallback search method
    const searchProcess = spawn('python', [
      '-c',
      `
import sys
import json
import requests
from bs4 import BeautifulSoup

try:
    query = "${query}".replace(" ", "+")
    
    # Create a search URL (this is for demonstration and might not work in production)
    search_url = f"https://www.google.com/search?q={query}+UAE+free+zone&num=${numResults}"
    
    # Make the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(search_url, headers=headers)
    
    # Parse the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract search results
    search_results = []
    
    # This is a simplified scraper and may break if Google changes their layout
    result_elements = soup.select('div.g')
    for element in result_elements[:${numResults}]:
        title_element = element.select_one('h3')
        link_element = element.select_one('a')
        snippet_element = element.select_one('div.VwiC3b')
        
        if title_element and link_element and snippet_element:
            title = title_element.get_text()
            link = link_element.get('href', '')
            
            if link.startswith('/url?q='):
                link = link.split('/url?q=')[1].split('&')[0]
                
            snippet = snippet_element.get_text()
            
            search_results.append({
                "title": title,
                "url": link,
                "snippet": snippet
            })
    
    output = {
        "query": "${query}",
        "results": search_results,
        "success": True
    }
    
    print(json.dumps(output))
    sys.exit(0)
except Exception as e:
    output = {
        "query": "${query}",
        "results": [],
        "success": False,
        "error": str(e)
    }
    print(json.dumps(output))
    sys.exit(1)
      `
    ]);
    
    let resultData = '';
    let errorData = '';
    
    searchProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    searchProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    searchProcess.on('close', (code) => {
      if (code !== 0) {
        logActivity(
          'research', 
          `Fallback search failed for query: "${query}"`,
          { error: errorData }
        );
        
        // Create mock results since real search failed
        resolve({
          query,
          results: [
            {
              title: "UAE Free Zones",
              url: "https://www.uaefreezonesguide.com/",
              snippet: "Information about UAE free zones might be found on their official websites."
            }
          ],
          success: false,
          error: errorData
        });
        return;
      }
      
      try {
        const result = JSON.parse(resultData) as SearchResult;
        logActivity(
          'research', 
          `Fallback search completed for query: "${query}", found ${result.results.length} results`,
          { numResults: result.results.length }
        );
        resolve(result);
      } catch (error) {
        logActivity(
          'research', 
          `Failed to parse fallback search results for query: "${query}"`,
          { error: (error as Error).message }
        );
        resolve({
          query,
          results: [],
          success: false,
          error: `Failed to parse results: ${(error as Error).message}`
        });
      }
    });
  });
}

/**
 * Scrape a specific URL to extract content
 */
export async function scrapeUrl(url: string, contentType: 'general' | 'setup' | 'costs' = 'general'): Promise<ScrapingResult> {
  return new Promise((resolve) => {
    // Create a Python process for BeautifulSoup scraping
    const scrapingProcess = spawn('python', [
      '-c',
      `
import sys
import json
import requests
from bs4 import BeautifulSoup

try:
    url = "${url}"
    content_type = "${contentType}"
    
    # Make the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    # Parse the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract the title
    title = soup.title.text if soup.title else "No title found"
    
    # Based on content type, target specific elements
    if content_type == 'setup':
        # Look for setup/process related content
        target_elements = soup.find_all(['div', 'section', 'article'], class_=lambda c: c and any(kw in str(c).lower() for kw in ['setup', 'process', 'register', 'license', 'procedure']))
        
        if not target_elements:
            # Fall back to searching by content
            target_elements = soup.find_all(['h1', 'h2', 'h3', 'h4'], string=lambda s: s and any(kw in s.lower() for kw in ['setup', 'process', 'register', 'license', 'procedure']))
            target_elements = [elem.parent for elem in target_elements if elem.parent]
    
    elif content_type == 'costs':
        # Look for pricing/costs related content
        target_elements = soup.find_all(['div', 'section', 'article', 'table'], class_=lambda c: c and any(kw in str(c).lower() for kw in ['price', 'cost', 'fee', 'pricing']))
        
        if not target_elements:
            # Fall back to searching by content
            target_elements = soup.find_all(['h1', 'h2', 'h3', 'h4'], string=lambda s: s and any(kw in s.lower() for kw in ['price', 'cost', 'fee', 'pricing']))
            target_elements = [elem.parent for elem in target_elements if elem.parent]
    
    else:  # general
        # Get the main content
        main_content_candidates = soup.find_all(['article', 'main', 'div'], class_=lambda c: c and ('content' in str(c).lower() or 'main' in str(c).lower()))
        
        if main_content_candidates:
            # Take the largest content block
            target_elements = [max(main_content_candidates, key=lambda e: len(e.get_text()))]
        else:
            # Fall back to all paragraph text
            target_elements = soup.find_all('div', class_=True)
            # Filter out very small elements
            target_elements = [e for e in target_elements if len(e.get_text(strip=True)) > 200]
    
    # Extract content from target elements
    content = ""
    if target_elements:
        for element in target_elements:
            element_text = element.get_text(separator=' ', strip=True)
            if element_text:
                content += element_text + "\\n\\n"
    else:
        # Fall back to all paragraphs
        paragraphs = soup.find_all('p')
        content = "\\n".join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 0])
    
    # Create metadata with any useful information
    metadata = {
        "contentType": content_type,
        "contentLength": len(content),
        "hasImages": len(soup.find_all('img')) > 0,
        "hasTables": len(soup.find_all('table')) > 0
    }
    
    # Return the scraped content
    result = {
        "url": url,
        "title": title,
        "content": content,
        "success": True,
        "metadata": metadata
    }
    
    print(json.dumps(result))
    sys.exit(0)
except Exception as e:
    result = {
        "url": url,
        "title": "",
        "content": "",
        "success": False,
        "error": str(e)
    }
    print(json.dumps(result))
    sys.exit(1)
      `
    ]);
    
    let resultData = '';
    let errorData = '';
    
    scrapingProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    scrapingProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    scrapingProcess.on('close', (code) => {
      if (code !== 0) {
        logActivity(
          'scraper', 
          `Scraping failed for URL: "${url}"`,
          { error: errorData, contentType }
        );
        
        // Try with Playwright if BeautifulSoup fails (may be JavaScript-heavy page)
        if (errorData.includes("timeout") || errorData.includes("connection") || errorData.includes("reset")) {
          usePlaywrightScraper(url, contentType).then(result => resolve(result));
          return;
        }
        
        resolve({
          url,
          title: "",
          content: "",
          success: false,
          error: errorData
        });
        return;
      }
      
      try {
        const result = JSON.parse(resultData) as ScrapingResult;
        logActivity(
          'scraper', 
          `Successfully scraped URL: "${url}"`,
          { contentType, contentLength: result.content.length }
        );
        resolve(result);
      } catch (error) {
        logActivity(
          'scraper', 
          `Failed to parse scraper output for URL: "${url}"`,
          { error: (error as Error).message }
        );
        resolve({
          url,
          title: "",
          content: "",
          success: false,
          error: `Failed to parse output: ${(error as Error).message}`
        });
      }
    });
  });
}

/**
 * Use Playwright for JavaScript-heavy pages
 */
async function usePlaywrightScraper(url: string, contentType: 'general' | 'setup' | 'costs'): Promise<ScrapingResult> {
  return new Promise((resolve) => {
    // Create a Python process for Playwright scraping
    const playwrightProcess = spawn('python', [
      '-c',
      `
import sys
import json
import asyncio
from playwright.async_api import async_playwright

async def run():
    try:
        url = "${url}"
        content_type = "${contentType}"
        
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            
            await page.goto(url, wait_until="networkidle")
            
            # Get the page title
            title = await page.title()
            
            # Based on content type, extract specific content
            if content_type == 'setup':
                # Extract setup/process related content
                setup_content = await page.evaluate('''
                    () => {
                        const setupKeywords = ['setup', 'process', 'register', 'license', 'procedure'];
                        
                        // Try to find elements with matching classes or IDs
                        let elements = Array.from(document.querySelectorAll('[class*="setup"], [class*="process"], [id*="setup"], [id*="process"]'));
                        
                        // If none found, look for headings with those keywords
                        if (elements.length === 0) {
                            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5'));
                            for (const heading of headings) {
                                if (setupKeywords.some(kw => heading.textContent.toLowerCase().includes(kw))) {
                                    // Take the parent or the section following this heading
                                    elements.push(heading.parentElement || heading.nextElementSibling);
                                }
                            }
                        }
                        
                        // Extract text from elements
                        return elements.map(el => el.textContent).join('\\n\\n');
                    }
                ''')
                content = setup_content
                
            elif content_type == 'costs':
                # Extract pricing/costs related content
                costs_content = await page.evaluate('''
                    () => {
                        const costKeywords = ['price', 'cost', 'fee', 'pricing'];
                        
                        // Try to find elements with matching classes or IDs
                        let elements = Array.from(document.querySelectorAll('[class*="price"], [class*="cost"], [class*="fee"], [id*="price"], [id*="cost"]'));
                        
                        // Also look for tables that might contain pricing
                        const tables = Array.from(document.querySelectorAll('table'));
                        elements = elements.concat(tables);
                        
                        // If none found, look for headings with those keywords
                        if (elements.length === 0) {
                            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5'));
                            for (const heading of headings) {
                                if (costKeywords.some(kw => heading.textContent.toLowerCase().includes(kw))) {
                                    // Take the parent or the section following this heading
                                    elements.push(heading.parentElement || heading.nextElementSibling);
                                }
                            }
                        }
                        
                        // Extract text from elements
                        return elements.map(el => el.textContent).join('\\n\\n');
                    }
                ''')
                content = costs_content
                
            else:  # general
                # Get the main content
                main_content = await page.evaluate('''
                    () => {
                        // Look for main content areas
                        let contentElements = [];
                        
                        // Try to find main content containers
                        const mainContent = document.querySelector('main, article, [role="main"], .main, .content, #content, #main');
                        if (mainContent) {
                            contentElements.push(mainContent);
                        } else {
                            // Fall back to all divs with substantial content
                            const allDivs = Array.from(document.querySelectorAll('div'));
                            contentElements = allDivs
                                .filter(div => div.textContent.length > 200)
                                .sort((a, b) => b.textContent.length - a.textContent.length)
                                .slice(0, 3);  // Take top 3 longest content divs
                        }
                        
                        // Extract text from elements
                        return contentElements.map(el => el.textContent).join('\\n\\n');
                    }
                ''')
                content = main_content
            
            # Create metadata
            has_images = await page.evaluate('document.querySelectorAll("img").length > 0')
            has_tables = await page.evaluate('document.querySelectorAll("table").length > 0')
            
            metadata = {
                "contentType": content_type,
                "contentLength": len(content),
                "hasImages": has_images,
                "hasTables": has_tables,
                "usedPlaywright": True
            }
            
            await browser.close()
            
            # Return the scraped content
            result = {
                "url": url,
                "title": title,
                "content": content,
                "success": True,
                "metadata": metadata
            }
            
            print(json.dumps(result))
            sys.exit(0)
            
    except Exception as e:
        result = {
            "url": url,
            "title": "",
            "content": "",
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

asyncio.run(run())
      `
    ]);
    
    let resultData = '';
    let errorData = '';
    
    playwrightProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    playwrightProcess.on('close', (code) => {
      if (code !== 0) {
        logActivity(
          'scraper', 
          `Playwright scraping failed for URL: "${url}"`,
          { error: errorData, contentType }
        );
        resolve({
          url,
          title: "",
          content: "",
          success: false,
          error: `Playwright scraping failed: ${errorData}`
        });
        return;
      }
      
      try {
        const result = JSON.parse(resultData) as ScrapingResult;
        logActivity(
          'scraper', 
          `Successfully scraped URL with Playwright: "${url}"`,
          { contentType, contentLength: result.content.length }
        );
        resolve(result);
      } catch (error) {
        logActivity(
          'scraper', 
          `Failed to parse Playwright output for URL: "${url}"`,
          { error: (error as Error).message }
        );
        resolve({
          url,
          title: "",
          content: "",
          success: false,
          error: `Failed to parse Playwright output: ${(error as Error).message}`
        });
      }
    });
  });
}

/**
 * Search and scrape in one combined operation
 */
export async function searchAndScrape(
  query: string, 
  contentType: 'general' | 'setup' | 'costs' = 'general',
  maxResults: number = 3
): Promise<{
  query: string;
  searchResults: SearchResult;
  scrapedContent: ScrapingResult[];
}> {
  try {
    // First search for relevant URLs
    const searchResults = await searchWeb(query, maxResults + 2); // Get a couple extra in case some fail
    
    // If search failed or returned no results, return the empty result
    if (!searchResults.success || searchResults.results.length === 0) {
      return {
        query,
        searchResults,
        scrapedContent: []
      };
    }
    
    // Scrape each URL up to the max
    const urlsToScrape = searchResults.results.slice(0, maxResults);
    const scrapingPromises = urlsToScrape.map(result => scrapeUrl(result.url, contentType));
    
    // Wait for all scraping to complete
    const scrapedResults = await Promise.all(scrapingPromises);
    
    // Filter out failed scrapes
    const successfulScrapes = scrapedResults.filter(result => result.success);
    
    return {
      query,
      searchResults,
      scrapedContent: successfulScrapes
    };
  } catch (error) {
    console.error(`Error in searchAndScrape: ${error}`);
    await logActivity(
      'research', 
      `Error in searchAndScrape for query: "${query}"`,
      { error: (error as Error).message, contentType }
    );
    
    return {
      query,
      searchResults: { query, results: [], success: false, error: (error as Error).message },
      scrapedContent: []
    };
  }
}