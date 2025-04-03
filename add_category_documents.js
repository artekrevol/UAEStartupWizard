/**
 * This script adds additional test documents to the DMCC docs directory
 * with specific categories for testing category-based retrieval
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
const BUSINESS_SETUP_DIR = path.join(TEST_DIR, 'business_setup');
const FINANCIAL_DIR = path.join(TEST_DIR, 'financial');
const COMPLIANCE_DIR = path.join(TEST_DIR, 'compliance');

// Create directories if they don't exist
[BUSINESS_SETUP_DIR, FINANCIAL_DIR, COMPLIANCE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create test documents with category structure
const categoryDocuments = [
  // Business Setup
  {
    name: 'Company_Formation_Steps.txt',
    content: 'This document outlines the steps required to form a company in DMCC.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'Required_Documents.txt',
    content: 'List of required documents for company formation in DMCC.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'Visa_Process_Guide.txt',
    content: 'Step-by-step guide for processing visas in DMCC.',
    dir: BUSINESS_SETUP_DIR
  },
  
  // Compliance
  {
    name: 'AML_Guidelines.txt',
    content: 'Anti-Money Laundering guidelines for DMCC companies.',
    dir: COMPLIANCE_DIR
  },
  {
    name: 'Regulatory_Compliance.txt',
    content: 'Regulatory compliance requirements for businesses in DMCC.',
    dir: COMPLIANCE_DIR
  },
  
  // Financial
  {
    name: 'Banking_Options.txt',
    content: 'Banking options available for DMCC registered companies.',
    dir: FINANCIAL_DIR
  },
  {
    name: 'Fee_Structure.txt',
    content: 'Fee structure for various services in DMCC.',
    dir: FINANCIAL_DIR
  }
];

// Add the documents
let addedCount = 0;
categoryDocuments.forEach(doc => {
  const filePath = path.join(doc.dir, doc.name);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, doc.content);
      console.log(`Created document: ${filePath}`);
      addedCount++;
    } else {
      console.log(`Document already exists: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error creating document ${doc.name}:`, error);
  }
});

console.log(`Added ${addedCount} category test documents to DMCC docs directory`);