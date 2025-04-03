/**
 * Script to run the SAIF Zone scraper and document downloader
 * 
 * This script extracts comprehensive information from the SAIF Zone website
 * and downloads related documents for use in our application.
 */

const { runSAIFZoneScraper } = require('./scraper/saif_zone_scraper');
const { downloadSAIFZoneDocuments } = require('./scraper/saif_zone_document_downloader');
const fs = require('fs');
const path = require('path');

/**
 * Ensure the SAIF Zone free zone exists in the database
 */
async function ensureSAIFZoneExists() {
  try {
    const { db } = require('./server/db');
    const { freeZones, eq } = require('./shared/schema');
    const { sql } = require('drizzle-orm');
    
    // Check if SAIF Zone already exists
    const existingFreeZone = await db
      .select()
      .from(freeZones)
      .where(sql`LOWER(name) LIKE '%saif zone%'`)
      .limit(1);
    
    if (existingFreeZone.length > 0) {
      console.log(`SAIF Zone already exists in database with ID: ${existingFreeZone[0].id}`);
      return existingFreeZone[0].id;
    }
    
    // If not, create it
    const result = await db.insert(freeZones).values({
      name: 'Sharjah Airport International Free Zone (SAIF Zone)',
      abbreviation: 'SAIF Zone',
      description: 'Sharjah Airport International Free Zone (SAIF Zone) offers businesses 100% foreign ownership, competitive costs, and strategic location at Sharjah International Airport.',
      location: 'Sharjah, UAE',
      website: 'https://www.saif-zone.com',
      logoUrl: 'https://www.saif-zone.com/logo.png',
      metadata: {
        establishmentYear: 1995,
        benefits: [
          '100% foreign ownership',
          'No corporate or income taxes',
          'Strategic location at Sharjah International Airport',
          'Competitive operating costs'
        ]
      }
    }).returning({ id: freeZones.id });
    
    console.log(`Created SAIF Zone in database with ID: ${result[0].id}`);
    return result[0].id;
  } catch (error) {
    console.error('Error ensuring SAIF Zone exists:', error);
    return null;
  }
}

/**
 * Create example documents for SAIF Zone categories
 */
async function createExampleDocuments() {
  const baseDir = path.join(process.cwd(), 'saif_zone_docs');
  
  // Create example document for each main category
  const categories = [
    'business_setup', 
    'compliance', 
    'financial', 
    'legal', 
    'trade', 
    'forms'
  ];
  
  for (const category of categories) {
    const categoryDir = path.join(baseDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    // Create an example document
    const documentPath = path.join(categoryDir, `saif_zone_${category}_guide.txt`);
    const content = `# SAIF Zone ${category.replace('_', ' ')} Guide\n\n` +
      `This is an example document for the ${category} category in SAIF Zone.\n\n` +
      `It contains guidelines and information about ${category.replace('_', ' ')} in SAIF Zone.\n\n` +
      `Document ID: SAIF-${category.toUpperCase()}-001\n` +
      `Version: 1.0\n` +
      `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    fs.writeFileSync(documentPath, content);
    console.log(`Created example document in ${category}: ${documentPath}`);
    
    // Create a subcategory example if appropriate
    if (['business_setup', 'financial', 'compliance'].includes(category)) {
      let subcategory;
      if (category === 'business_setup') subcategory = 'company_formation';
      else if (category === 'financial') subcategory = 'tax_compliance';
      else subcategory = 'kyc';
      
      const subcategoryDir = path.join(categoryDir, subcategory);
      if (!fs.existsSync(subcategoryDir)) {
        fs.mkdirSync(subcategoryDir, { recursive: true });
      }
      
      const subcategoryDocPath = path.join(subcategoryDir, `saif_zone_${subcategory}_guide.txt`);
      const subcategoryContent = `# SAIF Zone ${subcategory.replace('_', ' ')} Guide\n\n` +
        `This is an example document for the ${subcategory} subcategory in SAIF Zone.\n\n` +
        `It contains specific guidelines about ${subcategory.replace('_', ' ')} in SAIF Zone.\n\n` +
        `Document ID: SAIF-${subcategory.toUpperCase()}-001\n` +
        `Version: 1.0\n` +
        `Date: ${new Date().toISOString().split('T')[0]}\n`;
      
      fs.writeFileSync(subcategoryDocPath, subcategoryContent);
      console.log(`Created example document in ${category}/${subcategory}: ${subcategoryDocPath}`);
    }
  }
  
  console.log('Created example documents for SAIF Zone categories');
}

/**
 * Main function to run all SAIF Zone scrapers
 */
async function runSAIFZoneScrapers() {
  try {
    console.log('Starting SAIF Zone data extraction process...');
    
    // Ensure SAIF Zone exists in the database
    const freeZoneId = await ensureSAIFZoneExists();
    
    if (!freeZoneId) {
      console.error('Could not find or create SAIF Zone in database. Exiting.');
      return;
    }
    
    // Create example documents
    await createExampleDocuments();
    
    // Run the SAIF Zone scraper
    console.log('Running SAIF Zone scraper...');
    const scraperResult = await runSAIFZoneScraper({ freeZoneId });
    
    if (scraperResult.success) {
      console.log('SAIF Zone scraper completed successfully');
    } else {
      console.error('SAIF Zone scraper encountered errors:', scraperResult.error);
    }
    
    // Run the document downloader
    console.log('Running SAIF Zone document downloader...');
    const downloaderResult = await downloadSAIFZoneDocuments();
    
    if (downloaderResult.success) {
      console.log(`SAIF Zone document downloader completed successfully. Downloaded ${downloaderResult.downloadedDocs.length} documents.`);
    } else {
      console.error('SAIF Zone document downloader encountered errors:', downloaderResult.error);
    }
    
    console.log('SAIF Zone data extraction process completed');
    
    // Next steps message
    console.log('\nNext steps:');
    console.log('1. Run the document processor:');
    console.log('   npx tsx process-saif-zone-docs.ts');
    console.log('2. Verify the documents in the database');
    console.log('3. Check the document categories and make sure they align with DMCC documents');
    
  } catch (error) {
    console.error('Error running SAIF Zone scrapers:', error);
  }
}

// Run the scrapers
runSAIFZoneScrapers().catch(console.error);