/**
 * Simple script to add test documents to the DMCC docs directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories if they don't exist
const BASE_DIR = path.join(process.cwd(), 'dmcc_docs');
const TEST_DIR = path.join(BASE_DIR, 'test');
const KNOWLEDGE_DIR = path.join(BASE_DIR, 'knowledge_bank');

// Create directories if they don't exist
[BASE_DIR, TEST_DIR, KNOWLEDGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create test documents
const testDocuments = [
  {
    name: 'Company_Registration_Guide.txt',
    content: 'This guide provides information on registering a company in DMCC.',
    dir: TEST_DIR
  },
  {
    name: 'Business_License_Requirements.txt',
    content: 'To obtain a business license in DMCC, you must fulfill these requirements.',
    dir: TEST_DIR
  },
  {
    name: 'Visa_Application_Process.txt',
    content: 'This document outlines the visa application process for employees in DMCC.',
    dir: KNOWLEDGE_DIR
  },
  {
    name: 'Office_Leasing_Guide.txt',
    content: 'Guide for leasing office space in DMCC free zone.',
    dir: KNOWLEDGE_DIR
  }
];

// Add the documents
let addedCount = 0;
testDocuments.forEach(doc => {
  const filePath = path.join(doc.dir, doc.name);
  try {
    fs.writeFileSync(filePath, doc.content);
    console.log(`Created document: ${filePath}`);
    addedCount++;
  } catch (error) {
    console.error(`Error creating document ${doc.name}:`, error);
  }
});

console.log(`Added ${addedCount} test documents to DMCC docs directory`);