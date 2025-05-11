/**
 * Mock API Service for testing
 * 
 * This creates a simplified version of our API for testing purposes
 */

import express from 'express';
import { Server } from 'http';
import cors from 'cors';

// Mock data
const mockFreeZones = [
  {
    id: 1,
    name: 'Dubai Multi Commodities Centre (DMCC)',
    description: 'Global free zone and Dubai government authority on commodities trade and enterprise.',
    location: 'Dubai',
    benefits: ['100% foreign ownership', 'Tax exemptions', 'Full capital repatriation'],
    requirements: ['Valid passport', 'Business plan', 'No objection certificate'],
    industries: ['Commodities', 'Trading', 'Services'],
    website: 'https://www.dmcc.ae',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Jebel Ali Free Zone (JAFZA)',
    description: 'One of the world\'s largest free zones, home to over 8,000 companies.',
    location: 'Dubai',
    benefits: ['0% import/export duties', '0% corporate tax', 'Multiple visa options'],
    requirements: ['Business application', 'Company documents', 'Shareholder documents'],
    industries: ['Logistics', 'Manufacturing', 'Trading'],
    website: 'https://www.jafza.ae',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Sharjah Airport International Free Zone (SAIF Zone)',
    description: 'Strategic location with global connectivity for businesses.',
    location: 'Sharjah',
    benefits: ['Proximity to airport and seaports', 'Competitive licensing', '100% foreign ownership'],
    requirements: ['Trade license application', 'Passport copies', 'Business plan'],
    industries: ['Aviation', 'Logistics', 'Manufacturing'],
    website: 'https://www.saif-zone.com',
    lastUpdated: new Date().toISOString()
  }
];

// Business setup mock data
// Define the BusinessSetup interface
interface BusinessSetup {
  id: number;
  freeZoneId?: number;
  companyName?: string;
  legalStructure?: string;
  activityType?: string;
  visaCount?: number;
  officeSpace?: string;
  initialCapital?: string;
  createdAt: string;
  [key: string]: any; // Allow additional fields
}

const mockBusinessSetups: BusinessSetup[] = [];

// Industries list
const mockIndustries = [
  'Trading',
  'Consulting',
  'Technology',
  'Manufacturing',
  'Logistics',
  'Food & Beverage',
  'Education',
  'Healthcare',
  'Tourism',
  'Real Estate'
];

/**
 * Creates and starts a mock API server for testing
 */
export function startMockApiServer(port = 5001): Promise<Server> {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(cors());
  
  // Free Zones endpoints
  app.get('/api/freezones', (req, res) => {
    res.json(mockFreeZones);
  });
  
  app.get('/api/freezones/:id', (req, res) => {
    const { id } = req.params;
    const freeZone = mockFreeZones.find(zone => zone.id === Number(id));
    
    if (freeZone) {
      res.json(freeZone);
    } else {
      res.status(404).json({ message: 'Free zone not found' });
    }
  });
  
  app.get('/api/freezones/compare', (req, res) => {
    const { ids } = req.query;
    
    if (!ids) {
      return res.status(400).json({ message: 'No IDs provided for comparison' });
    }
    
    const idList = String(ids).split(',').map(Number);
    const freeZonesToCompare = mockFreeZones.filter(zone => idList.includes(zone.id));
    
    res.json(freeZonesToCompare);
  });
  
  app.get('/api/freezones/filter', (req, res) => {
    const { location, industry } = req.query;
    
    let filteredZones = [...mockFreeZones];
    
    if (location) {
      filteredZones = filteredZones.filter(zone => 
        zone.location.toLowerCase().includes(String(location).toLowerCase())
      );
    }
    
    if (industry) {
      filteredZones = filteredZones.filter(zone => 
        zone.industries.some(ind => 
          ind.toLowerCase().includes(String(industry).toLowerCase())
        )
      );
    }
    
    res.json(filteredZones);
  });
  
  // Business setup endpoints
  app.post('/api/business-setup', (req, res) => {
    const newSetup = {
      id: mockBusinessSetups.length + 1,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    mockBusinessSetups.push(newSetup);
    res.status(201).json(newSetup);
  });
  
  app.get('/api/business-setup/:id', (req, res) => {
    const { id } = req.params;
    const setup = mockBusinessSetups.find(s => s.id === Number(id));
    
    if (setup) {
      res.json(setup);
    } else {
      res.status(404).json({ message: 'Business setup not found' });
    }
  });
  
  // Industries endpoint
  app.get('/api/industries', (req, res) => {
    res.json(mockIndustries);
  });
  
  // Mock notification endpoints
  app.post('/api/test-notification', (req, res) => {
    // Check for admin authorization (mock)
    const hasAdminAuth = req.headers['x-admin-auth'] === 'true';
    
    if (!hasAdminAuth) {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    }
    
    const { title, message, type, userId } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    // Mock successful notification
    const notification = {
      id: `notification-${Date.now()}`,
      type: type || 'info',
      title,
      message,
      timestamp: Date.now(),
      sent: true
    };
    
    res.status(200).json({ success: true, notification });
  });
  
  app.post('/api/system-notification', (req, res) => {
    // Check for admin authorization (mock)
    const hasAdminAuth = req.headers['x-admin-auth'] === 'true';
    
    if (!hasAdminAuth) {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    }
    
    const { title, message, type, severity, logToDatabase } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    // Mock successful system notification
    const notification = {
      id: `system-notification-${Date.now()}`,
      type: type || 'info',
      title: `[SYSTEM] ${title}`,
      message,
      timestamp: Date.now(),
      isSystem: true,
      sent: true
    };
    
    res.status(200).json({ success: true, notification });
  });
  
  app.post('/api/notifications/self', (req, res) => {
    // Check for user authentication (mock)
    const isAuthenticated = req.headers['x-auth-user'] === 'true';
    
    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Unauthorized - Login required' });
    }
    
    const { title, message, type } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    // Mock successful self notification
    const notification = {
      id: `notification-${Date.now()}`,
      type: type || 'info',
      title,
      message,
      timestamp: Date.now(),
      sent: true
    };
    
    res.status(200).json({ success: true, notification });
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Start the server
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Mock API server running on port ${port}`);
      resolve(server);
    });
  });
}

/**
 * Stops a running mock API server
 */
export function stopMockApiServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Mock API server stopped');
        resolve();
      }
    });
  });
}