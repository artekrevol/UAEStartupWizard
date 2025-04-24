import OpenAI from "openai";
import { storage } from "./storage";
import {
  type Conversation,
  type ConversationMessage,
  type BusinessSetup,
  type FreeZone,
  type EstablishmentGuide,
  type SetupFlowStep,
  conversations
} from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { initializeAssistantMemory, runInitialization } from "./initializeAssistantMemory";
import * as fs from 'fs';
import * as path from 'path';

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System knowledge conversation ID
let systemKnowledgeConversationId: number | null = null;

/**
 * Calculate token count using a simple approximation
 * @param text The text to estimate token count for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a new conversation for a user
 * @param userId The user's ID
 * @returns The created conversation
 */
export async function createNewConversation(
  userId: number | undefined
): Promise<Conversation> {
  const sessionId = uuidv4();
  return await storage.createConversation({
    userId: userId,
    sessionId,
    isActive: true,
    metadata: {},
  });
}

/**
 * Get or create a conversation for a user
 * @param userId The user's ID
 * @returns The existing or created conversation
 */
export async function getOrCreateConversation(
  userId: number | undefined
): Promise<Conversation> {
  if (userId) {
    const existingConversation = await storage.getActiveConversation(userId);
    if (existingConversation) {
      return existingConversation;
    }
  }
  return await createNewConversation(userId);
}

/**
 * Add a message to a conversation
 * @param conversationId The conversation ID
 * @param role The role of the message sender (user, assistant, system)
 * @param content The message content
 * @returns The created message
 */
export async function addMessageToConversation(
  conversationId: number,
  role: string,
  content: string,
  metadata: any = {}
): Promise<ConversationMessage> {
  const tokenCount = estimateTokenCount(content);
  return await storage.addMessage({
    conversationId,
    role,
    content,
    tokenCount,
    metadata,
  });
}

/**
 * Get the conversation history for an OpenAI API call
 * @param conversationId The conversation ID
 * @param limit Maximum number of messages to retrieve
 * @returns Array of messages formatted for OpenAI API
 */
export async function getConversationHistoryForOpenAI(
  conversationId: number,
  limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
  const messages = await storage.getConversationMessages(conversationId);
  
  // Filter out system messages and take the most recent messages up to the limit
  return messages
    .filter(msg => msg.role !== "system")
    .slice(-limit)
    .map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));
}

/**
 * Generate a system message for a business setup assistant
 * @param userId The user's ID
 * @returns System message for OpenAI API
 */
export async function generateBusinessAssistantSystemMessage(
  userId: number | undefined
): Promise<string> {
  let businessContext = "";
  
  // Get user's business setup information if available
  if (userId) {
    const businessSetup = await storage.getBusinessSetup(userId);
    if (businessSetup) {
      businessContext = `
User's current business setup:
- Business Type: ${businessSetup.businessType || "Not specified"}
- Legal Form: ${businessSetup.legalForm || "Not specified"}
- Free Zone: ${businessSetup.freeZone || "Not specified"}
- Business Activity: ${businessSetup.businessActivity || "Not specified"}
- Initial Capital: ${businessSetup.initialCapital ? `${businessSetup.initialCapital} AED` : "Not specified"}
- License Type: ${businessSetup.licenseType || "Not specified"}
- Status: ${businessSetup.status || "Pending"}
`;
    }
  }

  return `
You are an expert UAE business setup assistant, specialized in helping entrepreneurs establish businesses in the UAE.
Your task is to guide users through the business setup process with accurate, helpful, and actionable information.

${businessContext}

When answering:
1. Be concise and specific, focusing on UAE business regulations and processes
2. Provide step-by-step guidance when explaining procedures
3. Reference official requirements and documents when applicable
4. Be encouraging and supportive throughout the business setup journey
5. If you don't know something, be honest and suggest where the user might find that information

As the conversation progresses, use the context of previous messages to provide more personalized assistance.
`;
}

/**
 * Chat with the business setup assistant
 * @param userId The user's ID (optional)
 * @param message The user's message
 * @returns Assistant's response
 */
