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

// Document mock data
interface Document {
  id: number;
  title: string;
  content?: string;
  documentType: string;
  freeZoneId?: number;
  category?: string;
  subcategory?: string;
  fileFormat?: string;
  language?: string;
  lastUpdated?: string;
  fileSize?: number;
  filePath?: string;
  [key: string]: any; // Allow additional fields
}

const mockDocuments: Document[] = [
  {
    id: 1,
    title: 'DMCC Business License Guide',
    documentType: 'guide',
    freeZoneId: 1,
    category: 'Business Setup',
    subcategory: 'Licensing',
    fileFormat: 'pdf',
    language: 'English',
    lastUpdated: new Date().toISOString(),
    fileSize: 1024,
    filePath: '/docs/dmcc/business-license-guide.pdf'
  },
  {
    id: 2,
    title: 'JAFZA Company Registration Process',
    documentType: 'procedure',
    freeZoneId: 2,
    category: 'Business Setup',
    subcategory: 'Registration',
    fileFormat: 'pdf',
    language: 'English',
    lastUpdated: new Date().toISOString(),
    fileSize: 2048,
    filePath: '/docs/jafza/registration-process.pdf'
  },
  {
    id: 3,
    title: 'SAIF Zone License Application Form',
    documentType: 'form',
    freeZoneId: 3,
    category: 'Forms',
    subcategory: 'Applications',
    fileFormat: 'pdf',
    language: 'English',
    lastUpdated: new Date().toISOString(),
    fileSize: 512,
    filePath: '/docs/saif-zone/license-application.pdf'
  }
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
  
  // Document endpoints
  app.get('/api/documents', (req, res) => {
    res.json(mockDocuments);
  });
  
  app.get('/api/documents/:id', (req, res) => {
    const { id } = req.params;
    const document = mockDocuments.find(doc => doc.id === Number(id));
    
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ message: 'Document not found' });
    }
  });
  
  app.get('/api/documents/search', (req, res) => {
    const { query } = req.query;
    
    if (!query) {
      return res.json(mockDocuments);
    }
    
    const filteredDocs = mockDocuments.filter(doc => 
      doc.title.toLowerCase().includes(String(query).toLowerCase()) || 
      (doc.content && doc.content.toLowerCase().includes(String(query).toLowerCase())) ||
      (doc.category && doc.category.toLowerCase().includes(String(query).toLowerCase())) ||
      (doc.subcategory && doc.subcategory.toLowerCase().includes(String(query).toLowerCase()))
    );
    
    res.json(filteredDocs);
  });
  
  app.get('/api/documents/by-freezone/:freeZoneId', (req, res) => {
    const { freeZoneId } = req.params;
    const filteredDocs = mockDocuments.filter(doc => doc.freeZoneId === Number(freeZoneId));
    res.json(filteredDocs);
  });
  
  app.post('/api/documents/validate', (req, res) => {
    // Check for user authentication (mock)
    const isAuthenticated = req.headers['x-auth-user'] === 'true';
    
    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Unauthorized - Login required' });
    }
    
    const { documentId, documentType, validationResult } = req.body;
    
    if (!documentId || !validationResult) {
      return res.status(400).json({ error: 'Document ID and validation result are required' });
    }
    
    // Mock successful validation
    const document = mockDocuments.find(doc => doc.id === Number(documentId));
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Update document with validation result
    document.validationResult = validationResult;
    document.validatedAt = new Date().toISOString();
    
    res.status(200).json({ success: true, document });
  });
  
  app.post('/api/documents/upload', (req, res) => {
    // Check for user authentication (mock)
    const isAuthenticated = req.headers['x-auth-user'] === 'true';
    
    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Unauthorized - Login required' });
    }
    
    // Mock successful upload
    const newDocument = {
      id: mockDocuments.length + 1,
      title: req.body.title || 'Uploaded Document',
      documentType: req.body.documentType || 'upload',
      freeZoneId: req.body.freeZoneId ? Number(req.body.freeZoneId) : undefined,
      category: req.body.category || 'Uploads',
      subcategory: req.body.subcategory,
      fileFormat: req.body.fileFormat || 'pdf',
      language: 'English',
      lastUpdated: new Date().toISOString(),
      fileSize: 1024,
      filePath: `/uploads/document-${mockDocuments.length + 1}.pdf`
    };
    
    mockDocuments.push(newDocument);
    
    res.status(201).json({ success: true, document: newDocument });
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