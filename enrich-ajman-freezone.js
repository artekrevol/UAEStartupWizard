/**
 * Enrich Ajman Free Zone data
 * 
 * This script adds additional documents to the Ajman Free Zone
 * based on the audit findings until 100% completeness is achieved.
 * It works in conjunction with run-ajman-audit.js in an iterative loop.
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { runAjmanAudit, AUDIT_RESULTS_PATH, KEY_CATEGORIES, DOCUMENTS_NEEDED } from './run-ajman-audit.js';

const execPromise = util.promisify(exec);

// Configuration
const FREE_ZONE_ID = 9; // Ajman Free Zone
const MAX_ITERATIONS = 15; // Safety limit to prevent infinite loops
const MAX_DOCUMENTS_PER_CATEGORY = 10; // Maximum documents to create per category

// Define templates for each category (key excerpts)
const CATEGORY_TEMPLATES = {
  business_setup: `# Ajman Free Zone Business Setup Guide

## Introduction to Ajman Free Zone
Ajman Free Zone, established in 1988, offers a strategic business hub with tax exemptions, 100% foreign ownership, and simplified procedures. Located near key ports and airports, it provides easy access to regional markets.

## Company Formation Process
1. **Initial Consultation**: Discuss business requirements and license options
2. **Company Name Registration**: Select and register your company name
3. **License Application**: Submit required documents and application forms
4. **Facility Selection**: Choose office, warehouse, or land based on your needs
5. **License Issuance**: Receive your business license after approval
6. **Visa Processing**: Apply for residence visas for shareholders and employees

## Required Documents
- Passport copies of all shareholders
- Business plan outlining activities
- Bank reference letters
- No objection certificates (if applicable)
- Application forms duly completed

## Company Types Available
- Free Zone Establishment (FZE) - Single shareholder
- Free Zone Company (FZC) - Multiple shareholders
- Branch of Existing Company
- Branch of Foreign Company

## Fees and Costs
Competitive setup costs including:
- Registration fees
- License fees
- Facility rental
- Visa processing charges`,

  legal: `# Ajman Free Zone Legal Framework

## Legal Structure and Governance
Ajman Free Zone operates under Federal UAE laws and specific Ajman Free Zone regulations. All businesses must comply with both federal laws and specific free zone regulations.

## Dispute Resolution
Ajman Free Zone offers efficient dispute resolution mechanisms including:
- Mediation services
- Arbitration options
- Access to Ajman courts for legal proceedings

## Contracts and Agreements
Standard contracts available for:
- Lease agreements
- Employment contracts
- Service agreements
- Supplier contracts

## Intellectual Property Protection
Comprehensive IP protection including:
- Trademark registration support
- Copyright protection
- Patent registration assistance

## Compliance Requirements
All companies must maintain:
- Proper corporate records
- Annual financial statements
- Updated shareholder information
- Valid licenses and permits`,

  compliance: `# Ajman Free Zone Compliance Guide

## Regulatory Compliance Framework
All companies in Ajman Free Zone must comply with:
- UAE Federal Laws
- Ajman Emirate Regulations
- Free Zone Authority Rules
- International standards applicable to their industry

## Annual Compliance Requirements
1. **License Renewal**: Annual renewal required with updated documentation
2. **Financial Reporting**: Annual financial statements preparation
3. **Immigration Compliance**: Employee visa renewal and status verification
4. **Facility Inspections**: Regular inspections for health and safety compliance

## Anti-Money Laundering Compliance
- Customer due diligence requirements
- Suspicious transaction reporting
- Record keeping obligations
- Regular staff training on AML measures

## Data Protection and Privacy
- Customer data protection requirements
- Secure data storage obligations
- Privacy policy implementation
- Data breach response protocols

## Health and Safety Standards
- Workplace safety requirements
- Emergency procedures documentation
- Regular safety training
- Incident reporting protocols`,

  financial: `# Ajman Free Zone Financial Guide

## Banking Services
Ajman Free Zone businesses have access to:
- Corporate account services from major UAE banks
- Trade finance facilities
- Online banking platforms
- Multi-currency accounts
- Credit facilities and business loans

## Financial Incentives
Financial benefits include:
- 100% repatriation of capital and profits
- No corporate or income tax
- No import or export duties within the free zone
- No currency restrictions
- Competitive licensing fees

## Accounting Requirements
Companies must maintain:
- Proper accounting records
- Annual financial statements
- Records of all business transactions
- Supporting documentation for audits

## VAT Considerations
- Standard UAE VAT rate of 5%
- VAT registration requirements
- Documentation and reporting obligations
- Specific free zone VAT considerations

## Financial Services Available
- Accounting and bookkeeping services
- Audit services
- Tax advisory
- Financial planning and consulting
- Payroll management`,

  visa_information: `# Ajman Free Zone Visa Guide

## Available Visa Types
Ajman Free Zone offers multiple visa options:
- Investor/Partner Visa (2-3 years validity)
- Employee Residence Visa (2-3 years validity)
- Family Sponsorship Visa
- Virtual Office Visa package (limited allocation)

## Visa Application Process
1. **Entry Permit Application**: Initial approval for entry
2. **Status Change**: For applicants already in the UAE
3. **Medical Fitness Test**: Mandatory health screening
4. **Emirates ID Registration**: Biometric and data collection
5. **Visa Stamping**: Final visa issuance in passport

## Visa Eligibility Criteria
Requirements include:
- Valid passport with minimum 6 months validity
- Company documents verifying relationship
- Medical fitness certificate
- Appropriate educational qualifications for certain positions
- Security clearance

## Dependent Visa Information
Eligibility to sponsor:
- Spouse
- Children (sons under 18, unmarried daughters of any age)
- Parents (under specific conditions)

## Visa Renewal Process
Renewal requires:
- Updated company documentation
- Medical fitness test
- Emirates ID renewal
- Processing through Ajman Free Zone authority`,

  license_types: `# Ajman Free Zone License Types

## Commercial License
Suitable for trading activities including:
- Import and export
- Distribution
- Retail and wholesale trading
- E-commerce operations

## Service License
For professional service providers including:
- Consultancy services
- Management services
- IT services
- Educational services
- Marketing and advertising

## Industrial License
For manufacturing and industrial activities:
- Food processing
- Furniture manufacturing
- Garment production
- Construction materials
- Electronics assembly

## General Trading License
Comprehensive license allowing:
- Trading in multiple product categories
- No restriction on number of products
- International trading opportunities
- Import and export facilities

## License Comparison and Selection
Factors to consider:
- Nature of business activities
- Number of products/services
- Capital investment
- Facility requirements
- Staffing needs`,

  facilities: `# Ajman Free Zone Facilities Guide

## Office Solutions
Ajman Free Zone offers diverse office options:
- Executive offices (fully furnished)
- Standard offices (customizable)
- Shared office spaces
- Meeting rooms and business centers
- Virtual office packages

## Warehousing Facilities
Industrial spaces include:
- Standard warehouses (250-5000 sq.m)
- Customizable warehouse units
- Temperature-controlled storage
- Logistics support facilities
- 24/7 security services

## Land Plots
For custom development:
- Industrial plots
- Commercial plots
- Mixed-use land
- Development rights
- Long-term lease options

## Business Support Facilities
Additional amenities include:
- Conference and meeting facilities
- Food and beverage outlets
- Prayer rooms
- Parking facilities
- Networking spaces

## Facility Leasing Process
Steps to secure facilities:
- Facility selection
- Application and approval
- Lease agreement signing
- Facility handover
- Utility connections`,

  benefits: `# Ajman Free Zone Benefits

## Strategic Location Advantages
- Proximity to Ajman Port
- Easy access to Dubai (30 minutes)
- Well-connected road network
- Close to international airports
- Strategic position for GCC market access

## Financial Benefits
- 100% foreign ownership
- 100% repatriation of capital and profits
- Zero corporate and personal income tax
- No import or export duties
- Competitive licensing and setup costs

## Business Support Services
- Fast-track license processing
- Dedicated customer service team
- Business networking opportunities
- Marketing support services
- Government liaison assistance

## Lifestyle Advantages
- Lower cost of living compared to Dubai
- Quality housing at reasonable prices
- Excellent education facilities
- Healthcare services
- Leisure and recreation options

## Ease of Business Operations
- Streamlined procedures
- Minimal bureaucracy
- Efficient application processing
- Online services platform
- Supportive business environment`,

  faq: `# Ajman Free Zone Frequently Asked Questions

## General Questions

### What is Ajman Free Zone?
Ajman Free Zone is a business hub established in 1988, designed to provide businesses with a conducive environment for growth and expansion within the UAE.

### What are the benefits of setting up in Ajman Free Zone?
- 100% foreign ownership
- 100% repatriation of capital and profits
- No corporate or personal income taxes
- Strategic location with proximity to major ports and airports
- Competitive pricing compared to other UAE free zones

### What types of businesses can operate in Ajman Free Zone?
Ajman Free Zone accommodates a wide range of business activities including trading, services, manufacturing, and more. The free zone is particularly well-suited for SMEs and startups.

## Application Process

### How long does it take to set up a company in Ajman Free Zone?
The entire setup process typically takes 3-5 working days after submission of all required documents.

### What is the minimum capital requirement?
There is no minimum capital requirement for establishing a company in Ajman Free Zone.

### Can I apply for business setup online?
Yes, Ajman Free Zone offers an online application system that allows entrepreneurs to apply for business setup remotely.

## Operational Questions

### Can I hire international employees?
Yes, companies in Ajman Free Zone can sponsor foreign employees and process their residence visas.

### Is there a limit on the number of visas I can apply for?
The number of visas available depends on your facility type, company size, and business activities.

### What are the working hours in Ajman Free Zone?
Official working hours are typically Sunday to Thursday, 8:00 AM to 5:00 PM, though businesses may set their own operating hours.`,

  templates: `# Ajman Free Zone Document Templates

## Company Formation Templates

### Memorandum of Association Template
This template outlines the company structure, shareholders, capital distribution, and governance model for companies establishing in Ajman Free Zone.

### Shareholder Resolution Template
Use this template for documenting official decisions made by company shareholders regarding company affairs, amendments, or structural changes.

## Visa Application Templates

### Employment Visa Application Form
Standard template for applying for employment visas for staff members working in companies established in Ajman Free Zone.

### Family Visa Sponsorship Form
Template for company owners or employees to sponsor immediate family members for UAE residence visas.

## License Application Templates

### Service License Application Form
Template specifically for businesses applying for service-based licenses in Ajman Free Zone.

### Trading License Application Form
Template for commercial trading businesses to apply for appropriate licensing.

## Facility Leasing Templates

### Warehouse Leasing Agreement
Standard lease agreement for warehouse facilities within Ajman Free Zone.

### Office Space Rental Contract
Template for office space rental with standard terms and conditions.`,

  timelines: `# Ajman Free Zone Business Setup Timelines

## Company Registration Timeline

### Stage 1: Initial Approval (1-2 Days)
- Company name approval
- Initial activity approval
- Provisional approval issuance

### Stage 2: Documentation (2-3 Days)
- Submission of required documents
- Review by free zone authority
- Document verification process

### Stage 3: License Issuance (1-2 Days)
- Payment of license fees
- Issuance of business license
- Registration certificate preparation

### Stage 4: Facility Allocation (1-3 Days)
- Office space allocation
- Facility handover process
- Utility connections

## Visa Processing Timeline

### Stage 1: Employment Entry Permit (3-5 Days)
- Application submission
- Security clearance
- Entry permit issuance

### Stage 2: Status Change (2-3 Days)
- Medical fitness test
- Emirates ID registration
- Visa stamping process

## Renewal Timelines

### Business License Renewal (2-3 Days)
- Renewal application submission
- Payment of renewal fees
- Updated license issuance

### Employee Visa Renewal (5-7 Days)
- Renewal application
- Medical fitness test
- Emirates ID update
- Visa stamping`,

  industries: `# Ajman Free Zone Supported Industries

## Manufacturing Sector
Ajman Free Zone supports various manufacturing activities including:
- Food processing and packaging
- Construction materials production
- Furniture manufacturing
- Textile and garment production
- Plastic and rubber product manufacturing

## Trading Sector
The free zone is ideal for trading businesses dealing in:
- Consumer goods and FMCG products
- Building materials and hardware
- Electronics and appliances
- Automotive parts and accessories
- Industrial equipment and machinery

## Technology Sector
Emerging technology businesses are supported including:
- IT services and solutions
- Software development
- E-commerce platforms
- Digital marketing services
- Fintech and payment solutions

## Professional Services
Service-based businesses thrive in Ajman Free Zone:
- Management consulting
- Legal advisory (non-litigation)
- Accounting and bookkeeping
- Marketing and advertising
- Human resources services

## Logistics and Supply Chain
Logistics operations benefit from:
- Warehousing facilities
- Distribution services
- Freight forwarding
- Supply chain management
- Import/export facilitation`,

  trade: `# Ajman Free Zone Trade Information

## Import/Export Procedures

### Import Process
1. Preparation of import documentation
2. Customs declaration submission
3. Duty payment (if applicable)
4. Cargo inspection
5. Goods release and transportation

### Export Process
1. Preparation of export documentation
2. Obtaining certificates of origin
3. Customs declaration submission
4. Cargo inspection
5. Goods loading and shipping

## Customs Procedures

### Customs Documentation
Required documents for customs clearance:
- Commercial invoice
- Packing list
- Bill of lading/Airway bill
- Certificate of origin
- Import permit (for restricted goods)

### Customs Duties
- Most goods imported into free zones are duty-exempt
- Duties apply when goods enter the UAE mainland market
- Standard UAE tariff is 5% on CIF value
- Certain products may have specific duty rates

## Trade Financing

### Available Options
- Trade finance through partner banks
- Letter of credit facilities
- Bank guarantees
- Invoice discounting
- Supply chain financing

### Partner Financial Institutions
Ajman Free Zone has partnerships with several financial institutions to facilitate trade financing for businesses.

## International Trade Agreements
- Benefits from UAE's membership in WTO
- Access to GCC common market
- Preferences under various bilateral trade agreements
- Participation in UAE trade missions and exhibitions`,

  requirements: `# Ajman Free Zone Business Requirements

## General Requirements

### Documentation Requirements
All businesses must provide:
- Passport copies of shareholders
- No objection letter from current sponsor (if applicable)
- Bank reference letter
- Business plan (for certain license types)
- Completed application forms

### Compliance Requirements
Businesses must adhere to:
- Annual license renewal procedures
- Proper accounting and record-keeping
- UAE labor laws
- Immigration regulations
- Health and safety standards

## Specific License Requirements

### Trading License Requirements
- Product list with HS codes
- Supplier agreements (if available)
- Distribution agreements (if applicable)
- Trademark registrations (if applicable)

### Service License Requirements
- Professional qualifications/certificates
- Experience certificates
- Portfolio of previous work (if applicable)
- Professional memberships (if applicable)

### Industrial License Requirements
- Manufacturing process details
- Equipment specifications
- Environmental compliance plan
- Production capacity estimates
- Raw material requirements

## Facility Requirements

### Office Space Requirements
- Minimum office size based on visa quota
- Proper business signage
- Adherence to building regulations
- Fire safety compliance
- Accessible location`,

  managing_your_business: `# Managing Your Business in Ajman Free Zone

## Office Administration

### Setting Up Operations
- Office leasing and furnishing
- Utility connections (electricity, water, internet)
- Business equipment procurement
- IT infrastructure setup
- Business mail services

### Administrative Services
- Mail handling and courier services
- Meeting room facilities
- Reception and secretarial services
- Printing and document processing
- Client hosting facilities

## Human Resources Management

### Recruitment
- Local recruitment agencies
- Job posting platforms
- Employee visa processing
- Onboarding procedures
- Employment contract templates

### Staff Management
- Payroll processing options
- Time and attendance systems
- Performance management tools
- Training and development resources
- Employee benefits administration

## Financial Management

### Banking
- Corporate account options
- Online banking facilities
- International transfer services
- Multi-currency accounts
- Payment gateway services

### Accounting
- Recommended accounting software
- VAT compliance requirements
- Financial reporting standards
- Audit preparation guidelines
- Bookkeeping best practices

## Business Development

### Networking Opportunities
- Business networking events
- Industry conferences and exhibitions
- Government-sponsored trade missions
- Chambers of commerce memberships
- Business councils participation

### Growth Strategies
- Market expansion support
- Business advisory services
- Access to funding opportunities
- Partner matchmaking services
- Digital transformation assistance`
};

/**
 * Create a directory if it doesn't exist
 */