export async function chatWithBusinessAssistant(
  userId: number | undefined,
  message: string
): Promise<{
  conversationId: number;
  message: string;
  memory: {
    key_topics: string[];
    next_steps: string[];
    business_setup_info: Record<string, string>;
  };
}> {
  try {
    // Get or create a conversation
    const conversation = await getOrCreateConversation(userId);
    
    // Add user message to the conversation
    await addMessageToConversation(conversation.id, "user", message);
    
    // Get conversation history
    const conversationHistory = await getConversationHistoryForOpenAI(conversation.id);
    
    // Generate system message
    const systemMessage = await generateBusinessAssistantSystemMessage(userId);
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system" as const, content: systemMessage },
        ...conversationHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // Extract response content
    const assistantMessage = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    
    // Add assistant message to the conversation
    await addMessageToConversation(conversation.id, "assistant", assistantMessage);
    
    // Generate memory/context from the conversation
    const memory = await generateMemoryFromConversation(conversation.id, userId);
    
    // Update conversation summary based on memory
    await storage.updateConversation(conversation.id, {
      summary: memory.key_topics.join(", "),
      updatedAt: new Date()
    });
    
    return {
      conversationId: conversation.id,
      message: assistantMessage,
      memory
    };
  } catch (error) {
    console.error("Error in business assistant chat:", error);
    throw new Error("Failed to communicate with the business assistant");
  }
}

/**
 * Generate memory and context from a conversation
 * @param conversationId The conversation ID
 * @param userId The user's ID (optional)
 * @returns Extracted memory from the conversation
 */
