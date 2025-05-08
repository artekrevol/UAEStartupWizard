/**
 * AI Research Service
 * 
 * This microservice handles all AI-related functionality including:
 * - OpenAI API integration
 * - Web research using AI
 * - Business assistant functionality
 * - Document analysis and search
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'body-parser';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { getCommunicator, MessagePriority } from '../../shared/communication/service-communicator';
import { rateLimit } from 'express-rate-limit';
import { ResearchController } from './controllers/research-controller';
import { AssistantController } from './controllers/assistant-controller';
import { MemoryController } from './controllers/memory-controller';
import { AiService } from './services/ai-service';
import { WebResearchService } from './services/web-research-service';
import { checkOpenAIKey } from './middleware/api-key-check';
import OpenAI from 'openai';

// Initialize Express app
const app = express();
const PORT = process.env.AI_RESEARCH_SERVICE_PORT || 3005;
const SERVICE_NAME = 'ai-research-service';

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000
});

// Initialize services
const aiService = new AiService(openai);
const webResearchService = new WebResearchService(openai);

// Initialize controllers
const researchController = new ResearchController(aiService, webResearchService);
const assistantController = new AssistantController(aiService);
const memoryController = new MemoryController(aiService);

// Get communication system
const communicator = getCommunicator(SERVICE_NAME);

// Basic security middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '10mb' }));

// Rate limiting middleware
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later' }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: SERVICE_NAME, 
    uptime: process.uptime(),
    openaiKeyConfigured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Research endpoints
app.post('/api/research', checkOpenAIKey, researchController.performResearch);
app.get('/api/research/:id', researchController.getResearchById);

// Web research assistant endpoints
app.post('/api/web-research', checkOpenAIKey, researchController.performWebResearch);
app.post('/api/web-research/chat', checkOpenAIKey, researchController.chatWithWebResearchAssistant);

// Business assistant endpoints
app.post('/api/business-assistant', checkOpenAIKey, assistantController.businessAssistantQuery);
app.post('/api/business-assistant/quick-test', assistantController.quickTest);

// Assistant memory endpoints
app.post('/api/assistant/initialize-memory', checkOpenAIKey, memoryController.initializeMemory);
app.post('/api/assistant/update-memory', checkOpenAIKey, memoryController.updateMemory);

// Error handling middleware
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Server running on port ${PORT}`);
  
  // Register with API Gateway
  communicator.registerWithGateway({
    name: SERVICE_NAME,
    host: process.env.AI_RESEARCH_SERVICE_HOST || 'localhost',
    port: Number(PORT),
    healthEndpoint: '/health',
    routes: [
      { path: '/api/research', methods: ['POST', 'GET'] },
      { path: '/api/web-research', methods: ['POST'] },
      { path: '/api/web-research/chat', methods: ['POST'] },
      { path: '/api/business-assistant', methods: ['POST'] },
      { path: '/api/business-assistant/quick-test', methods: ['POST'] },
      { path: '/api/assistant/initialize-memory', methods: ['POST'] },
      { path: '/api/assistant/update-memory', methods: ['POST'] }
    ]
  }).then(() => {
    console.log(`[${SERVICE_NAME}] Registered with API Gateway`);
  }).catch(error => {
    console.error(`[${SERVICE_NAME}] Failed to register with API Gateway:`, error);
  });
  
  // Broadcast service status
  communicator.broadcastServiceStatus('up');
});

// Handle message bus communication
setupMessageHandlers();

// Setup message handlers for inter-service communication
function setupMessageHandlers() {
  // Listen for research requests
  communicator.onMessage('research.request', async (data, message) => {
    console.log(`[${SERVICE_NAME}] Received research request:`, data);
    
    try {
      const result = await researchController.handleResearchRequest(data);
      
      // Send result back to requesting service
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: true,
          result
        });
      } else {
        // Broadcast the result if no direct reply channel
        communicator.broadcast('research.completed', {
          requestId: data.requestId,
          result
        });
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error handling research request:`, error);
      
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: false,
          error: error.message
        });
      }
    }
  });
  
  // Listen for business assistant queries
  communicator.onMessage('business-assistant.query', async (data, message) => {
    console.log(`[${SERVICE_NAME}] Received business assistant query:`, data);
    
    try {
      const result = await assistantController.handleBusinessAssistantQuery(data);
      
      // Send result back to requesting service
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: true,
          result
        });
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error handling business assistant query:`, error);
      
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: false,
          error: error.message
        });
      }
    }
  });
  
  // Listen for web research requests
  communicator.onMessage('web-research.request', async (data, message) => {
    console.log(`[${SERVICE_NAME}] Received web research request:`, data);
    
    try {
      const result = await researchController.handleWebResearchRequest(data);
      
      // Send result back to requesting service
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: true,
          result
        });
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error handling web research request:`, error);
      
      if (message.source && message._replyTo) {
        communicator.respond(message, {
          success: false,
          error: error.message
        });
      }
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);
  
  // Notify API Gateway
  communicator.broadcastServiceStatus('down');
  
  server.close(() => {
    console.log(`[${SERVICE_NAME}] HTTP server closed`);
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    console.error(`[${SERVICE_NAME}] Forced shutdown after timeout`);
    process.exit(1);
  }, 5000);
}

export { app, server };