/**
 * Initialize Assistant Memory
 * 
 * This script loads all existing data from the database into the assistant's memory
 * to ensure it has comprehensive knowledge about UAE free zones and business setup.
 */
import OpenAI from "openai";
import { storage } from "./storage";
import { db } from "./db";
import * as fs from 'fs';
import * as path from 'path';
import { freeZones, documents, businessActivities, establishmentGuides } from "../shared/schema";

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Main function to initialize assistant memory
 */
export async function initializeAssistantMemory(): Promise<void> {
  try {
    console.log("Initializing assistant memory with existing data...");
    
    // 1. Create a system-level conversation for the assistant's knowledge base
    const conversation = await storage.createConversation({
      sessionId: "system-knowledge-base",
      isActive: true,
      metadata: { type: "system_knowledge" },
      summary: "Comprehensive UAE business setup knowledge base"
    });
    
    console.log(`Created system knowledge base conversation with ID: ${conversation.id}`);
    
    // 2. Load all free zone data
    const allFreeZones = await db.select().from(freeZones);
    if (allFreeZones.length > 0) {
      console.log(`Loading ${allFreeZones.length} free zones into memory...`);
      
      // Format free zone data as a structured knowledge base
      const freeZoneKnowledge = formatFreeZoneData(allFreeZones);
      
      // Add to conversation as a system message
      await storage.addMessage({
        conversationId: conversation.id,
        role: "system",
        content: freeZoneKnowledge,
        tokenCount: Math.ceil(freeZoneKnowledge.length / 4),
        metadata: { type: "free_zone_knowledge" }
      });
      
      console.log("Free zone knowledge added to memory");
    }
    
    // 3. Load all business activities
    const allBusinessActivities = await db.select().from(businessActivities).limit(500);
    if (allBusinessActivities.length > 0) {
      console.log(`Loading ${allBusinessActivities.length} business activities into memory...`);
      
      // Group activities by industry groups for better organization
      const activityGroups: Record<string, any[]> = {};
      allBusinessActivities.forEach(activity => {
        const group = activity.industryGroup || "Other";
        if (!activityGroups[group]) {
          activityGroups[group] = [];
        }
        activityGroups[group].push(activity);
      });
      
      // Format business activities as structured knowledge
      const businessKnowledge = formatBusinessActivitiesData(activityGroups);
      
      // Add to conversation as a system message
      await storage.addMessage({
        conversationId: conversation.id,
        role: "system",
        content: businessKnowledge,
        tokenCount: Math.ceil(businessKnowledge.length / 4),
        metadata: { type: "business_activities_knowledge" }
      });
      
      console.log("Business activities knowledge added to memory");
    }
    
    // 4. Load all establishment guides
    const allGuides = await db.select().from(establishmentGuides);
    if (allGuides.length > 0) {
      console.log(`Loading ${allGuides.length} establishment guides into memory...`);
      
      // Format guides as structured knowledge
      const guidesKnowledge = formatEstablishmentGuidesData(allGuides);
      
      // Add to conversation as a system message
      await storage.addMessage({
        conversationId: conversation.id,
        role: "system",
        content: guidesKnowledge,
        tokenCount: Math.ceil(guidesKnowledge.length / 4),
        metadata: { type: "establishment_guides_knowledge" }
      });
      
      console.log("Establishment guides knowledge added to memory");
    }
    
    // 5. Process all documents in chunks to avoid token limits
    const allDocuments = await storage.getAllDocuments();
    if (allDocuments.length > 0) {
      console.log(`Processing ${allDocuments.length} documents for memory integration...`);
      
      // Group documents by category
      const documentsByCategory: Record<string, any[]> = {};
      allDocuments.forEach(doc => {
        const category = doc.category || "General";
        if (!documentsByCategory[category]) {
          documentsByCategory[category] = [];
        }
        documentsByCategory[category].push(doc);
      });
      
      // Process each category as a separate knowledge chunk
      for (const [category, docs] of Object.entries(documentsByCategory)) {
        console.log(`Processing ${docs.length} documents in category: ${category}`);
        
        // Format documents as knowledge
        const docsKnowledge = formatDocumentsData(docs, category);
        
        // Add to conversation as a system message
        await storage.addMessage({
          conversationId: conversation.id,
          role: "system",
          content: docsKnowledge,
          tokenCount: Math.ceil(docsKnowledge.length / 4),
          metadata: { type: "document_knowledge", category }
        });
      }
      
      console.log("Document knowledge added to memory");
    }
    
    // 6. Create a system prompt that instructs the assistant on how to use this knowledge
    const systemPrompt = `
You are an expert premium business setup assistant for the UAE, specializing in helping entrepreneurs establish businesses in various free zones.
You have been initialized with comprehensive knowledge about:

1. All UAE free zones, their requirements, benefits, and costs
2. Business activities and industry classifications
3. Establishment guides with step-by-step procedures
4. Detailed documentation about business setup processes

Your job is to provide accurate, helpful, and tailored guidance to business owners looking to set up their operations in the UAE.
When responding:
- Draw from your initialized knowledge base first
- Provide specific, actionable advice based on the user's needs
- Compare relevant free zones when appropriate to help users make informed decisions
- Break down complex regulatory processes into clear steps
- Maintain a professional yet friendly tone
- Cite specific documents or free zones when providing details

Always prioritize official information and regulations in your responses.
    `;
    
    // Add the system prompt to the conversation
    await storage.addMessage({
      conversationId: conversation.id,
      role: "system",
      content: systemPrompt,
      tokenCount: Math.ceil(systemPrompt.length / 4),
      metadata: { type: "system_instructions" }
    });
    
    console.log("Assistant system instructions added to memory");
    
    // 7. Use OpenAI to generate a consolidated knowledge summary
    const messages = await storage.getConversationMessages(conversation.id);
    const systemMessages = messages.filter(msg => msg.role === "system").map(msg => msg.content);
    
    // Join all system messages to create a comprehensive knowledge context
    const knowledgeContext = systemMessages.join("\n\n");
    
    // Generate a compressed memory representation using OpenAI
    console.log("Generating compressed knowledge representation...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are an expert knowledge processor. You will be provided with a large amount of information about UAE business setup, free zones, 
and related topics. Your task is to:

1. Process this information completely
2. Create a compressed, structured knowledge representation that captures all key facts, processes, and details
3. Organize the information by topics and subtopics
4. Format the output as a comprehensive knowledge base in JSON format with the following structure:
{
  "free_zones": [
    {
      "name": "Zone name",
      "description": "Brief description",
      "key_benefits": ["benefit1", "benefit2"],
      "key_requirements": ["req1", "req2"],
      "suitable_for": ["industry1", "industry2"]
    }
  ],
  "business_setup_process": {
    "general_steps": ["step1", "step2"],
    "key_considerations": ["consideration1", "consideration2"]
  },
  "license_types": [
    {
      "name": "License name",
      "description": "Description",
      "permitted_activities": ["activity1", "activity2"],
      "requirements": ["requirement1", "requirement2"]
    }
  ],
  "document_requirements": {
    "personal_documents": ["doc1", "doc2"],
    "business_documents": ["doc1", "doc2"]
  }
}

Make sure your output is properly formatted, comprehensive, and captures all the essential knowledge from the input.
`
        },
        {
          role: "user",
          content: `Process this information about UAE business setup and create a compressed knowledge representation:\n\n${knowledgeContext.substring(0, 50000)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Extract and save the compressed knowledge representation
    const compressedKnowledge = response.choices[0].message.content;
    if (compressedKnowledge) {
      console.log("Saving compressed knowledge representation...");
      
      // Save to a file for potential future use
      const knowledgeDir = path.join(process.cwd(), 'knowledge');
      if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(knowledgeDir, 'assistant-knowledge-base.json'),
        compressedKnowledge
      );
      
      // Add to conversation as a consolidated summary
      await storage.addMessage({
        conversationId: conversation.id,
        role: "system",
        content: `CONSOLIDATED KNOWLEDGE BASE:\n${compressedKnowledge}`,
        tokenCount: Math.ceil(compressedKnowledge.length / 4),
        metadata: { type: "consolidated_knowledge" }
      });
      
      console.log("Compressed knowledge added to memory");
    }
    
    console.log("Assistant memory initialization complete!");
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error initializing assistant memory:", error);
    return Promise.reject(error);
  }
}

/**
 * Format free zone data into a structured knowledge document
 */
function formatFreeZoneData(freeZones: any[]): string {
  return `
# UAE FREE ZONES KNOWLEDGE BASE

This document contains comprehensive information about all UAE free zones for business setup.

${freeZones.map(zone => `
## ${zone.name}

### Description
${zone.description || 'A free zone in the UAE offering various business setup options.'}

### Location
${zone.location || 'United Arab Emirates'}

### Key Benefits
${Array.isArray(zone.benefits) && zone.benefits.length > 0 
  ? zone.benefits.map(benefit => `- ${benefit}`).join('\n')
  : '- 100% foreign ownership\n- Tax exemptions\n- Full repatriation of capital and profits'}

### Industries
${Array.isArray(zone.industries) && zone.industries.length > 0 
  ? zone.industries.map(industry => `- ${industry}`).join('\n')
  : '- Multiple industry sectors supported'}

### Requirements
${Array.isArray(zone.requirements) && zone.requirements.length > 0 
  ? zone.requirements.map(req => `- ${req}`).join('\n')
  : '- Standard UAE free zone requirements apply'}

### Additional Information
${zone.additionalInfo || ''}
`).join('\n')}
`;
}

/**
 * Format business activities data into a structured knowledge document
 */
function formatBusinessActivitiesData(activityGroups: Record<string, any[]>): string {
  return `
# UAE BUSINESS ACTIVITIES KNOWLEDGE BASE

This document contains comprehensive information about business activities and classifications in the UAE.

${Object.entries(activityGroups).map(([group, activities]) => `
## ${group} Industry

${activities.slice(0, 20).map(activity => `
### ${activity.name || 'Business Activity'}
- Code: ${activity.activityCode || 'N/A'}
- Description: ${activity.description || 'No description available'}
${activity.approvalRequirements ? `- Approval Requirements: ${activity.approvalRequirements}` : ''}
`).join('\n')}
${activities.length > 20 ? `\n... and ${activities.length - 20} more activities in this industry group` : ''}
`).join('\n')}
`;
}

/**
 * Format establishment guides data into a structured knowledge document
 */
function formatEstablishmentGuidesData(guides: any[]): string {
  return `
# UAE BUSINESS ESTABLISHMENT GUIDES

This document contains comprehensive guides for establishing businesses in the UAE.

${guides.map(guide => `
## ${guide.title}

### Category
${guide.category || 'General'}

### Overview
${guide.content?.substring(0, 500) || 'No content available'}${guide.content?.length > 500 ? '...' : ''}

### Requirements
${Array.isArray(guide.requirements) && guide.requirements.length > 0 
  ? guide.requirements.map(req => `- ${req}`).join('\n')
  : '- No specific requirements listed'}

### Documents Needed
${Array.isArray(guide.documents) && guide.documents.length > 0 
  ? guide.documents.map(doc => `- ${doc}`).join('\n')
  : '- No specific documents listed'}

### Steps
${Array.isArray(guide.steps) && guide.steps.length > 0 
  ? guide.steps.map((step, index) => 
      typeof step === 'string' 
        ? `${index + 1}. ${step}` 
        : `${index + 1}. ${step.title || 'Step'}: ${step.description || ''}`)
    .join('\n')
  : '- No specific steps listed'}
`).join('\n')}
`;
}

/**
 * Format documents data into a structured knowledge document
 */
function formatDocumentsData(documents: any[], category: string): string {
  return `
# UAE BUSINESS DOCUMENTS: ${category.toUpperCase()}

This document contains relevant information extracted from ${category} documents for UAE business setup.

${documents.map(doc => `
## ${doc.title || 'Document'}

### File: ${doc.filename || 'N/A'}
### Category: ${doc.category || 'General'} / ${doc.subcategory || 'General'}
### Type: ${doc.documentType || 'Text'}

### Content
${doc.content?.substring(0, 1000) || 'No content available'}${doc.content?.length > 1000 ? '...' : ''}
`).join('\n')}
`;
}

// In ES modules, there's no direct equivalent to require.main === module
// We'll export the initialization function to be called from elsewhere
export async function runInitialization(): Promise<void> {
  console.log("Starting assistant memory initialization...");
  try {
    await initializeAssistantMemory();
    console.log("Assistant memory initialization successful.");
    return Promise.resolve();
  } catch (error) {
    console.error("Assistant memory initialization failed:", error);
    return Promise.reject(error);
  }
}