export async function generateMemoryFromConversation(
  conversationId: number,
  userId: number | undefined
): Promise<{
  key_topics: string[];
  next_steps: string[];
  business_setup_info: Record<string, string>;
}> {
  try {
    // Get conversation messages
    const messages = await storage.getConversationMessages(conversationId);
    
    // Combine messages into a single context
    const conversationContext = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");
    
    // Call OpenAI API to analyze the conversation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content: `
You are an expert in analyzing conversations about UAE business setup. 
Extract key information from the conversation below and organize it into the following categories:
1. Key topics discussed
2. Next steps or actions recommended
3. Business setup information (business type, industry, location, etc.)

Format your response as a JSON object with the following structure:
{
  "key_topics": ["topic1", "topic2", ...],
  "next_steps": ["step1", "step2", ...],
  "business_setup_info": {
    "business_type": "extracted value or null",
    "business_activity": "extracted value or null",
    "free_zone": "extracted value or null",
    "initial_capital": "extracted value or null",
    "legal_structure": "extracted value or null",
    "license_type": "extracted value or null"
  }
}
`
        },
        {
          role: "user" as const,
          content: conversationContext
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    
    const memory = JSON.parse(content);
    
    // Update user's business setup if new information is available
    if (userId && memory.business_setup_info) {
      await updateBusinessSetupFromMemory(userId, memory.business_setup_info);
    }
    
    return memory;
  } catch (error) {
    console.error("Error generating memory from conversation:", error);
    return {
      key_topics: ["UAE business setup"],
      next_steps: ["Continue discussion"],
      business_setup_info: {}
    };
  }
}

/**
 * Update a user's business setup information based on conversation memory
 * @param userId The user's ID
 * @param businessInfo The extracted business information
 */
async function updateBusinessSetupFromMemory(
  userId: number,
  businessInfo: Record<string, string>
): Promise<void> {
  try {
    // Get existing business setup
    const existingSetup = await storage.getBusinessSetup(userId);
    
    // Prepare update data
    const updateData: Partial<BusinessSetup> = {};
    
    if (businessInfo.business_type && businessInfo.business_type !== "null") {
      updateData.businessType = businessInfo.business_type;
    }
    
    if (businessInfo.business_activity && businessInfo.business_activity !== "null") {
      updateData.businessActivity = businessInfo.business_activity;
    }
    
    if (businessInfo.free_zone && businessInfo.free_zone !== "null") {
      updateData.freeZone = businessInfo.free_zone;
    }
    
    if (businessInfo.initial_capital && businessInfo.initial_capital !== "null") {
      // Extract numeric value from string (e.g., "50,000 AED" -> 50000)
      const capital = parseInt(businessInfo.initial_capital.replace(/[^0-9]/g, ""));
      if (!isNaN(capital)) {
        updateData.initialCapital = capital;
      }
    }
    
    if (businessInfo.legal_structure && businessInfo.legal_structure !== "null") {
      updateData.legalForm = businessInfo.legal_structure;
    }
    
    if (businessInfo.license_type && businessInfo.license_type !== "null") {
      updateData.licenseType = businessInfo.license_type;
    }
    
    // If we have data to update
    if (Object.keys(updateData).length > 0) {
      if (existingSetup) {
        // Update existing setup
        await storage.updateBusinessSetup(existingSetup.id, updateData);
      } else {
        // Create new setup
        await storage.createBusinessSetup({
          userId,
          businessType: updateData.businessType || "General Trading",
          ...updateData as any,
          updatedAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error("Error updating business setup from memory:", error);
  }
}

/**
 * Get business setup flow steps for guided assistance
 * @param category The business setup category
 * @returns Array of setup flow steps
 */
export async function getBusinessSetupFlow(category: string): Promise<SetupFlowStep[]> {
  try {
    return await storage.getAllSetupFlowSteps(category);
  } catch (error) {
    console.error("Error getting business setup flow:", error);
    return [];
  }
}

/**
 * Get AI guidance for a specific setup flow step
 * @param stepId The step ID
 * @param userId The user's ID (optional)
 * @returns AI guidance for the step
 */
export async function getStepGuidance(
  stepId: number,
  userId: number | undefined
): Promise<{
  guidance: string;
  requirements: string[];
  recommendations: string[];
}> {
  try {
    // Get the step data
    const step = await storage.getSetupFlowStep(stepId);
    if (!step) {
      throw new Error("Step not found");
    }
    
    // Get user's business setup if available
    let businessSetupInfo = "";
    if (userId) {
      const businessSetup = await storage.getBusinessSetup(userId);
      if (businessSetup) {
        businessSetupInfo = `
Current business setup information:
- Business Type: ${businessSetup.businessType || "Not specified"}
- Legal Form: ${businessSetup.legalForm || "Not specified"}
- Free Zone: ${businessSetup.freeZone || "Not specified"}
- Business Activity: ${businessSetup.businessActivity || "Not specified"}
- Initial Capital: ${businessSetup.initialCapital ? `${businessSetup.initialCapital} AED` : "Not specified"}
- License Type: ${businessSetup.licenseType || "Not specified"}
- Status: ${businessSetup.status || "Pending"}
`;
      }
    }
    
    // Use the step's AI prompt if available, otherwise use a default prompt
    const prompt = step.aiPrompt || `
Provide guidance for the "${step.title}" step in the business setup process.
${step.description}

Please explain the requirements, process, and provide recommendations.
`;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content: `
You are an expert UAE business setup assistant, specialized in helping entrepreneurs establish businesses in the UAE.
Your task is to provide detailed guidance for specific steps in the business setup process.

${businessSetupInfo}

Format your response as a JSON object with the following structure:
{
  "guidance": "Detailed explanation of the step and how to complete it",
  "requirements": ["requirement 1", "requirement 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}
`
        },
        {
          role: "user" as const,
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error getting step guidance:", error);
    return {
      guidance: "We're experiencing technical difficulties. Please try again later.",
      requirements: [],
      recommendations: []
    };
  }
}

/**
 * Initialize default setup flow steps if none exist
 */
export async function initializeDefaultSetupFlowSteps(): Promise<void> {
  try {
    // Check if steps already exist
    const existingSteps = await storage.getAllSetupFlowSteps("general");
    if (existingSteps.length > 0) {
      return; // Steps already exist, no need to initialize
    }
    
    // Default business setup flow steps
    const defaultSteps = [
      {
        title: "Business Activity Selection",
        description: "Select the business activities your company will engage in",
        stepNumber: 1,
        category: "general",
        requiredFields: { industry: true, activities: true },
        aiPrompt: "Provide guidance on selecting appropriate business activities in the UAE. Include information about activity codes, permitted activities in different free zones, and common combinations of activities.",
        isActive: true
      },
      {
        title: "Company Name Reservation",
        description: "Choose and reserve your company name",
        stepNumber: 2,
        category: "general",
        requiredFields: { businessName: true },
        aiPrompt: "Explain the process of reserving a company name in the UAE. Include naming restrictions, required documentation, fees, and approval timeline.",
        isActive: true
      },
      {
        title: "Legal Structure Selection",
        description: "Choose the best legal structure for your business",
        stepNumber: 3,
        category: "general",
        requiredFields: { structure: true },
        aiPrompt: "Compare different legal structures available in the UAE (LLC, Free Zone Company, Sole Establishment, etc.). Explain the advantages, disadvantages, capital requirements, and ownership restrictions for each.",
        isActive: true
      },
      {
        title: "Free Zone Selection",
        description: "Select the most appropriate free zone for your business",
        stepNumber: 4,
        category: "general",
        requiredFields: { location: true, freeZone: true },
        aiPrompt: "Provide guidance on selecting the most suitable free zone in the UAE based on business activities, budget, and requirements. Compare popular free zones like DMCC, SAIF Zone, and DIC.",
        isActive: true
      },
      {
        title: "Document Preparation",
        description: "Prepare required documentation for business setup",
        stepNumber: 5,
        category: "general",
        requiredFields: {},
        aiPrompt: "List and explain all documents required for business setup in the selected free zone or mainland. Include information about attestation requirements, translation, and processing time.",
        isActive: true
      },
      {
        title: "Initial Approval Application",
        description: "Apply for initial approval from the relevant authority",
        stepNumber: 6,
        category: "general",
        requiredFields: {},
        aiPrompt: "Explain the process of obtaining initial approval for a business in the UAE. Include application procedures, required documentation, fees, and approval timeline.",
        isActive: true
      },
      {
        title: "Office Space Leasing",
        description: "Secure office space or virtual office for your business",
        stepNumber: 7,
        category: "general",
        requiredFields: {},
        aiPrompt: "Provide guidance on leasing office space in the UAE, including options in free zones and mainland. Explain virtual office options, flexi-desk arrangements, and permanent office requirements.",
        isActive: true
      },
      {
        title: "License Application",
        description: "Apply for your business license",
        stepNumber: 8,
        category: "general",
        requiredFields: {},
        aiPrompt: "Detail the process of applying for a business license in the UAE. Include application procedures, required documentation, fees, processing time, and post-approval steps.",
        isActive: true
      },
      {
        title: "Visa Processing",
        description: "Process visas for company owners and employees",
        stepNumber: 9,
        category: "general",
        requiredFields: {},
        aiPrompt: "Explain the process of obtaining visas in the UAE for business owners and employees. Include eligibility criteria, quota regulations, required documentation, medical testing, and visa types.",
        isActive: true
      },
      {
        title: "Bank Account Setup",
        description: "Open a corporate bank account for your business",
        stepNumber: 10,
        category: "general",
        requiredFields: {},
        aiPrompt: "Provide guidance on setting up a corporate bank account in the UAE. Include comparison of banks, required documentation, minimum deposit requirements, and application process.",
        isActive: true
      }
    ];
    
    // Create each step
    for (const step of defaultSteps) {
      await storage.createSetupFlowStep(step);
    }
    
    console.log("Default setup flow steps initialized");
  } catch (error) {
    console.error("Error initializing default setup flow steps:", error);
  }
}

/**
 * Initialize the system knowledge conversation to power the business assistant
 * This function loads all the data from the database into memory for better responses
 */
export async function initializeSystemKnowledge(): Promise<void> {
  try {
    console.log("Initializing system knowledge...");
    // Call the ES module version of the initialization function
    await runInitialization();
    
    // Create knowledge directory for caching if needed
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    const knowledgeFilePath = path.join(knowledgeDir, 'assistant-knowledge-base.json');
    
    // First check if we already have a system knowledge conversation
    const systemConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, "system-knowledge-base"));
    
    if (systemConversations.length > 0) {
      systemKnowledgeConversationId = systemConversations[0].id;
      console.log(`Using existing system knowledge conversation with ID: ${systemKnowledgeConversationId}`);
      return;
    }
    
    // If we have a saved knowledge base file but no conversation, create one
    if (fs.existsSync(knowledgeFilePath)) {
      console.log("Found existing knowledge base file, creating system conversation...");
      
      // Create system conversation
      const conversation = await storage.createConversation({
        sessionId: "system-knowledge-base",
        isActive: true,
        metadata: { type: "system_knowledge" },
        summary: "Comprehensive UAE business setup knowledge base"
      });
      
      systemKnowledgeConversationId = conversation.id;
      
      // Load the knowledge base file
      const knowledgeBase = fs.readFileSync(knowledgeFilePath, 'utf8');
      
      // Add to conversation as a system message
      await storage.addMessage({
        conversationId: conversation.id,
        role: "system",
        content: `CONSOLIDATED KNOWLEDGE BASE:\n${knowledgeBase}`,
        tokenCount: Math.ceil(knowledgeBase.length / 4),
        metadata: { type: "consolidated_knowledge" }
      });
      
      console.log(`Created system knowledge conversation with ID: ${conversation.id}`);
      return;
    }
    
    // If we don't have a knowledge base file or conversation, create it from scratch
    console.log("No existing knowledge base found, initializing assistant memory...");
    await initializeAssistantMemory();
    
    // Find the system conversation that was created
    const newSystemConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, "system-knowledge-base"));
    
    if (newSystemConversations.length > 0) {
      systemKnowledgeConversationId = newSystemConversations[0].id;
      console.log(`Initialized system knowledge conversation with ID: ${systemKnowledgeConversationId}`);
    } else {
      console.error("Failed to find or create system knowledge conversation");
    }
    
  } catch (error) {
    console.error("Error initializing system knowledge:", error);
  }
}

/**
 * Enhanced business assistant chat that includes system knowledge
 * @param userId The user's ID (optional)
 * @param message The user's message
 * @returns Assistant's response
 */
export async function chatWithEnhancedBusinessAssistant(
  userId: number | undefined,
  message: string
): Promise<{
  conversationId: number;
  message: string;
  memory: {
    key_topics: string[];
    next_steps: string[];
    business_setup_info: Record<string, string>;
  };
}> {
  try {
    // Ensure system knowledge is initialized
    if (systemKnowledgeConversationId === null) {
      await initializeSystemKnowledge();
    }
    
    // Get or create a conversation
    const conversation = await getOrCreateConversation(userId);
    
    // Add user message to the conversation
    await addMessageToConversation(conversation.id, "user", message);
    
    // Get conversation history
    const conversationHistory = await getConversationHistoryForOpenAI(conversation.id);
    
    // Generate system message
    const systemMessage = await generateBusinessAssistantSystemMessage(userId);
    
    // Get system knowledge from the knowledge conversation
    let systemKnowledge = "";
    if (systemKnowledgeConversationId !== null) {
      const knowledgeMessages = await storage.getConversationMessages(systemKnowledgeConversationId);
      const consolidatedMessage = knowledgeMessages.find(msg => 
        msg.role === "system" && msg.metadata?.type === "consolidated_knowledge"
      );
      
      if (consolidatedMessage) {
        systemKnowledge = `\n\nUSE THE FOLLOWING KNOWLEDGE BASE TO INFORM YOUR RESPONSES:\n${consolidatedMessage.content}`;
      }
    }
    
    // Enhanced system message with knowledge base
    const enhancedSystemMessage = systemMessage + systemKnowledge;
    
    console.log("Calling OpenAI API with enhanced context...");
    
    // Call OpenAI API with enhanced context - using gpt-4o for better performance
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system" as const, content: enhancedSystemMessage },
        ...conversationHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // Extract response content
    const assistantMessage = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    
    // Add assistant message to the conversation
    await addMessageToConversation(conversation.id, "assistant", assistantMessage);
    
    // Generate memory/context from the conversation
    const memory = await generateMemoryFromConversation(conversation.id, userId);
    
    // Update conversation summary based on memory
    await storage.updateConversation(conversation.id, {
      summary: memory.key_topics.join(", "),
      updatedAt: new Date()
    });
    
    return {
      conversationId: conversation.id,
      message: assistantMessage,
      memory
    };
  } catch (error) {
    console.error("Error in enhanced business assistant chat:", error);
    throw new Error("Failed to communicate with the enhanced business assistant");
  }
}