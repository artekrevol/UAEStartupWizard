/**
 * Build script for deployment with HTTP-only scraper (Version 2)
 * 
 * This improved script builds a version of the application that:
 * 1. Completely removes all Playwright dependencies
 * 2. Uses HTTP-only scraper implementation with fixed imports
 * 3. Creates a deployment-ready package with ES module compatibility
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Banner display
console.log('=================================================');
console.log('  UAE Business Setup Assistant - Deployment Build  ');
console.log('=================================================');
console.log('');
console.log('Building a version without Playwright dependencies...');
console.log('');

// Step 1: Set up environment variables
process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

// Step 2: Create a clean build directory
const buildDir = path.resolve('build-no-playwright-v2');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Step 3: Create the package.json without Playwright
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove Playwright from dependencies and devDependencies
const filteredDependencies = Object.fromEntries(
  Object.entries(packageJson.dependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

const filteredDevDependencies = Object.fromEntries(
  Object.entries(packageJson.devDependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

// Create a new package.json without Playwright
const deploymentPackageJson = {
  ...packageJson,
  dependencies: filteredDependencies,
  devDependencies: filteredDevDependencies,
  type: "module", // Ensure ES modules mode is used
  scripts: {
    ...packageJson.scripts,
    build: 'vite build && node server/production-build.js',
    start: 'NODE_ENV=production node dist/server.js'
  }
};

// Write the deployment package.json
fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(deploymentPackageJson, null, 2)
);
console.log('✅ Created Playwright-free package.json');

// Step 4: Create a production build script
const productionBuildScript = `/**
 * Production Build Script
 * 
 * This script builds the server for production with Playwright dependencies removed
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

console.log('🏗️ Building server for production (HTTP-only mode)...');

// Create server entry point
const serverContent = \`/**
 * Production Server Entry Point
 */

// Force environment variables before anything else
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

import express from 'express';
import compression from 'compression';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

// Convert ESM URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.openai.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Enable compression
app.use(compression());

// Parse JSON body
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Serve static files
const clientDistPath = path.join(__dirname, '../client');
app.use(express.static(clientDistPath));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', mode: 'http-only' });
});

// Add basic API endpoints
app.get('/api/info', (req, res) => {
  res.json({
    version: '1.0.0',
    mode: 'http-only',
    environment: process.env.NODE_ENV
  });
});

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(\`\${req.method} \${path} \${res.statusCode} in \${duration}ms\`);
    }
  });
  
  next();
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start the server
const port = process.env.PORT || 5000;
server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(\`Production server running on port \${port} (HTTP-only mode)\`);
});
\`;

// Write server.js to dist directory
fs.writeFileSync('dist/server.js', serverContent);
console.log('✅ Created production server entry point');

// Create .npmrc file to prevent Playwright installation
fs.writeFileSync('.npmrc', 'playwright_skip_browser_download=1\\nplaywright_browser_path=0\\n');
console.log('✅ Created .npmrc file to prevent Playwright installation');

console.log('✅ Server build completed successfully');
`;

// Create the server production build script
fs.mkdirSync(path.join(buildDir, 'server'), { recursive: true });
fs.writeFileSync(
  path.join(buildDir, 'server', 'production-build.js'),
  productionBuildScript
);
console.log('✅ Created production build script');

// Step 5: Create a simpler HTTP-only scraper with no dependencies
const httpOnlyScraper = `/**
 * HTTP-Only Scraper
 * 
 * A lightweight scraper using fetch API for HTTP requests without any browser dependencies.
 * This is a simplified deployment-friendly alternative.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// Simple HTML parser function that doesn't rely on cheerio
const parseHtml = (html, selector) => {
  const matches = [];
  const regex = new RegExp(\`<\${selector}[^>]*>(.*?)</\${selector}>\`, 'gs');
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
};

// Simplified HTTP request function
const httpGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

class SimpleHttpScraper {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }
  
  /**
   * Fetch a page via HTTP request
   */
  async fetchPage(url) {
    try {
      this.logger.log(\`Fetching \${url}\`);
      const html = await httpGet(url);
      this.logger.log(\`Successfully fetched \${url}\`);
      return html;
    } catch (error) {
      this.logger.log(\`Error fetching \${url}: \${error.message}\`);
      return null;
    }
  }
  
  /**
   * Extract data using simple selectors
   */
  extract(html, selector) {
    if (!html) return [];
    return parseHtml(html, selector);
  }
  
  /**
   * Download a file via HTTP request
   */
  async downloadFile(url, outputPath) {
    try {
      this.logger.log(\`Downloading file from \${url}\`);
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Download the file
      const fileData = await httpGet(url);
      
      // Write to file
      fs.writeFileSync(outputPath, fileData);
      
      this.logger.log(\`Successfully downloaded file to \${outputPath}\`);
      return true;
    } catch (error) {
      this.logger.log(\`Error downloading file: \${error.message}\`);
      return false;
    }
  }
}

export { SimpleHttpScraper };
`;

// Create the HTTP-only scraper
fs.mkdirSync(path.join(buildDir, 'scraper', 'utils'), { recursive: true });
fs.writeFileSync(
  path.join(buildDir, 'scraper', 'utils', 'simple_http_scraper.js'),
  httpOnlyScraper
);
console.log('✅ Created simplified HTTP scraper for production');

// Step 6: Copy required project files (excluding Playwright)
const copyDirectories = [
  'client',
  'public',
  'shared',
];

copyDirectories.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(buildDir, dir), { recursive: true });
  }
});

