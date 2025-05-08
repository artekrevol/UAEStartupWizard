import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { db } from '../../../server/db';

// URL should point to your test environment
const API_URL = 'http://localhost:5000';

describe('Free Zones API', () => {
  // Setup and teardown for tests
  beforeAll(async () => {
    // Set up test database or environment if needed
    console.log('Setting up test database...');
  });

  afterAll(async () => {
    // Clean up test database or environment
    console.log('Cleaning up test database...');
    await db.disconnect?.();
  });

  // GET /api/freezones
  test('GET /api/freezones returns list of free zones', async () => {
    const response = await request(API_URL)
      .get('/api/freezones')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Validate structure of first free zone item (if array not empty)
    if (response.body.length > 0) {
      const firstFreeZone = response.body[0];
      expect(firstFreeZone).toHaveProperty('id');
      expect(firstFreeZone).toHaveProperty('name');
      expect(firstFreeZone).toHaveProperty('description');
      // Add more property validations as needed
    }
  });

  // GET /api/freezones/:id
  test('GET /api/freezones/:id returns a single free zone', async () => {
    // First get all free zones to pick a valid ID
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
      .get(`/api/freezones/${freeZoneId}`)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('id', freeZoneId);
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('description');
    // Add more property validations as needed
  });

  // Test invalid ID handling
  test('GET /api/freezones/:id with invalid ID returns 404', async () => {
    const response = await request(API_URL)
      .get('/api/freezones/999999') // Assuming this ID doesn't exist
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(404);
  });

  // GET /api/freezones/compare
  test('GET /api/freezones/compare compares multiple free zones', async () => {
    // First get all free zones to pick valid IDs
    const allFreeZonesResponse = await request(API_URL)
      .get('/api/freezones')
      .set('Accept', 'application/json');
    
    // Skip test if less than 2 free zones are available
    if (allFreeZonesResponse.body.length < 2) {
      console.warn('Skipping test: Not enough free zones available for comparison');
      return;
    }
    
    const freeZoneId1 = allFreeZonesResponse.body[0].id;
    const freeZoneId2 = allFreeZonesResponse.body[1].id;
    
    const response = await request(API_URL)
      .get(`/api/freezones/compare?ids=${freeZoneId1},${freeZoneId2}`)
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    
    // Validate structures of compared free zones
    expect(response.body[0]).toHaveProperty('id', freeZoneId1);
    expect(response.body[1]).toHaveProperty('id', freeZoneId2);
  });

  // GET /api/freezones/filter
  test('GET /api/freezones/filter filters free zones by criteria', async () => {
    const response = await request(API_URL)
      .get('/api/freezones/filter?location=Dubai')
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Verify filter worked correctly
    response.body.forEach((freeZone: any) => {
      expect(freeZone.location).toContain('Dubai');
    });
  });
});