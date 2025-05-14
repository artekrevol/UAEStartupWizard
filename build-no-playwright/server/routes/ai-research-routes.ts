import { Router } from 'express';
import { db } from '../db';
import { documents, freeZones } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { verifyJWT } from '../middleware/jwtMiddleware';

const router = Router();

// Middleware to check authentication
router.use(verifyJWT);

/**
 * Search for information about business setup in UAE
 */
router.post('/search', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }
    
    // Search for related free zones
    const relatedFreeZones = await db
      .select()
      .from(freeZones)
      .where(
        sql`to_tsvector('english', ${freeZones.name} || ' ' || COALESCE(${freeZones.description}, '')) @@ plainto_tsquery('english', ${topic})`
      )
      .limit(5);
    
    // Search for related documents
    const relatedDocuments = await db
      .select()
      .from(documents)
      .where(
        sql`to_tsvector('english', ${documents.title} || ' ' || COALESCE(${documents.content}, '')) @@ plainto_tsquery('english', ${topic})`
      )
      .limit(10);
    
    // Generate simulated web results (in production, this would use a real web search)
    const webResults = [
      {
        title: `UAE Business Setup: ${topic} Guide`,
        url: `https://www.example.com/uae-business-setup/${topic.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Comprehensive guide on ${topic} for UAE business setup, including regulations, requirements, and best practices.`
      },
      {
        title: `${topic} Requirements for UAE Company Formation`,
        url: `https://www.example.com/company-formation/${topic.toLowerCase().replace(/\s+/g, '-')}-requirements`,
        description: `Detailed information about the requirements and process for ${topic} in UAE business establishment.`
      },
      {
        title: `UAE Ministry of Economy: ${topic}`,
        url: 'https://www.moec.gov.ae/en/business-setup',
        description: `Official government information about ${topic} for business setup in UAE's mainland and free zones.`
      }
    ];
    
    // Generate a summary based on the results
    // In production, this would use an OpenAI API call
    const summary = `
Based on the research about "${topic}" for UAE business setup:

Key Points:
- ${topic} is an important aspect of business establishment in the UAE
- There are specific regulations and requirements related to ${topic} that businesses must comply with
- Several free zones offer specialized services and benefits for businesses focused on ${topic}
- Documentation requirements vary based on business type, activity, and jurisdiction

Recommendations:
- Consult with a specialized business setup consultant who has experience with ${topic}
- Compare different free zones to find the most advantageous location for your specific needs
- Ensure all documentation is properly prepared to avoid delays in the approval process
- Consider the long-term implications of your business setup decisions related to ${topic}`;
    
    // Construct and return the response
    const response = {
      topic,
      conversationId: Math.floor(Math.random() * 10000), // For demo purposes
      internalResults: {
        freeZones: relatedFreeZones,
        documents: relatedDocuments
      },
      webResults,
      summary,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error performing AI research:', error);
    res.status(500).json({ 
      message: 'Error performing research', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;