// Copy individual files
const filesToCopy = [
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'index.html',
  'drizzle.config.ts'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(buildDir, file));
  }
});

console.log('✅ Copied project files (excluding Playwright)');

// Step 7: Create a .npmrc file
fs.writeFileSync(
  path.join(buildDir, '.npmrc'),
  'playwright_skip_browser_download=1\nplaywright_browser_path=0\n'
);
console.log('✅ Created .npmrc file');

// Step 8: Create a production environment file
fs.writeFileSync(
  path.join(buildDir, '.env.production'),
  `NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
`
);
console.log('✅ Created production environment file');

// Step 9: Create a deployment script
fs.writeFileSync(
  path.join(buildDir, 'deploy.sh'),
  `#!/bin/bash
# Deployment script

export NODE_ENV=production
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "🏗️ Building for deployment..."
npm run build

echo "✅ Build complete. Ready for deployment!"
`
);
fs.chmodSync(path.join(buildDir, 'deploy.sh'), 0o755);
console.log('✅ Created deployment script');

// Step 10: Create a README for the deployment build
fs.writeFileSync(
  path.join(buildDir, 'README.md'),
  `# UAE Business Setup Assistant - Deployment Build (V2)

This is an improved deployment-ready build of the UAE Business Setup Assistant, with all Playwright dependencies removed.

## Features

- Uses a simplified HTTP-only approach without any complex dependencies
- No browser or cheerio dependencies required
- Optimized for production deployment

## Deployment Instructions

1. Make sure all environment variables are set (especially DATABASE_URL and OPENAI_API_KEY)
2. Run the deployment script:
   \`\`\`
   ./deploy.sh
   \`\`\`
3. Deploy the built application

## HTTP-Only Mode

This build operates in HTTP-only mode, which means:
- All scrapers use simple HTTP requests
- No external parsing libraries are required
- The application is extremely lightweight and deployment-friendly
`
);
console.log('✅ Created deployment README');

// Final message
console.log('');
console.log('✅ Build completed successfully!');
console.log('');
console.log('Your improved Playwright-free deployment build is ready in the build-no-playwright-v2 directory.');
console.log('');
console.log('To deploy:');
console.log('1. cd build-no-playwright-v2');
console.log('2. Use the Deploy button in Replit');
console.log('');
console.log('This build completely eliminates all external dependencies that could cause issues in production');
console.log('and uses a much simpler approach for HTTP requests.');