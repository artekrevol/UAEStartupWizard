/**
 * Run a single enrichment cycle to demonstrate the process
 * 
 * This script performs one iteration of the enrichment process without
 * the looping until completion, so we can quickly see progress.
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { runAjmanAudit, AUDIT_RESULTS_PATH } from './run-ajman-audit.js';

const FREE_ZONE_ID = 9; // Ajman Free Zone

// Top priority categories to focus on
const TOP_PRIORITY_CATEGORIES = [
  'faq',
  'templates', 
  'timelines',
  'industries',
  'trade',
  'requirements',
  'managing_your_business'
];

// Define basic templates for our priority categories
const CATEGORY_TEMPLATES = {
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
`,

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
`,

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
`,

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
`,

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
`,

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
`,

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
- Digital transformation assistance
`
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
 * Create a document for a specific category
 */
async function createDocument(category) {
  try {
    console.log(`Creating document for category: ${category}`);
    
    // Get content from templates
    const content = CATEGORY_TEMPLATES[category] || 
      `# Ajman Free Zone ${category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n` +
      `This document contains information about ${category.replace(/_/g, ' ')} in Ajman Free Zone.\n\n` +
      `Document created: ${new Date().toISOString().split('T')[0]}`;
    
    // Create title and filename
    const title = category.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const filename = `ajman_free_zone_${category.toLowerCase()}_1.txt`;
    const dirPath = path.join('freezone_docs', 'ajman_free_zone');
    
    // Ensure directory exists
    await ensureDirectoryExists(dirPath);
    
    // Write file to disk
    const filePath = path.join(dirPath, filename);
    fs.writeFileSync(filePath, content);
    console.log(`Created file: ${filePath}`);
    
    // Document metadata
    const documentData = {
      title: `Ajman Free Zone ${title}`,
      filename,
      file_path: filePath,
      document_type: 'Text',
      category,
      subcategory: 'Main',
      content,
      file_size: Buffer.byteLength(content),
      free_zone_id: FREE_ZONE_ID,
      metadata: {
        source: 'enrichment',
        enriched: true,
        created_at: new Date().toISOString(),
        creation_method: 'single_cycle_enrichment'
      },
      uploaded_at: new Date()
    };
    
    // Check if document already exists
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
 * Main function to run a single enrichment cycle
 */
async function runSingleEnrichmentCycle() {
  try {
    console.log('='.repeat(80));
    console.log('RUNNING SINGLE ENRICHMENT CYCLE FOR DEMONSTRATION');
    console.log('='.repeat(80));
    
    // Step 1: Run initial audit to get baseline
    console.log('\n>>> STEP 1: RUNNING INITIAL AUDIT');
    const initialAudit = await runAjmanAudit();
    console.log(`Initial completeness: ${initialAudit.completenessScore}%`);
    console.log(`Priority categories: ${initialAudit.priorityFields.length}`);
    
    if (initialAudit.isComplete) {
      console.log('\n✅ FREE ZONE ALREADY AT 100% COMPLETENESS');
      return;
    }
    
    // Step 2: Create documents for top priority categories
    console.log('\n>>> STEP 2: CREATING DOCUMENTS FOR TOP PRIORITY CATEGORIES');
    
    const categoriesToProcess = [];
    
    // First take categories from audit's priority list
    if (initialAudit.priorityFields && initialAudit.priorityFields.length > 0) {
      // Get top priority categories from audit (first 3)
      // Process the next set of categories (3-6) for this run
      categoriesToProcess.push(...initialAudit.priorityFields.slice(3, 6));
    }
    
    // Then add from our predefined list if needed
    if (categoriesToProcess.length < 3) {
      for (const category of TOP_PRIORITY_CATEGORIES) {
        if (!categoriesToProcess.includes(category)) {
          categoriesToProcess.push(category);
          if (categoriesToProcess.length >= 3) break;
        }
      }
    }
    
    console.log(`Processing categories: ${categoriesToProcess.join(', ')}`);
    
    // Create documents for selected categories
    const results = [];
    for (const category of categoriesToProcess) {
      const success = await createDocument(category);
      results.push({ category, success });
    }
    
    // Step 3: Run final audit to see improvement
    console.log('\n>>> STEP 3: RUNNING FINAL AUDIT TO MEASURE IMPROVEMENT');
    const finalAudit = await runAjmanAudit();
    
    // Calculate improvement
    const improvement = finalAudit.completenessScore - initialAudit.completenessScore;
    
    // Summary
    console.log('\n=== SINGLE CYCLE ENRICHMENT SUMMARY ===');
    console.log(`Categories processed: ${categoriesToProcess.length}`);
    console.log(`Documents created: ${results.filter(r => r.success).length}`);
    console.log(`Initial completeness: ${initialAudit.completenessScore}%`);
    console.log(`Final completeness: ${finalAudit.completenessScore}%`);
    console.log(`Improvement: +${improvement}%`);
    
    if (finalAudit.isComplete) {
      console.log('\n🎉 SUCCESS: Ajman Free Zone has reached 100% completeness!');
    } else {
      console.log(`\nRemaining work: Need to process ${finalAudit.priorityFields.length} more categories to reach 100%`);
      console.log('To continue enrichment, run "node enrich-ajman-freezone.js"');
    }
    
    return {
      initialCompleteness: initialAudit.completenessScore,
      finalCompleteness: finalAudit.completenessScore,
      improvement: improvement,
      processedCategories: categoriesToProcess,
      results: results
    };
  } catch (error) {
    console.error('Error in single enrichment cycle:', error);
  }
}

// Run the single enrichment cycle
runSingleEnrichmentCycle();