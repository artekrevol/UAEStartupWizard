import OpenAI from "openai";
import { storage } from "./storage";
import {
  type Conversation,
  type ConversationMessage,
  type Document,
  type InsertDocument
} from "../shared/schema";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Web Research Assistant
 * This service handles web searches and document generation for the chatbot
 */

/**
 * Extract text content from a webpage
 * @param url The URL to scrape
 * @returns The extracted text content
 */
async function extractWebpageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Remove script tags, style tags, and other non-content elements
    $('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"]').remove();
    
    // Extract main content
    const content = $('main, article, .content, #content, .main-content, #main-content, .post, .article, body')
      .map((_, el) => $(el).text())
      .get()
      .join('\n');
    
    // Clean up the text (remove extra whitespace, etc.)
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return '';
  }
}

/**
 * Create a new conversation for web research
 * @param userId The user's ID
 * @returns The created conversation
 */
export async function createWebResearchConversation(
  userId: number | undefined
): Promise<Conversation> {
  const sessionId = uuidv4();
  return await storage.createConversation({
    userId: userId,
    sessionId,
    isActive: true,
    metadata: { type: "web_research" },
  });
}

/**
 * Generate a system message for the web research assistant
 * @returns System message for OpenAI API
 */
function generateWebResearchSystemMessage(): string {
  return `
You are an advanced web research assistant specialized in extracting and synthesizing information about business setup in the UAE.

Your responsibilities:
1. Search for relevant information about the specified topic in business setup
2. Extract key details and organize them into structured formats
3. Identify missing information that needs further research
4. Provide comprehensive and accurate data about UAE business processes

When analyzing content:
- Focus on factual information, not opinions
- Prioritize information from official government sources
- Extract data about requirements, regulations, costs, timelines, and processes
- Structure information in a clear and organized manner
- Separate information by categories (legal, financial, procedural, etc.)

Your output will be used to create comprehensive documents for UAE business setup guidance.
`;
}

/**
 * Perform web research on a topic and summarize the findings
 * @param topic The research topic
 * @param userId The user's ID (optional)
 * @returns Research summary and extracted information
 */
export async function performWebResearch(
  topic: string,
  userId: number | undefined
): Promise<{
  conversationId: number;
  summary: string;
  searchQueries: string[];
  extractedContent: Array<{
    source: string;
    content: string;
    relevance: string;
  }>;
}> {
  try {
    // Create a new conversation for this research session
    const conversation = await createWebResearchConversation(userId);
    
    // Generate search queries based on the topic
    const queries = await generateSearchQueries(topic);
    
    // Search and scrape content for each query
    const extractedContentArray = await Promise.all(
      queries.map(async (query) => {
        // Simulate search results (in a real app, you'd use a search API)
        const searchUrl = await simulateSearch(query);
        
        // Extract content from the webpage
        const content = await extractWebpageContent(searchUrl);
        
        // Analyze relevance of the content
        const relevance = await analyzeContentRelevance(content, topic);
        
        return {
          source: searchUrl,
          content: content.substring(0, 5000), // Limit content size
          relevance
        };
      })
    );
    
    // Filter out irrelevant content
    const relevantContent = extractedContentArray.filter(
      item => item.relevance !== "irrelevant" && item.content.length > 100
    );
    
    // Create a summary of all findings
    const summary = await createResearchSummary(topic, relevantContent);
    
    // Add research summary to the conversation
    await storage.addMessage({
      conversationId: conversation.id,
      role: "system",
      content: `Research topic: ${topic}`,
      metadata: { type: "research_topic" },
    });
    
    await storage.addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: summary,
      metadata: { type: "research_summary" },
    });
    
    // Update conversation summary
    await storage.updateConversation(conversation.id, {
      summary: `Web research on: ${topic}`,
      updatedAt: new Date()
    });
    
    return {
      conversationId: conversation.id,
      summary,
      searchQueries: queries,
      extractedContent: relevantContent
    };
  } catch (error) {
    console.error("Error in web research:", error);
    throw new Error("Failed to perform web research");
  }
}

