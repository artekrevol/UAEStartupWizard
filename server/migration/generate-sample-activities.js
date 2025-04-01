// server/migration/generate-sample-activities.js
import { pool } from '../db';

// Industry groups for classification
const INDUSTRY_GROUPS = [
  'Agriculture, forestry and fishing',
  'Mining and quarrying',
  'Manufacturing',
  'Electricity, gas, steam and air conditioning supply',
  'Water supply; sewerage, waste management and remediation activities',
  'Construction',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles',
  'Transportation and storage',
  'Accommodation and food service activities',
  'Information and communication',
  'Financial and insurance activities',
  'Real estate activities',
  'Professional, scientific and technical activities',
  'Administrative and support service activities',
  'Public administration and defence; compulsory social security',
  'Education',
  'Human health and social work activities',
  'Arts, entertainment and recreation',
  'Other service activities',
  'Activities of households as employers',
  'Activities of extraterritorial organizations and bodies'
];

// List of sample activities for each industry group
const ACTIVITY_TEMPLATES = {
  'Agriculture, forestry and fishing': [
    'Growing of {0}',
    'Farming of {0}',
    'Mixed farming with {0}',
    'Support activities for {0} cultivation',
    'Fishing in {0} waters',
    'Aquaculture of {0}',
    'Forestry and {0} harvesting'
  ],
  'Mining and quarrying': [
    'Mining of {0}',
    'Extraction of {0}',
    'Quarrying of {0}',
    'Support activities for {0} extraction',
    'Operation of {0} mines',
    'Exploration for {0}'
  ],
  'Manufacturing': [
    'Manufacture of {0}',
    'Processing of {0}',
    'Assembly of {0}',
    'Production of {0}',
    'Fabrication of {0} products',
    'Industrial {0} manufacturing'
  ],
  // More templates for other industry groups
  'Information and communication': [
    'Software development for {0}',
    'Web portal for {0}',
    'Data processing for {0}',
    'Publishing of {0} content',
    '{0} telecommunications services',
    '{0} broadcasting activities',
    'Information service activities for {0}'
  ],
  'Financial and insurance activities': [
    '{0} financial service activities',
    'Insurance activities for {0}',
    'Fund management for {0}',
    '{0} auxiliary financial activities',
    '{0} investment activities',
    'Financial leasing of {0}'
  ],
  'Professional, scientific and technical activities': [
    '{0} legal activities',
    '{0} accounting activities',
    'Management consultancy for {0}',
    'Architectural activities for {0}',
    'Engineering activities for {0}',
    'Scientific research on {0}',
    'Technical testing of {0}',
    'Advertising for {0}',
    'Market research for {0}'
  ]
};

// Items to fill in the templates
const ACTIVITY_ITEMS = {
  'Agriculture, forestry and fishing': [
    'rice', 'wheat', 'vegetables', 'fruits', 'cattle', 'sheep', 'poultry', 'freshwater fish', 
    'marine fish', 'tropical fruits', 'citrus fruits', 'leafy vegetables', 'root crops',
    'timber', 'coconuts', 'dairy animals', 'palm oil', 'coffee', 'tea', 'spices'
  ],
  'Mining and quarrying': [
    'coal', 'lignite', 'crude petroleum', 'natural gas', 'iron ores', 'non-ferrous metal ores', 
    'stone', 'sand', 'clay', 'chemical minerals', 'salt', 'precious stones', 'uranium', 
    'thorium', 'mineral water', 'construction materials', 'industrial minerals'
  ],
  'Manufacturing': [
    'food products', 'beverages', 'tobacco products', 'textiles', 'wearing apparel', 
    'leather products', 'wood products', 'paper products', 'printed materials', 
    'refined petroleum products', 'chemicals', 'pharmaceuticals', 'rubber products', 
    'plastic products', 'non-metallic mineral products', 'basic metals', 'fabricated metal products', 
    'electronic components', 'optical products', 'electrical equipment', 'machinery', 
    'motor vehicles', 'transport equipment', 'furniture'
  ],
  // More items for other industry groups
  'Information and communication': [
    'enterprise software', 'mobile applications', 'cloud services', 'IoT platforms', 
    'digital content', 'social media', 'e-commerce', 'digital publishing', 'telecommunications', 
    'broadcasting', 'satellite communications', 'fiber optic networks', 'data centers', 
    'cybersecurity', 'blockchain applications', 'artificial intelligence', 'virtual reality',
    'video games', 'digital advertising', 'streaming services'
  ],
  'Financial and insurance activities': [
    'retail banking', 'investment banking', 'asset management', 'life insurance', 
    'non-life insurance', 'reinsurance', 'pension funding', 'financial leasing', 
    'credit granting', 'wealth management', 'microfinance', 'venture capital', 
    'stock exchange activities', 'financial advisory', 'commodity contracts', 
    'funds management', 'real estate investment trusts', 'cryptocurrency exchanges'
  ],
  'Professional, scientific and technical activities': [
    'legal services', 'accounting', 'tax consultancy', 'business management', 
    'architectural design', 'engineering design', 'technical testing', 'research and development', 
    'biotechnology', 'advertising', 'market research', 'specialized design', 
    'photographic activities', 'translation services', 'veterinary activities', 
    'environmental consulting', 'intellectual property', 'industrial design', 
    'urban planning', 'geological surveying'
  ]
};

