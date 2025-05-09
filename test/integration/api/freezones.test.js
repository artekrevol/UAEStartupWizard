/**
 * Integration tests for the Free Zones API endpoints
 */

const request = require('supertest');
const express = require('express');
const { getFreeZonesRoute } = require('../../../server/routes');
const { MemStorage } = require('../../../server/storage');

// Mock data for tests
const mockFreeZones = [
  {
    id: 1,
    name: 'Dubai Multi Commodities Centre (DMCC)',
    description: 'Global hub for commodities trade and enterprise',
    website: 'https://www.dmcc.ae/',
    logoUrl: '/assets/logos/dmcc.png',
    location: 'Dubai',
    yearEstablished: 2002,
    totalCompanies: 21000,
    popularity: 10
  },
  {
    id: 2,
    name: 'Dubai Internet City (DIC)',
    description: 'Technology free zone for IT companies',
    website: 'https://www.dic.ae/',
    logoUrl: '/assets/logos/dic.png',
    location: 'Dubai',
    yearEstablished: 1999,
    totalCompanies: 1600,
    popularity: 9
  },
  {
    id: 3,
    name: 'Abu Dhabi Global Market (ADGM)',
    description: 'International financial center and free zone',
    website: 'https://www.adgm.com/',
    logoUrl: '/assets/logos/adgm.png',
    location: 'Abu Dhabi',
    yearEstablished: 2013,
    totalCompanies: 760,
    popularity: 8
  }
];

// Setup test app
function setupTestApp() {
  const app = express();
  app.use(express.json());
  
  // Create a mock storage instance with pre-populated data
  const storage = new MemStorage();
  storage.freeZones = [...mockFreeZones];
  
  // Register routes
  app.use('/api/free-zones', getFreeZonesRoute(storage));
  
  return { app, storage };
}

describe('Free Zones API', () => {
  let app;
  let storage;
  
  beforeEach(() => {
    const setup = setupTestApp();
    app = setup.app;
    storage = setup.storage;
  });
  
  describe('GET /api/free-zones', () => {
    it('should return all free zones', async () => {
      const response = await request(app)
        .get('/api/free-zones')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBe('Dubai Multi Commodities Centre (DMCC)');
      expect(response.body[1].name).toBe('Dubai Internet City (DIC)');
      expect(response.body[2].name).toBe('Abu Dhabi Global Market (ADGM)');
    });
  });
  
  describe('GET /api/free-zones/:id', () => {
    it('should return a specific free zone by ID', async () => {
      const response = await request(app)
        .get('/api/free-zones/2')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.id).toBe(2);
      expect(response.body.name).toBe('Dubai Internet City (DIC)');
      expect(response.body.location).toBe('Dubai');
    });
    
    it('should return 404 for non-existent free zone ID', async () => {
      await request(app)
        .get('/api/free-zones/99')
        .expect(404);
    });
  });
  
  describe('Filtering and sorting', () => {
    it('should filter free zones by location', async () => {
      const response = await request(app)
        .get('/api/free-zones?location=Dubai')
        .expect(200);
      
      expect(response.body).toHaveLength(2);
      expect(response.body[0].location).toBe('Dubai');
      expect(response.body[1].location).toBe('Dubai');
    });
    
    it('should sort free zones by popularity in descending order', async () => {
      const response = await request(app)
        .get('/api/free-zones?sort=popularity&order=desc')
        .expect(200);
      
      expect(response.body[0].popularity).toBe(10);
      expect(response.body[1].popularity).toBe(9);
      expect(response.body[2].popularity).toBe(8);
    });
    
    it('should sort free zones by name in ascending order', async () => {
      const response = await request(app)
        .get('/api/free-zones?sort=name&order=asc')
        .expect(200);
      
      // Names in alphabetical order
      expect(response.body[0].name).toBe('Abu Dhabi Global Market (ADGM)');
      expect(response.body[1].name).toBe('Dubai Internet City (DIC)');
      expect(response.body[2].name).toBe('Dubai Multi Commodities Centre (DMCC)');
    });
  });
});