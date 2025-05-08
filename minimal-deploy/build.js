/**
 * Simple build script for minimal deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create screenshots directory (required)
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Create a simple HTML page
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UAE Business Setup Assistant</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      margin-bottom: 30px;
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    h1 {
      color: #0056b3;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .freezone-list {
      list-style: none;
      padding: 0;
    }
    .freezone-item {
      margin-bottom: 10px;
      padding: 10px;
      background-color: #f1f9fe;
      border-radius: 5px;
    }
    .status {
      background-color: #e2f3e5;
      color: #28a745;
      padding: 10px;
      border-radius: 5px;
      text-align: center;
      font-weight: bold;
      margin-top: 30px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 0.9em;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <header>
    <h1>UAE Business Setup Assistant</h1>
    <p>Your guide to establishing a business in UAE Free Zones</p>
  </header>

  <div class="card">
    <h2>About This Platform</h2>
    <p>The UAE Business Setup Assistant is an advanced AI-powered SaaS platform designed to streamline the process of establishing businesses in the United Arab Emirates.</p>
    <p>Our platform provides intelligent document management, adaptive workflow tools, and comprehensive information about UAE free zones.</p>
  </div>

  <div class="card">
    <h2>Popular Free Zones</h2>
    <ul class="freezone-list">
      <li class="freezone-item"><strong>Dubai Multi Commodities Centre (DMCC)</strong> - World's leading free zone for commodities trade</li>
      <li class="freezone-item"><strong>Dubai Internet City (DIC)</strong> - Technology-focused free zone with state-of-the-art infrastructure</li>
      <li class="freezone-item"><strong>Jebel Ali Free Zone (JAFZA)</strong> - One of the world's largest free zones</li>
      <li class="freezone-item"><strong>Abu Dhabi Global Market (ADGM)</strong> - International financial center with its own jurisdiction</li>
      <li class="freezone-item"><strong>Sharjah Airport International Free Zone (SAIF)</strong> - Strategic location with excellent connectivity</li>
    </ul>
  </div>

  <div class="status">
    Deployment Successful - Server is running
  </div>

  <div id="api-status"></div>

  <div class="footer">
    <p>© 2025 UAE Business Setup Assistant. All rights reserved.</p>
  </div>

  <script>
    // Simple script to check server status
    fetch('/api/status')
      .then(response => response.json())
      .then(data => {
        const statusDiv = document.getElementById('api-status');
        statusDiv.innerHTML = \`
          <div class="status">
            API Status: \${data.status}<br>
            \${data.message}<br>
            Server Time: \${new Date(data.time).toLocaleString()}
          </div>
        \`;
      })
      .catch(error => {
        const statusDiv = document.getElementById('api-status');
        statusDiv.innerHTML = \`
          <div class="status" style="background-color: #f8d7da; color: #721c24;">
            API Error: \${error.message}
          </div>
        \`;
      });
  </script>
</body>
</html>`;

// Write HTML file
fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);

console.log('Build completed successfully!');
console.log('Files created:');
console.log('- public/index.html');
console.log('- screenshots/ (empty directory)');
console.log('\nRun "node index.js" to start the server');