/**
 * Generate search queries for a research topic
 * @param topic The research topic
 * @returns Array of search queries
 */
async function generateSearchQueries(topic: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are an expert at breaking down complex research topics into specific search queries.
For the given topic about UAE business setup, generate 3-5 specific search queries that would yield the most relevant information.
The queries should target different aspects of the topic and focus on factual information from authoritative sources.
Return only the search queries in a JSON array format.
`
        },
        {
          role: "user",
          content: `Generate search queries for researching information about: ${topic}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    
    const result = JSON.parse(content);
    return result.queries || [];
  } catch (error) {
    console.error("Error generating search queries:", error);
    // Fallback to basic queries
    return [
      `${topic} UAE official information`,
      `${topic} Dubai free zone requirements`,
      `${topic} UAE business setup guide`
    ];
  }
}

/**
 * Simulate a search and return a relevant URL
 * This is a placeholder for an actual search API integration
 * @param query The search query
 * @returns URL of a relevant page
 */
async function simulateSearch(query: string): Promise<string> {
  // In a real application, you would use a search API (Google, Bing, etc.)
  // For this demo, we'll return predetermined URLs based on query keywords
  
  const normalizedQuery = query.toLowerCase();
  
  if (normalizedQuery.includes("free zone")) {
    return "https://www.saif-zone.com/en/";
  } else if (normalizedQuery.includes("license") || normalizedQuery.includes("licensing")) {
    return "https://u.ae/en/information-and-services/business/business-licenses";
  } else if (normalizedQuery.includes("tax") || normalizedQuery.includes("vat")) {
    return "https://u.ae/en/information-and-services/finance-and-investment/taxation";
  } else if (normalizedQuery.includes("visa") || normalizedQuery.includes("residence")) {
    return "https://u.ae/en/information-and-services/visa-and-emirates-id";
  } else if (normalizedQuery.includes("dmcc") || normalizedQuery.includes("commodities")) {
    return "https://www.dmcc.ae/";
  } else {
    // Default to general business setup information
    return "https://u.ae/en/information-and-services/business/starting-a-business-in-the-uae";
  }
}

/**
 * Analyze the relevance of content to a research topic
 * @param content The content to analyze
 * @param topic The research topic
 * @returns Relevance assessment ("highly_relevant", "relevant", "somewhat_relevant", "irrelevant")
 */
async function analyzeContentRelevance(content: string, topic: string): Promise<string> {
  try {
    // For very short content, assume it's irrelevant
    if (content.length < 100) {
      return "irrelevant";
    }
    
    // Sample the content if it's too long
    const sampleContent = content.length > 2000 
      ? content.substring(0, 2000) + "..." 
      : content;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
Analyze the relevance of the provided content to the research topic.
Return one of the following values:
- "highly_relevant": The content directly addresses the topic with specific details
- "relevant": The content is related to the topic and provides useful information
- "somewhat_relevant": The content has some information related to the topic but is not comprehensive
- "irrelevant": The content is not related to the topic or contains no useful information

Return only the relevance assessment as a string, nothing else.
`
        },
        {
          role: "user",
          content: `
Research topic: ${topic}

Content to analyze:
${sampleContent}
`
        }
      ]
    });
    
    const result = response.choices[0].message.content?.trim().toLowerCase() || "irrelevant";
    
    // Normalize the response to one of the expected values
    if (result.includes("highly") || result.includes("high")) {
      return "highly_relevant";
    } else if (result.includes("relevant") && !result.includes("somewhat") && !result.includes("irrelevant")) {
      return "relevant";
    } else if (result.includes("somewhat")) {
      return "somewhat_relevant";
    } else {
      return "irrelevant";
    }
  } catch (error) {
    console.error("Error analyzing content relevance:", error);
    // If we can't determine relevance, assume it's somewhat relevant
    return "somewhat_relevant";
  }
}

/**
 * Create a summary of research findings
 * @param topic The research topic
 * @param content The extracted content
 * @returns Summary of the research
 */
async function createResearchSummary(
  topic: string, 
  content: Array<{ source: string; content: string; relevance: string }>
): Promise<string> {
  try {
    // Combine all relevant content
    let combinedContent = content.map(item => {
      return `
Source: ${item.source}
Relevance: ${item.relevance}
Content:
${item.content.substring(0, 1000)} ${item.content.length > 1000 ? '...' : ''}
`;
    }).join('\n\n---\n\n');
    
    // If the combined content is too large, sample from all sources
    if (combinedContent.length > 10000) {
      combinedContent = content.map(item => {
        return `
Source: ${item.source}
Relevance: ${item.relevance}
Content Sample:
${item.content.substring(0, 800)} ...
`;
      }).join('\n\n---\n\n');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a research assistant synthesizing information about UAE business setup.
Create a comprehensive summary of the research findings on the given topic.
The summary should:
1. Be well-structured and organized by subtopics
2. Focus on factual information, requirements, and processes
3. Include specific details (costs, timelines, document requirements, etc.)
4. Note any contradictions or areas needing further research
5. Include citations to sources when mentioning specific information

Your summary will be used for official documentation purposes.
`
        },
        {
          role: "user",
          content: `
Research topic: ${topic}

Extracted content from various sources:
${combinedContent}

Please provide a comprehensive summary of the findings.
`
        }
      ]
    });
    
    return response.choices[0].message.content || "No summary could be generated.";
  } catch (error) {
    console.error("Error creating research summary:", error);
    return "Failed to generate research summary due to an error.";
  }
}

