// Jest setup file to configure and extend Jest's default functionality

// Set longer timeout for tests
jest.setTimeout(30000);

// Global teardown to clean up resources
afterAll(async () => {
  // Clean up any test databases or resources here
  console.log('Global teardown complete.');
});

// Database test utilities 
// (Note: These need to be adjusted based on your actual DB implementation)
export const setupTestDatabase = async () => {
  // Create test database or tables
  console.log('Setting up test database...');
  // Implementation depends on your database
};

export const cleanupTestDatabase = async () => {
  // Drop test database or tables
  console.log('Cleaning up test database...');
  // Implementation depends on your database
};

// Request mocking helpers
export const mockRequest = () => {
  const req: any = {};
  req.body = {};
  req.params = {};
  req.query = {};
  req.headers = {};
  req.cookies = {};
  req.session = {};
  return req;
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  return res;
};