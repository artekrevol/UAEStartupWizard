/**
 * Search Service for AI Product Manager
 * 
 * This module provides web search and scraping functionality for the AI Product Manager.
 */
import { logActivity } from './logger';

// Import required libraries for web scraping
import * as cheerio from 'cheerio';
import axios from 'axios';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Search the web for information
 */
export async function searchWeb(query: string): Promise<{
  results: { title: string; snippet: string; url: string }[];
  error?: string;
}> {
  try {
    // For now, we'll simulate search results
    // In a production environment, you would use a real search API
    
    // Log the search activity
    await logActivity(
      'search', 
      `Searching web for: ${query}`,
      { query }
    );
    
    // Use OpenAI to generate search terms and key concepts to look for
    const searchAnalysis = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a search expert. Extract 3-5 key search terms from the user's query that would be most effective for finding information on this topic."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });
    
    const searchTerms = searchAnalysis.choices[0].message.content || query;
    
    // In a real implementation, you would use a search API like Google or Bing
    // For this prototype, we'll simulate results
    const simulatedResults = [
      {
        title: `Information about ${query}`,
        snippet: `This is a simulated search result about ${query}. In a production environment, this would contain real search results from a search API.`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`
      },
      {
        title: `${query} - Official Information`,
        snippet: `Official information about ${query}. Would contain excerpts from official sources.`,
        url: `https://official-source.com/${encodeURIComponent(query)}`
      },
      {
        title: `${query} Guide and Tutorial`,
        snippet: `Comprehensive guide about ${query} with detailed information and examples.`,
        url: `https://guides.com/guide/${encodeURIComponent(query)}`
      }
    ];
    
    return {
      results: simulatedResults
    };
  } catch (error) {
    console.error(`Error searching web: ${error}`);
    await logActivity(
      'search-error', 
      `Error searching web: ${(error as Error).message}`,
      { query, error: (error as Error).message }
    );
    
    return {
      results: [],
      error: `Failed to search: ${(error as Error).message}`
    };
  }
}

/**
 * Scrape content from a URL
 */
export async function scrapeUrl(url: string): Promise<{
  title: string;
  content: string;
  metadata: any;
  error?: string;
}> {
  try {
    // Log the scraping activity
    await logActivity(
      'scrape', 
      `Scraping content from: ${url}`,
      { url }
    );
    
    // Make the HTTP request to the URL
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse the HTML
    const $ = cheerio.load(response.data);
    
    // Extract the title
    const title = $('title').text().trim() || 'No title found';
    
    // Extract main content
    const mainContent: string[] = [];
    
    // Look for content in common content containers
    $('article, main, .content, .main-content, #content, #main-content').each((_, element) => {
      mainContent.push($(element).text().trim());
    });
    
    // If no specific content containers are found, get all paragraph text
    if (mainContent.length === 0) {
      $('p').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 50) {  // Only include substantial paragraphs
          mainContent.push(text);
        }
      });
    }
    
    // Combine all content
    const content = mainContent.join('\n\n');
    
    // Extract metadata
    const metadata = {
      url,
      title,
      description: $('meta[name="description"]').attr('content') || '',
      contentLength: content.length,
      timestamp: new Date().toISOString()
    };
    
    // Log successful scrape
    await logActivity(
      'scrape-success', 
      `Successfully scraped content from: ${url}`,
      { url, contentLength: content.length }
    );
    
    return {
      title,
      content: content || 'No content extracted',
      metadata
    };
  } catch (error) {
    console.error(`Error scraping URL: ${error}`);
    await logActivity(
      'scrape-error', 
      `Error scraping URL: ${(error as Error).message}`,
      { url, error: (error as Error).message }
    );
    
    return {
      title: 'Error',
      content: '',
      metadata: { url, error: (error as Error).message },
      error: `Failed to scrape URL: ${(error as Error).message}`
    };
  }
}

/**
 * Search the web and scrape content from relevant results
 */
export async function searchAndScrape(query: string): Promise<{
  query: string;
  results: { 
    title: string; 
    url: string; 
    content: string;
  }[];
  summary: string;
  error?: string;
}> {
  try {
    // First, search for relevant results
    const searchResults = await searchWeb(query);
    
    if (searchResults.error) {
      throw new Error(searchResults.error);
    }
    
    // Scrape content from each result (limit to first 3 for demo)
    const scrapePromises = searchResults.results
      .slice(0, 3)
      .map(async result => {
        const scraped = await scrapeUrl(result.url);
        return {
          title: scraped.title,
          url: result.url,
          content: scraped.content
        };
      });
    
    const scrapedResults = await Promise.all(scrapePromises);
    
    // Generate a summary of the findings using OpenAI
    const allContent = scrapedResults
      .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
      .join('\n\n=========\n\n');
    
    // Use OpenAI to summarize the findings
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a research assistant. Summarize the key information from the sources provided, focusing on relevant facts about the query. Be concise but comprehensive."
        },
        {
          role: "user",
          content: `Query: ${query}\n\nSources:\n${allContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    const summary = summaryResponse.choices[0].message.content || 'No summary generated';
    
    // Log successful search and scrape
    await logActivity(
      'search-and-scrape', 
      `Completed search and scrape for: ${query}`,
      { query, resultCount: scrapedResults.length }
    );
    
    return {
      query,
      results: scrapedResults,
      summary
    };
  } catch (error) {
    console.error(`Error in search and scrape: ${error}`);
    await logActivity(
      'search-and-scrape-error', 
      `Error in search and scrape: ${(error as Error).message}`,
      { query, error: (error as Error).message }
    );
    
    return {
      query,
      results: [],
      summary: '',
      error: `Failed to search and scrape: ${(error as Error).message}`
    };
  }
}