/**
 * Create a document from the research findings
 * @param topic The research topic
 * @param summary The research summary
 * @param category The document category
 * @param userId The user's ID (optional)
 * @returns The created document
 */
export async function createDocumentFromResearch(
  topic: string,
  summary: string,
  category: string,
  userId: number | undefined
): Promise<Document> {
  try {
    // Generate a filename based on the topic
    const filename = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
    
    // Save the summary to a file
    const filePath = path.join('uploads', filename);
    fs.writeFileSync(filePath, summary);
    
    // Determine subcategory based on topic
    let subcategory = "general";
    if (topic.toLowerCase().includes("free zone")) {
      subcategory = "free_zone";
    } else if (topic.toLowerCase().includes("license")) {
      subcategory = "licensing";
    } else if (topic.toLowerCase().includes("tax")) {
      subcategory = "taxation";
    } else if (topic.toLowerCase().includes("visa")) {
      subcategory = "visa";
    }
    
    // Create document in the database
    const documentData: InsertDocument = {
      title: `Research on: ${topic}`,
      filename,
      filePath,
      fileSize: summary.length,
      documentType: "text",
      category,
      subcategory,
      content: summary,
      metadata: {
        createdBy: userId ? "user" : "system",
        creatorId: userId,
        researchTopic: topic,
        creationMethod: "web_research"
      },
      uploadedAt: new Date()
    };
    
    return await storage.createDocument(documentData);
  } catch (error) {
    console.error("Error creating document from research:", error);
    throw new Error("Failed to create document from research");
  }
}

/**
 * Search the document database for information about a topic
 * @param topic The search topic
 * @returns Array of document snippets
 */
export async function searchDocuments(topic: string): Promise<Array<{
  documentId: number;
  title: string;
  snippet: string;
  relevance: number;
}>> {
  try {
    // Get all documents that might be relevant
    const documents = await storage.getAllDocuments();
    
    // For each document, calculate a simple relevance score
    // and extract a snippet containing the topic
    const results = documents.map((doc) => {
      const content = doc.content || "";
      const relevance = calculateRelevanceScore(content, topic);
      
      // If not relevant, return null
      if (relevance < 0.2) {
        return null;
      }
      
      // Extract a snippet containing the topic
      const snippet = extractSnippet(content, topic);
      
      return {
        documentId: doc.id,
        title: doc.title,
        snippet,
        relevance
      };
    }).filter(Boolean) as Array<{
      documentId: number;
      title: string;
      snippet: string;
      relevance: number;
    }>;
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}

/**
 * Calculate a simple relevance score for content to a topic
 * @param content The content to check
 * @param topic The search topic
 * @returns Relevance score (0-1)
 */
function calculateRelevanceScore(content: string, topic: string): number {
  if (!content) return 0;
  
  const normalizedContent = content.toLowerCase();
  const normalizedTopic = topic.toLowerCase();
  
  // Split topic into keywords
  const keywords = normalizedTopic
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !["the", "and", "for", "from", "with", "about"].includes(word));
  
  if (keywords.length === 0) return 0;
  
  // Count occurrences of each keyword
  let matchCount = 0;
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'g');
    const matches = normalizedContent.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  });
  
  // Calculate score based on matches and content length
  const contentWords = normalizedContent.split(/\s+/).length;
  const score = Math.min(1, (matchCount / keywords.length) * (1 / Math.log10(contentWords + 10)) * 10);
  
  return score;
}