// Function to generate a random activity code
function generateActivityCode() {
  const section = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const division = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const group = Math.floor(Math.random() * 10);
  const class_ = Math.floor(Math.random() * 10);
  
  return `${section}${division}.${group}${class_}`;
}

// Function to generate sample activities
async function generateSampleActivities(count) {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log(`Starting generation of ${count} sample ISIC activities`);
    
    // Create activities
    let generatedCount = 0;
    let batchSize = 20; // Smaller batch size for better performance
    
    // Prepare the insert query
    const insertQuery = `
      INSERT INTO business_activities
        (activity_code, name, description, industry_group, isic_activity)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (activity_code) 
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        industry_group = EXCLUDED.industry_group,
        isic_activity = EXCLUDED.isic_activity
      RETURNING id
    `;
    
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);
      
      for (let j = 0; j < batchCount; j++) {
        // Choose a random industry group
        const industryGroup = INDUSTRY_GROUPS[Math.floor(Math.random() * INDUSTRY_GROUPS.length)];
        
        // Get templates for this industry group or use generic ones
        const templates = ACTIVITY_TEMPLATES[industryGroup] || [
          '{0} activities',
          'Specialized {0} services',
          '{0} operations',
          '{0} support activities'
        ];
        
        // Get items for this industry group or use generic ones
        const items = ACTIVITY_ITEMS[industryGroup] || [
          'commercial', 'industrial', 'technical', 'specialized', 'general',
          'professional', 'corporate', 'business', 'retail', 'wholesale'
        ];
        
        // Generate a random activity by selecting a template and an item
        const template = templates[Math.floor(Math.random() * templates.length)];
        const item = items[Math.floor(Math.random() * items.length)];
        
        // Replace the placeholder with the item
        const activityName = template.replace('{0}', item);
        
        // Generate a description
        const description = `Activities related to ${activityName.toLowerCase()}, including planning, execution, management, and support services.`;
        
        // Generate a unique activity code
        const activityCode = generateActivityCode();
        
        // Insert into database
        await client.query(insertQuery, [
          activityCode,
          activityName,
          description,
          industryGroup,
          'true'
        ]);
        
        generatedCount++;
      }
      
      console.log(`Generated ${generatedCount} of ${count} sample activities`);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Successfully generated ${generatedCount} sample ISIC activities`);
    
    return generatedCount;
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Generation failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Function to generate activities in smaller batches
async function generateInBatches(totalCount, batchSize = 200) {
  let generatedTotal = 0;
  
  while (generatedTotal < totalCount) {
    const remaining = totalCount - generatedTotal;
    const currentBatchSize = Math.min(batchSize, remaining);
    
    console.log(`Generating batch of ${currentBatchSize} activities (${generatedTotal + currentBatchSize}/${totalCount} total)`);
    
    try {
      const count = await generateSampleActivities(currentBatchSize);
      generatedTotal += count;
      console.log(`Batch complete. Total generated so far: ${generatedTotal}`);
    } catch (error) {
      console.error(`Error generating batch: ${error.message}`);
      // Continue with the next batch despite errors
    }
  }
  
  return generatedTotal;
}

// Run the script if it's executed directly
if (process.argv[1].includes('generate-sample-activities.js')) {
  // Default to generating 2000 activities, but allow command line argument
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg) : 2000;
  const batchSizeArg = process.argv[3];
  const batchSize = batchSizeArg ? parseInt(batchSizeArg) : 200;
  
  generateInBatches(count, batchSize)
    .then((generatedCount) => {
      console.log(`Sample activity generation finished successfully. Generated ${generatedCount} activities.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sample activity generation failed:', error);
      process.exit(1);
    });
}

export { generateSampleActivities };