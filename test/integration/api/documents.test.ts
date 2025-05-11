import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import { startMockApiServer, stopMockApiServer } from '../../utils/mockApi';

// URL for our mock API server
const API_URL = 'http://localhost:5001';
let server: Server;

describe('Documents API', () => {
  // Setup and teardown for tests
  beforeAll(async () => {
    // Start mock API server
    console.log('Starting mock API server for document tests...');
    server = await startMockApiServer();
  });

  afterAll(async () => {
    // Stop mock API server
    console.log('Stopping mock API server...');
    if (server) {
      await stopMockApiServer(server);
    }
  });

  // Test document listing endpoint
  test('GET /api/documents returns list of documents', async () => {
    const response = await request(API_URL)
      .get('/api/documents')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Validate structure of documents (if array not empty)
    if (response.body.length > 0) {
      const firstDocument = response.body[0];
      expect(firstDocument).toHaveProperty('id');
      expect(firstDocument).toHaveProperty('title');
      expect(firstDocument).toHaveProperty('documentType');
    }
  });

  // Test document fetching by ID
  test('GET /api/documents/:id returns a single document', async () => {
    // First get all documents to pick a valid ID
    const allDocumentsResponse = await request(API_URL)
      .get('/api/documents')
      .set('Accept', 'application/json');
    
    // Skip test if no documents are available
    if (allDocumentsResponse.body.length === 0) {
      console.warn('Skipping test: No documents available in the database');
      return;
    }
    
    const documentId = allDocumentsResponse.body[0].id;
    
    const response = await request(API_URL)
      .get(`/api/documents/${documentId}`)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('id', documentId);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('documentType');
  });

  // Test invalid document ID handling
  test('GET /api/documents/:id with invalid ID returns 404', async () => {
    const response = await request(API_URL)
      .get('/api/documents/999999') // Assuming this ID doesn't exist
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(404);
  });

  // Test document search functionality
  test('GET /api/documents/search returns filtered documents', async () => {
    const response = await request(API_URL)
      .get('/api/documents/search?query=license')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test document filtering by free zone
  test('GET /api/documents/by-freezone/:freeZoneId returns documents for specific free zone', async () => {
    // Get all free zones to pick a valid ID
    const allFreeZonesResponse = await request(API_URL)
      .get('/api/freezones')
      .set('Accept', 'application/json');
    
    // Skip test if no free zones are available
    if (allFreeZonesResponse.body.length === 0) {
      console.warn('Skipping test: No free zones available in the database');
      return;
    }
    
    const freeZoneId = allFreeZonesResponse.body[0].id;
    
    const response = await request(API_URL)
      .get(`/api/documents/by-freezone/${freeZoneId}`)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that all returned documents belong to the specified free zone
    if (response.body.length > 0) {
      response.body.forEach((doc: any) => {
        expect(doc.freeZoneId).toBe(freeZoneId);
      });
    }
  });

  // Test document validation endpoint
  test('POST /api/documents/validate requires authentication', async () => {
    const response = await request(API_URL)
      .post('/api/documents/validate')
      .send({
        documentId: 1,
        documentType: 'license',
        validationResult: 'passed'
      })
      .set('Accept', 'application/json');
    
    // Should be unauthorized without auth
    expect(response.status).toBe(401);
  });

  // Test document upload endpoint
  test('POST /api/documents/upload requires authentication', async () => {
    const response = await request(API_URL)
      .post('/api/documents/upload')
      .attach('document', Buffer.from('test file content'), 'test-document.pdf')
      .set('Accept', 'application/json');
    
    // Should be unauthorized without auth
    expect(response.status).toBe(401);
  });
});