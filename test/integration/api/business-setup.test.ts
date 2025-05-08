import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import { startMockApiServer, stopMockApiServer } from '../../utils/mockApi';

// URL for our mock API server
const API_URL = 'http://localhost:5001';
let server: Server;

describe('Business Setup API', () => {
  // Test data for business setup
  const testBusinessSetup = {
    userId: 1,
    businessName: 'Test Company LLC',
    businessType: 'LLC',
    industry: 'Technology',
    employeeCount: 5,
    preferredFreeZones: [1, 3], // DMCC and SAIF Zone IDs
    contactEmail: 'contact@testcompany.com',
    contactPhone: '+971501234567',
    requirements: {
      tradeLicense: true,
      visas: true,
      bankAccount: true
    }
  };
  
  // Setup and teardown for tests
  beforeAll(async () => {
    // Start mock API server
    console.log('Starting mock API server for business setup tests...');
    server = await startMockApiServer();
  });

  afterAll(async () => {
    // Stop mock API server
    console.log('Stopping mock API server...');
    if (server) {
      await stopMockApiServer(server);
    }
  });

  // POST /api/business-setup
  test('POST /api/business-setup creates a new business setup', async () => {
    const response = await request(API_URL)
      .post('/api/business-setup')
      .send(testBusinessSetup)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');
    
    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/json/);
    
    // Check that response contains the submitted data plus an ID
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('businessName', testBusinessSetup.businessName);
    expect(response.body).toHaveProperty('businessType', testBusinessSetup.businessType);
    expect(response.body).toHaveProperty('industry', testBusinessSetup.industry);
    expect(response.body).toHaveProperty('createdAt');
  });

  // GET /api/business-setup/:id
  test('GET /api/business-setup/:id retrieves a specific business setup', async () => {
    // First create a business setup
    const createResponse = await request(API_URL)
      .post('/api/business-setup')
      .send(testBusinessSetup)
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json');
    
    const businessSetupId = createResponse.body.id;
    
    // Now retrieve it
    const getResponse = await request(API_URL)
      .get(`/api/business-setup/${businessSetupId}`)
      .set('Accept', 'application/json');
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers['content-type']).toMatch(/json/);
    expect(getResponse.body).toHaveProperty('id', businessSetupId);
    expect(getResponse.body).toHaveProperty('businessName', testBusinessSetup.businessName);
  });

  // GET /api/business-setup/:id with invalid ID
  test('GET /api/business-setup/:id with invalid ID returns 404', async () => {
    const response = await request(API_URL)
      .get('/api/business-setup/999999') // Assuming this ID doesn't exist
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Business setup not found');
  });

  // GET /api/industries
  test('GET /api/industries returns list of industries', async () => {
    const response = await request(API_URL)
      .get('/api/industries')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Expect common industries to be in the list
    expect(response.body).toContain('Technology');
    expect(response.body).toContain('Trading');
  });
});