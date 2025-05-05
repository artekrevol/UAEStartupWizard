/**
 * AI Research Service - Handles OpenAI integration and web research capabilities
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { rateLimit } from 'express-rate-limit';
import OpenAI from 'openai';
import { errorHandlerMiddleware, ServiceException, ErrorCode } from '../../shared/errors';
import { createEventBus, EventType, createEvent } from '../../shared/event-bus';
import { ResearchStatus } from '../../shared/types';

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

// Initialize event bus
const eventBus = createEventBus();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

// Web research function to handle research requests
async function performWebResearch(topic: string, userId?: number) {
  try {
    // Create research record
    const research = {
      id: Math.floor(Math.random() * 1000),
      topic,
      userId,
      status: ResearchStatus.IN_PROGRESS,
      createdAt: new Date()
    };
    
    // In production, save to database
    // await db.insert(researchTopics).values(research);
    
    // Publish research requested event
    await eventBus.publish(createEvent(EventType.RESEARCH_REQUESTED, {
      id: research.id,
      topic: research.topic,
      userId: research.userId
    }));
    
    // Perform web research asynchronously
    setTimeout(async () => {
      try {
        // Perform AI research using OpenAI
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a business setup assistant specializing in UAE free zones. Provide accurate and helpful information about establishing businesses in UAE."
            },
            {
              role: "user",
              content: `Research the following topic about UAE business setup: ${topic}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        });
        
        // Format research results
        const results = response.choices[0].message.content;
        const sources = ['UAE Government Portal', 'Free Zone Authority websites', 'Business Setup Guides'];
        
        // Update research record
        const updatedResearch = {
          ...research,
          status: ResearchStatus.COMPLETED,
          results,
          sources,
          completedAt: new Date()
        };
        
        // In production, update in database
        // await db.update(researchTopics).set(updatedResearch).where(eq(researchTopics.id, research.id));
        
        // Publish research completed event
        await eventBus.publish(createEvent(EventType.RESEARCH_COMPLETED, {
          id: updatedResearch.id,
          topic: updatedResearch.topic,
          status: updatedResearch.status,
          userId: updatedResearch.userId
        }));
        
      } catch (error) {
        console.error('Error in async research process:', error);
        
        // Update research record with error
        const failedResearch = {
          ...research,
          status: ResearchStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          completedAt: new Date()
        };
        
        // In production, update in database
        // await db.update(researchTopics).set(failedResearch).where(eq(researchTopics.id, research.id));
        
        // Publish research failed event
        await eventBus.publish(createEvent(EventType.RESEARCH_COMPLETED, {
          id: failedResearch.id,
          topic: failedResearch.topic,
          status: failedResearch.status,
          error: failedResearch.error,
          userId: failedResearch.userId
        }));
      }
    }, 100); // Simulate async processing
    
    return {
      id: research.id,
      topic: research.topic,
      status: research.status,
      message: 'Research request has been submitted and is being processed.'
    };
    
  } catch (error) {
    console.error('Error in performWebResearch:', error);
    throw new ServiceException(
      ErrorCode.RESEARCH_FAILED,
      'Failed to perform web research',
      { topic }
    );
  }
}

// Define routes

// Submit research request
app.post('/research', aiLimiter, async (req, res, next) => {
  try {
    const { topic } = req.body;
    
    if (!topic || typeof topic !== 'string') {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Topic is required and must be a string'
      );
    }
    
    // Get user ID from auth context
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : undefined;
    
    // Perform web research
    const result = await performWebResearch(topic, userId);
    
    res.status(202).json(result);
    
  } catch (error) {
    next(error);
  }
});

// Get research status
app.get('/research/:id', async (req, res, next) => {
  try {
    const researchId = parseInt(req.params.id);
    
    // In production, fetch from database
    // const research = await db.select().from(researchTopics).where(eq(researchTopics.id, researchId)).limit(1);
    
    // Mock research status responses
    const mockResearch = {
      1: {
        id: 1,
        topic: 'Setting up a tech company in Dubai Internet City',
        status: ResearchStatus.COMPLETED,
        results: 'Detailed information about setting up in DIC, including costs, requirements and process steps...',
        sources: ['Dubai Internet City website', 'UAE Government Portal', 'Business Setup Guides'],
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(Date.now() - 3300000) // 55 minutes ago
      },
      2: {
        id: 2,
        topic: 'Tax benefits in Abu Dhabi Global Market',
        status: ResearchStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 300000) // 5 minutes ago
      },
      3: {
        id: 3,
        topic: 'Import/export regulations in DMCC',
        status: ResearchStatus.FAILED,
        error: 'Research timed out due to complexity of topic',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        completedAt: new Date(Date.now() - 7000000) // 1 hour 56 minutes ago
      }
    };
    
    if (mockResearch[researchId]) {
      res.json(mockResearch[researchId]);
    } else {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        `Research with ID ${researchId} not found`
      );
    }
    
  } catch (error) {
    next(error);
  }
});

// Get user's research history
app.get('/research/user/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // In production, fetch from database
    // const research = await db.select().from(researchTopics).where(eq(researchTopics.userId, userId));
    
    // Mock user research history
    const mockHistory = [
      {
        id: 1,
        topic: 'Setting up a tech company in Dubai Internet City',
        status: ResearchStatus.COMPLETED,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(Date.now() - 3300000) // 55 minutes ago
      },
      {
        id: 4,
        topic: 'Visa requirements for employees in UAE free zones',
        status: ResearchStatus.COMPLETED,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        completedAt: new Date(Date.now() - 86100000) // 23 hours 55 minutes ago
      }
    ];
    
    res.json(mockHistory);
    
  } catch (error) {
    next(error);
  }
});

// Chat with AI assistant
app.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message || typeof message !== 'string') {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Message is required and must be a string'
      );
    }
    
    // Get user ID from auth context
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : undefined;
    
    // In production, fetch conversation context if conversationId is provided
    // let conversation;
    // if (conversationId) {
    //   conversation = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    // }
    
    // Mock conversation context
    let conversationContext = [];
    if (conversationId === 1) {
      conversationContext = [
        { role: 'user', content: 'What documents do I need to set up a company in DMCC?' },
        { role: 'assistant', content: 'To set up a company in DMCC, you need several documents including: passport copies of all shareholders, business plan, bank reference letters, and completed application forms.' }
      ];
    }
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: 'You are a business setup assistant specializing in UAE free zones. Provide accurate and helpful information about establishing businesses in UAE.'
      },
      ...conversationContext.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      temperature: 0.7
    });
    
    const responseMessage = completion.choices[0].message.content;
    
    // Create chat message
    const chatMessage = {
      id: Math.floor(Math.random() * 1000),
      conversationId: conversationId || Math.floor(Math.random() * 1000),
      role: 'assistant',
      content: responseMessage,
      timestamp: new Date()
    };
    
    // In production, save to database
    // await db.insert(chatMessages).values(chatMessage);
    
    res.json({
      message: responseMessage,
      conversationId: chatMessage.conversationId
    });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    if (error.response?.status === 429) {
      throw new ServiceException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Rate limit exceeded, please try again later'
      );
    } else if (error.response?.status === 500) {
      throw new ServiceException(
        ErrorCode.OPENAI_ERROR,
        'Error communicating with the AI service'
      );
    }
    
    next(error);
  }
});

// Error handler
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`[AI Research Service] Server running on port ${PORT}`);
});
