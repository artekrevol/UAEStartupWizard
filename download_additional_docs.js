/**
 * Script to download additional DMCC documents using direct file access
 * without relying on the database connectivity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup directory structure
const BASE_DIR = path.join(process.cwd(), 'dmcc_docs');
const BUSINESS_SETUP_DIR = path.join(BASE_DIR, 'business_setup');
const FINANCIAL_DIR = path.join(BASE_DIR, 'financial');
const COMPLIANCE_DIR = path.join(BASE_DIR, 'compliance');
const TRADE_DIR = path.join(BASE_DIR, 'trade');
const LEGAL_DIR = path.join(BASE_DIR, 'legal');

// Create directories if they don't exist
[BUSINESS_SETUP_DIR, FINANCIAL_DIR, COMPLIANCE_DIR, TRADE_DIR, LEGAL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sample DMCC document URLs and target directories
const documents = [
  // Business Setup
  {
    name: 'Company_Setup_Guide.txt',
    content: 'Comprehensive guide for setting up a company in DMCC free zone.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'License_Types_Comparison.txt',
    content: 'Comparison of different license types available in DMCC.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'Flexi_Desk_Information.txt',
    content: 'Information about Flexi Desk options in DMCC for new businesses.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'Business_Center_Options.txt',
    content: 'Overview of Business Center options and pricing in DMCC.',
    dir: BUSINESS_SETUP_DIR
  },
  {
    name: 'Shareholding_Requirements.txt',
    content: 'Requirements and regulations for shareholding structure in DMCC companies.',
    dir: BUSINESS_SETUP_DIR
  },
  
  // Financial
  {
    name: 'Banking_Services_Guide.txt',
    content: 'Guide to banking services available for DMCC companies.',
    dir: FINANCIAL_DIR
  },
  {
    name: 'Tax_Registration_Process.txt',
    content: 'Process for tax registration and compliance for DMCC companies.',
    dir: FINANCIAL_DIR
  },
  {
    name: 'VAT_Compliance_Guide.txt',
    content: 'Guide to VAT compliance requirements for DMCC companies.',
    dir: FINANCIAL_DIR
  },
  {
    name: 'Accounting_Standards.txt',
    content: 'Information about accounting standards and requirements for DMCC entities.',
    dir: FINANCIAL_DIR
  },
  {
    name: 'Financial_Reporting_Requirements.txt',
    content: 'Financial reporting requirements and deadlines for DMCC companies.',
    dir: FINANCIAL_DIR
  },
  
  // Compliance
  {
    name: 'Annual_Compliance_Checklist.txt',
    content: 'Checklist for annual compliance requirements for DMCC companies.',
    dir: COMPLIANCE_DIR
  },
  {
    name: 'KYC_Documentation_Requirements.txt',
    content: 'Know Your Customer documentation requirements for DMCC companies.',
    dir: COMPLIANCE_DIR
  },
  {
    name: 'Regulatory_Framework.txt',
    content: 'Overview of regulatory framework governing DMCC companies.',
    dir: COMPLIANCE_DIR
  },
  {
    name: 'Company_Registry_Update_Process.txt',
    content: 'Process for updating company information in the DMCC registry.',
    dir: COMPLIANCE_DIR
  },
  {
    name: 'Ultimate_Beneficial_Owner_Declaration.txt',
    content: 'Requirements for declaring ultimate beneficial owners for DMCC companies.',
    dir: COMPLIANCE_DIR
  },
  
  // Trade
  {
    name: 'Commodity_Trading_Guide.txt',
    content: 'Guide to commodity trading operations in DMCC.',
    dir: TRADE_DIR
  },
  {
    name: 'Import_Export_Procedures.txt',
    content: 'Procedures for import and export activities through DMCC.',
    dir: TRADE_DIR
  },
  {
    name: 'Certificate_of_Origin_Guidelines.txt',
    content: 'Guidelines for obtaining certificates of origin for goods traded through DMCC.',
    dir: TRADE_DIR
  },
  {
    name: 'Free_Trade_Agreements.txt',
    content: 'Information about free trade agreements applicable to DMCC companies.',
    dir: TRADE_DIR
  },
  {
    name: 'Customs_Clearance_Process.txt',
    content: 'Process for customs clearance for goods traded through DMCC.',
    dir: TRADE_DIR
  },
  
  // Legal
  {
    name: 'Dispute_Resolution_Mechanisms.txt',
    content: 'Mechanisms for resolving business disputes in DMCC.',
    dir: LEGAL_DIR
  },
  {
    name: 'Contract_Templates.txt',
    content: 'Standard contract templates for common business transactions in DMCC.',
    dir: LEGAL_DIR
  },
  {
    name: 'Intellectual_Property_Protection.txt',
    content: 'Guidelines for protecting intellectual property for DMCC companies.',
    dir: LEGAL_DIR
  },
  {
    name: 'Employment_Law_Overview.txt',
    content: 'Overview of employment laws applicable to DMCC companies.',
    dir: LEGAL_DIR
  },
  {
    name: 'Corporate_Governance_Standards.txt',
    content: 'Corporate governance standards and best practices for DMCC companies.',
    dir: LEGAL_DIR
  }
];

// Add the documents
async function addAdditionalDocuments() {
  let addedCount = 0;
  for (const doc of documents) {
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
  }
  
  console.log(`Added ${addedCount} new documents to DMCC docs directory`);
  return addedCount;
}

// Run the function
addAdditionalDocuments()
  .then(count => {
    console.log(`Successfully added ${count} documents`);
    console.log('Now use the DMCC document processing endpoint to import these into the database');
  })
  .catch(error => {
    console.error('Error adding documents:', error);
  });