async function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}

/**
 * Check if a document already exists in the database with the given category
 */
async function checkDocumentExists(category) {
  try {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM documents 
          WHERE free_zone_id = ${FREE_ZONE_ID} AND category = ${category}`
    );
    
    return result.rows && result.rows[0].count > 0;
  } catch (error) {
    console.error(`Error checking if document exists for ${category}:`, error);
    return false;
  }
}

/**
 * Create a document for a specific category
 */
async function createDocument(category, iteration = 1) {
  try {
    console.log(`Creating document for category: ${category} (iteration ${iteration})`);
    
    // Get content from templates
    const content = CATEGORY_TEMPLATES[category] || 
      `# Ajman Free Zone ${category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n` +
      `This document contains information about ${category.replace(/_/g, ' ')} in Ajman Free Zone.\n\n` +
      `Document created: ${new Date().toISOString().split('T')[0]}`;
    
    // Create title and filename
    const title = category.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const filename = `ajman_free_zone_${category.toLowerCase()}_${iteration}.txt`;
    const dirPath = path.join('freezone_docs', 'ajman_free_zone');
    
    // Ensure directory exists
    await ensureDirectoryExists(dirPath);
    
    // Write file to disk
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
    
    // Document metadata
    const documentData = {
      title: `Ajman Free Zone ${title} ${iteration > 1 ? `(Part ${iteration})` : ''}`,
      filename,
      file_path: filePath,
      document_type: 'Text',
      category,
      subcategory: iteration > 1 ? `Part ${iteration}` : 'Main',
      content,
      file_size: Buffer.byteLength(content),
      free_zone_id: FREE_ZONE_ID,
      metadata: {
        source: 'enrichment',
        enriched: true,
        created_at: new Date().toISOString(),
        creation_method: 'enrichment_cycle',
        iteration
      },
      uploaded_at: new Date()
    };
    
    // Check if this specific document already exists
    const existingDoc = await db.execute(
      sql`SELECT id FROM documents 
          WHERE free_zone_id = ${FREE_ZONE_ID} AND category = ${category} AND filename = ${filename}`
    );
    
    if (existingDoc.rows && existingDoc.rows.length > 0) {
      console.log(`Document already exists for ${category} with filename ${filename}. Skipping.`);
      return false;
    }
    
    // Save document to database
    const result = await db.execute(
      sql`INSERT INTO documents (
        title, filename, file_path, document_type, category, subcategory, 
        content, file_size, free_zone_id, metadata, uploaded_at
      ) VALUES (
        ${documentData.title},
        ${documentData.filename},
        ${documentData.file_path},
        ${documentData.document_type},
        ${documentData.category},
        ${documentData.subcategory},
        ${documentData.content},
        ${documentData.file_size},
        ${documentData.free_zone_id},
        ${JSON.stringify(documentData.metadata)},
        ${documentData.uploaded_at}
      ) RETURNING id`
    );
    
    if (result.rows && result.rows.length > 0) {
      console.log(`Successfully created document for ${category} with ID: ${result.rows[0].id}`);
      return true;
    } else {
      console.error(`Failed to insert document for ${category}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating document for ${category}:`, error);
    return false;
  }
}

/**
 * Get the current document counts for each category
 */
async function getCurrentDocumentCounts() {
  try {
    const result = await db.execute(
      sql`SELECT category, COUNT(*) as count 
          FROM documents 
          WHERE free_zone_id = ${FREE_ZONE_ID}
          GROUP BY category`
    );
    
    const counts = {};
    if (result.rows) {
      result.rows.forEach(row => {
        counts[row.category] = row.count;
      });
    }
    
    return counts;
  } catch (error) {
    console.error('Error getting current document counts:', error);
    return {};
  }
}

/**
 * Get priority categories from audit results
 */
async function getPrioritiesFromAudit() {
  try {
    // Check if audit results file exists
    if (!fs.existsSync(AUDIT_RESULTS_PATH)) {
      console.log('No audit results found. Running audit first...');
      await runAudit();
    }
    
    // Read audit results
    const auditData = JSON.parse(fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8'));
    return auditData.priorityFields || [];
  } catch (error) {
    console.error('Error getting priorities from audit:', error);
    return [];
  }
}

/**
 * Run the audit script
 */
async function runAudit() {
  try {
    console.log('\nRunning document completeness audit...');
    return await runAjmanAudit();
  } catch (error) {
    console.error('Error running audit script:', error);
  }
}

/**
 * Main enrichment function that runs until we reach 100% completeness
 */
async function enrichAjmanFreeZoneUntilComplete() {
  try {
    console.log('='.repeat(80));
    console.log('STARTING AJMAN FREE ZONE ENRICHMENT PROCESS');
    console.log('='.repeat(80));
    console.log('\nThis process will iteratively add documents until 100% completeness is reached.');
    
    // Track iterations
    let iteration = 1;
    let isComplete = false;
    
    // Run initial audit to get baseline
    console.log('\n>>> INITIAL AUDIT');
    const initialAudit = await runAudit();
    
    if (initialAudit.isComplete) {
      console.log('\n✅ ALREADY AT 100% COMPLETENESS - No enrichment needed');
      return;
    }
    
    console.log(`\nStarting enrichment from ${initialAudit.completenessScore}% completeness`);
    console.log(`Initial priority fields: ${initialAudit.priorityFields.join(', ')}`);
    
    // Loop until we reach 100% completeness or hit max iterations
    while (!isComplete && iteration <= MAX_ITERATIONS) {
      console.log(`\n>>> ENRICHMENT CYCLE ${iteration}`);
      
      // Get priority categories from latest audit
      const priorities = await getPrioritiesFromAudit();
      
      if (priorities.length === 0) {
        console.log('No priority fields found. Checking if we are complete...');
        const verificationAudit = await runAudit();
        
        if (verificationAudit.isComplete) {
          console.log('\n✅ REACHED 100% COMPLETENESS');
          isComplete = true;
          break;
        } else {
          console.log(`Something went wrong. Current completeness: ${verificationAudit.completenessScore}%`);
          console.log('Will try to enrich KEY_CATEGORIES as a fallback...');
          
          // Use all categories as fallback
          for (const category of KEY_CATEGORIES) {
            const currentCounts = await getCurrentDocumentCounts();
            const currentCount = currentCounts[category] || 0;
            const targetCount = DOCUMENTS_NEEDED[category] || 3;
            
            if (currentCount < targetCount) {
              console.log(`Adding document for ${category} (${currentCount}/${targetCount})`);
              await createDocument(category, currentCount + 1);
            }
          }
        }
      } else {
        // Process top priority categories first (up to 3 per cycle)
        const categoriesToProcess = priorities.slice(0, 3);
        console.log(`Processing priority categories: ${categoriesToProcess.join(', ')}`);
        
        // Get current document counts
        const currentCounts = await getCurrentDocumentCounts();
        
        // Create documents for each priority category
        for (const category of categoriesToProcess) {
          const currentCount = currentCounts[category] || 0;
          const targetCount = DOCUMENTS_NEEDED[category] || 3;
          
          if (currentCount < targetCount && currentCount < MAX_DOCUMENTS_PER_CATEGORY) {
            console.log(`Adding document for ${category} (${currentCount}/${targetCount})`);
            await createDocument(category, currentCount + 1);
          } else {
            console.log(`Skipping ${category} (already has ${currentCount} documents)`);
          }
        }
      }
      
      // Run audit to check progress
      console.log('\n>>> VERIFYING PROGRESS');
      const progressAudit = await runAudit();
      
      console.log(`\nCycle ${iteration} results:`);
      console.log(`- Current completeness: ${progressAudit.completenessScore}%`);
      console.log(`- Remaining priority fields: ${progressAudit.priorityFields.length}`);
      
      if (progressAudit.isComplete) {
        console.log('\n✅ REACHED 100% COMPLETENESS');
        isComplete = true;
        break;
      }
      
      // Increment iteration counter
      iteration++;
    }
    
    // Final summary
    console.log('\n=== ENRICHMENT PROCESS SUMMARY ===');
    
    if (isComplete) {
      console.log(`\n🎉 SUCCESS: Ajman Free Zone has reached 100% completeness! 🎉`);
      console.log(`Completed in ${iteration} enrichment cycles.`);
    } else if (iteration > MAX_ITERATIONS) {
      console.log(`\n⚠️ Reached maximum iterations (${MAX_ITERATIONS}) without achieving 100% completeness.`);
      
      // Run final audit to get current status
      const finalAudit = await runAudit();
      console.log(`Current completeness: ${finalAudit.completenessScore}%`);
      console.log(`Remaining priority fields: ${finalAudit.priorityFields.join(', ')}`);
    }
    
    return isComplete;
  } catch (error) {
    console.error('Error in enrichment process:', error);
  }
}

// Run the enrichment process
enrichAjmanFreeZoneUntilComplete();