/**
 * Extract a relevant snippet from content
 * @param content The content to extract from
 * @param topic The search topic
 * @returns A relevant snippet
 */
function extractSnippet(content: string, topic: string): string {
  if (!content) return "";
  
  const normalizedContent = content;
  const normalizedTopic = topic.toLowerCase();
  
  // Find the first mention of any keyword
  const keywords = normalizedTopic
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !["the", "and", "for", "from", "with", "about"].includes(word));
  
  let bestIndex = -1;
  let bestKeyword = "";
  
  keywords.forEach(keyword => {
    const index = normalizedContent.toLowerCase().indexOf(keyword);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestKeyword = keyword;
    }
  });
  
  if (bestIndex === -1) {
    // No keyword found, return the beginning of the content
    return content.substring(0, 200) + "...";
  }
  
  // Extract a snippet around the keyword
  const snippetStart = Math.max(0, bestIndex - 100);
  const snippetEnd = Math.min(content.length, bestIndex + bestKeyword.length + 100);
  
  let snippet = content.substring(snippetStart, snippetEnd);
  
  // Add ellipsis if we truncated the content
  if (snippetStart > 0) {
    snippet = "..." + snippet;
  }
  if (snippetEnd < content.length) {
    snippet = snippet + "...";
  }
  
  return snippet;
}

/**
 * Chat with the web research assistant about findings
 * @param topic The research topic
 * @param message The user's message
 * @param conversationId The existing conversation ID (optional)
 * @param userId The user's ID (optional)
 * @returns Assistant's response
 */
export async function chatWithWebResearchAssistant(
  topic: string,
  message: string,
  conversationId?: number,
  userId?: number
): Promise<{
  conversationId: number;
  message: string;
}> {
  try {
    // Get or create a conversation
    let conversation: Conversation;
    if (conversationId) {
      const existingConversation = await storage.getConversation(conversationId);
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        conversation = await createWebResearchConversation(userId);
      }
    } else {
      conversation = await createWebResearchConversation(userId);
    }
    
    // Add user message to the conversation
    await storage.addMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
      metadata: { topic }
    });
    
    // Get conversation history
    const messages = await storage.getConversationMessages(conversation.id);
    
    // Search documents for relevant information
    const documentResults = await searchDocuments(topic);
    
    // Create context from document results
    let documentContext = "";
    if (documentResults.length > 0) {
      documentContext = "Relevant information from our documents:\n\n" + 
        documentResults.slice(0, 3).map(result => {
          return `Document: ${result.title}\nSnippet: ${result.snippet}\n`;
        }).join("\n");
    }
    
    // Generate response
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
${generateWebResearchSystemMessage()}

${documentContext}

The user is asking about the following research topic: ${topic}
`
        },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content
        }))
      ]
    });
    
    // Extract response content
    const assistantMessage = response.choices[0].message.content || "I couldn't generate a response.";
    
    // Add assistant message to the conversation
    await storage.addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: assistantMessage,
      metadata: { topic }
    });
    
    return {
      conversationId: conversation.id,
      message: assistantMessage
    };
  } catch (error) {
    console.error("Error in web research assistant chat:", error);
    throw new Error("Failed to communicate with web research assistant");
  }
}