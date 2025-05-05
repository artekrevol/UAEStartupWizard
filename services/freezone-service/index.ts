/**
 * Freezone Data Service - Manages information about UAE free zones
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { errorHandlerMiddleware, ServiceException, ErrorCode } from '../../shared/errors';
import { createEventBus, EventType, createEvent } from '../../shared/event-bus';

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

// Initialize event bus
const eventBus = createEventBus();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Define routes

// Get all free zones
app.get('/freezones', async (req, res, next) => {
  try {
    // In production, fetch from database
    // const freezones = await db.select().from(freezones);
    
    // Mock response
    const mockFreeZones = [
      {
        id: 1,
        name: 'Dubai Multi Commodities Centre (DMCC)',
        description: 'Global hub for trade and enterprise in Dubai',
        location: 'Dubai',
        website: 'https://www.dmcc.ae',
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Business support services'],
        industries: ['Commodities', 'Financial Services', 'Technology'],
        setupCost: {
          license: 15000,
          registration: 10000,
          visa: 5000
        }
      },
      {
        id: 2,
        name: 'Dubai Internet City (DIC)',
        description: 'Technology free zone in Dubai',
        location: 'Dubai',
        website: 'https://www.dic.ae',
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Tech ecosystem'],
        industries: ['Technology', 'Software', 'Internet'],
        setupCost: {
          license: 20000,
          registration: 12000,
          visa: 5000
        }
      },
      {
        id: 3,
        name: 'Abu Dhabi Global Market (ADGM)',
        description: 'International financial center in Abu Dhabi',
        location: 'Abu Dhabi',
        website: 'https://www.adgm.com',
        benefits: ['Common law framework', 'Financial services ecosystem', 'World-class infrastructure'],
        industries: ['Financial Services', 'Asset Management', 'Banking'],
        setupCost: {
          license: 25000,
          registration: 15000,
          visa: 6000
        }
      }
    ];
    
    res.json(mockFreeZones);
  } catch (error) {
    next(error);
  }
});

// Get free zone by ID
app.get('/freezones/:id', async (req, res, next) => {
  try {
    const freezoneId = parseInt(req.params.id);
    
    // In production, fetch from database
    // const freezone = await db.select().from(freezones).where(eq(freezones.id, freezoneId)).limit(1);
    
    // Mock response
    const mockFreeZones = {
      1: {
        id: 1,
        name: 'Dubai Multi Commodities Centre (DMCC)',
        description: 'Global hub for trade and enterprise in Dubai',
        location: 'Dubai',
        website: 'https://www.dmcc.ae',
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Business support services'],
        industries: ['Commodities', 'Financial Services', 'Technology'],
        setupCost: {
          license: 15000,
          registration: 10000,
          visa: 5000
        },
        requirements: {
          documents: ['Passport copy', 'CV/Resume', 'Business plan', 'Bank reference letter'],
          process: ['Submit application', 'Document verification', 'Payment', 'License issuance'],
          timeline: '2-3 weeks'
        }
      },
      2: {
        id: 2,
        name: 'Dubai Internet City (DIC)',
        description: 'Technology free zone in Dubai',
        location: 'Dubai',
        website: 'https://www.dic.ae',
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Tech ecosystem'],
        industries: ['Technology', 'Software', 'Internet'],
        setupCost: {
          license: 20000,
          registration: 12000,
          visa: 5000
        },
        requirements: {
          documents: ['Passport copy', 'CV/Resume', 'Business plan', 'NOC from previous sponsor'],
          process: ['Initial approval', 'Document submission', 'Payment', 'License issuance'],
          timeline: '3-4 weeks'
        }
      },
      3: {
        id: 3,
        name: 'Abu Dhabi Global Market (ADGM)',
        description: 'International financial center in Abu Dhabi',
        location: 'Abu Dhabi',
        website: 'https://www.adgm.com',
        benefits: ['Common law framework', 'Financial services ecosystem', 'World-class infrastructure'],
        industries: ['Financial Services', 'Asset Management', 'Banking'],
        setupCost: {
          license: 25000,
          registration: 15000,
          visa: 6000
        },
        requirements: {
          documents: ['Passport copy', 'CV/Resume', 'Business plan', 'Financial statements', 'Reference letters'],
          process: ['Application submission', 'Interview', 'Approval', 'Registration', 'License issuance'],
          timeline: '4-6 weeks'
        }
      }
    };
    
    if (mockFreeZones[freezoneId]) {
      res.json(mockFreeZones[freezoneId]);
    } else {
      throw new ServiceException(
        ErrorCode.FREEZONE_NOT_FOUND,
        `Free zone with ID ${freezoneId} not found`
      );
    }
  } catch (error) {
    next(error);
  }
});

// Get business activities
app.get('/business-activities', async (req, res, next) => {
  try {
    const { category, industryGroup, freeZoneId } = req.query;
    
    // In production, fetch from database with filters
    // let query = db.select().from(businessActivities);
    // if (category) query = query.where(eq(businessActivities.category, category));
    // if (industryGroup) query = query.where(eq(businessActivities.industryGroup, industryGroup));
    // const activities = await query;
    
    // Mock response
    const mockActivities = [
      {
        id: 1,
        name: 'Software Development',
        code: 'IT-001',
        description: 'Development of software applications and solutions',
        category: 'Technology',
        industryGroup: 'Information Technology',
        permittedFreeZones: [1, 2],
        approvalRequirements: {
          approvalTime: '1-2 weeks',
          specialApprovals: false
        }
      },
      {
        id: 2,
        name: 'Financial Advisory',
        code: 'FIN-001',
        description: 'Providing financial advice and consultancy services',
        category: 'Finance',
        industryGroup: 'Financial Services',
        permittedFreeZones: [1, 3],
        approvalRequirements: {
          approvalTime: '2-3 weeks',
          specialApprovals: true,
          approvingAuthority: 'Financial Regulatory Authority'
        }
      },
      {
        id: 3,
        name: 'E-commerce',
        code: 'COM-001',
        description: 'Online retail and e-commerce operations',
        category: 'Commerce',
        industryGroup: 'Retail & Trading',
        permittedFreeZones: [1, 2],
        approvalRequirements: {
          approvalTime: '1-2 weeks',
          specialApprovals: false
        }
      }
    ];
    
    // Apply filters if provided
    let filteredActivities = [...mockActivities];
    if (category) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.category.toLowerCase() === (category as string).toLowerCase()
      );
    }
    if (industryGroup) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.industryGroup.toLowerCase() === (industryGroup as string).toLowerCase()
      );
    }
    if (freeZoneId) {
      const fzId = parseInt(freeZoneId as string);
      filteredActivities = filteredActivities.filter(activity => 
        activity.permittedFreeZones.includes(fzId)
      );
    }
    
    res.json(filteredActivities);
  } catch (error) {
    next(error);
  }
});

// Get business activity by ID
app.get('/business-activities/:id', async (req, res, next) => {
  try {
    const activityId = parseInt(req.params.id);
    
    // In production, fetch from database
    // const activity = await db.select().from(businessActivities).where(eq(businessActivities.id, activityId)).limit(1);
    
    // Mock response
    const mockActivities = {
      1: {
        id: 1,
        name: 'Software Development',
        code: 'IT-001',
        description: 'Development of software applications and solutions',
        category: 'Technology',
        industryGroup: 'Information Technology',
        permittedFreeZones: [1, 2],
        approvalRequirements: {
          approvalTime: '1-2 weeks',
          specialApprovals: false
        }
      },
      2: {
        id: 2,
        name: 'Financial Advisory',
        code: 'FIN-001',
        description: 'Providing financial advice and consultancy services',
        category: 'Finance',
        industryGroup: 'Financial Services',
        permittedFreeZones: [1, 3],
        approvalRequirements: {
          approvalTime: '2-3 weeks',
          specialApprovals: true,
          approvingAuthority: 'Financial Regulatory Authority'
        }
      },
      3: {
        id: 3,
        name: 'E-commerce',
        code: 'COM-001',
        description: 'Online retail and e-commerce operations',
        category: 'Commerce',
        industryGroup: 'Retail & Trading',
        permittedFreeZones: [1, 2],
        approvalRequirements: {
          approvalTime: '1-2 weeks',
          specialApprovals: false
        }
      }
    };
    
    if (mockActivities[activityId]) {
      res.json(mockActivities[activityId]);
    } else {
      throw new ServiceException(
        ErrorCode.BUSINESS_ACTIVITY_NOT_FOUND,
        `Business activity with ID ${activityId} not found`
      );
    }
  } catch (error) {
    next(error);
  }
});

// Compare free zones
app.post('/compare', async (req, res, next) => {
  try {
    const { freezoneIds, businessActivityId } = req.body;
    
    if (!Array.isArray(freezoneIds) || freezoneIds.length < 2) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'At least two free zone IDs are required for comparison'
      );
    }
    
    // In production, fetch from database
    // const freezones = await db.select().from(freezones).where(in(freezones.id, freezoneIds));
    
    // Mock free zones data
    const mockFreeZones = {
      1: {
        id: 1,
        name: 'Dubai Multi Commodities Centre (DMCC)',
        location: 'Dubai',
        setupCost: {
          license: 15000,
          registration: 10000,
          visa: 5000,
          total: 30000
        },
        timeline: '2-3 weeks',
        visaQuota: 5,
        officeOptions: ['Flexi Desk', 'Fixed Desk', 'Office Space'],
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Business support services']
      },
      2: {
        id: 2,
        name: 'Dubai Internet City (DIC)',
        location: 'Dubai',
        setupCost: {
          license: 20000,
          registration: 12000,
          visa: 5000,
          total: 37000
        },
        timeline: '3-4 weeks',
        visaQuota: 6,
        officeOptions: ['Fixed Desk', 'Office Space'],
        benefits: ['100% foreign ownership', 'Tax exemptions', 'Tech ecosystem']
      },
      3: {
        id: 3,
        name: 'Abu Dhabi Global Market (ADGM)',
        location: 'Abu Dhabi',
        setupCost: {
          license: 25000,
          registration: 15000,
          visa: 6000,
          total: 46000
        },
        timeline: '4-6 weeks',
        visaQuota: 7,
        officeOptions: ['Office Space'],
        benefits: ['Common law framework', 'Financial services ecosystem', 'World-class infrastructure']
      }
    };
    
    // Get data for requested free zones
    const comparisonData = freezoneIds.map(id => {
      if (!mockFreeZones[id]) {
        throw new ServiceException(
          ErrorCode.FREEZONE_NOT_FOUND,
          `Free zone with ID ${id} not found`
        );
      }
      return mockFreeZones[id];
    });
    
    // Add business activity compatibility if provided
    if (businessActivityId) {
      const activityId = parseInt(businessActivityId);
      const mockActivities = {
        1: {
          permittedFreeZones: [1, 2],
          name: 'Software Development'
        },
        2: {
          permittedFreeZones: [1, 3],
          name: 'Financial Advisory'
        },
        3: {
          permittedFreeZones: [1, 2],
          name: 'E-commerce'
        }
      };
      
      const activity = mockActivities[activityId];
      
      if (!activity) {
        throw new ServiceException(
          ErrorCode.BUSINESS_ACTIVITY_NOT_FOUND,
          `Business activity with ID ${activityId} not found`
        );
      }
      
      // Add compatibility info to each free zone
      comparisonData.forEach(freezone => {
        freezone.activityCompatible = activity.permittedFreeZones.includes(freezone.id);
        freezone.activityName = activity.name;
      });
    }
    
    res.json({
      comparison: comparisonData,
      businessActivity: businessActivityId ? mockActivities[businessActivityId].name : null
    });
    
  } catch (error) {
    next(error);
  }
});

// Public endpoints for non-authenticated users
app.get('/public/freezones', async (req, res, next) => {
  try {
    // Return limited information for public access
    const mockPublicFreeZones = [
      {
        id: 1,
        name: 'Dubai Multi Commodities Centre (DMCC)',
        description: 'Global hub for trade and enterprise in Dubai',
        location: 'Dubai'
      },
      {
        id: 2,
        name: 'Dubai Internet City (DIC)',
        description: 'Technology free zone in Dubai',
        location: 'Dubai'
      },
      {
        id: 3,
        name: 'Abu Dhabi Global Market (ADGM)',
        description: 'International financial center in Abu Dhabi',
        location: 'Abu Dhabi'
      }
    ];
    
    res.json(mockPublicFreeZones);
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`[Freezone Service] Server running on port ${PORT}`);
});
