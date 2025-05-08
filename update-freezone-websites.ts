/**
 * Update Free Zone Websites Script
 * 
 * This script updates the database with website URLs for free zones
 * that were previously missing this information.
 */

import { db } from './server/db';
import { freeZones } from './shared/schema';
import { eq, sql } from 'drizzle-orm';

// Website data to update
const freeZoneWebsites = [
  // Industrial City of Abu Dhabi (ICAD)
  {
    name: 'Industrial City of Abu Dhabi (ICAD)',
    website: 'https://www.uaefreezones.com/fz_abudhabi_industrial_city.html',
    official: false
  },
  
  // Dubai South
  {
    name: 'Dubai South',
    website: 'https://www.dubaisouth.ae',
    official: true
  },
  
  // Sharjah Media City (already in DB but checking both variations)
  {
    name: 'Sharjah Media City',
    website: 'https://www.shams.ae',
    official: true
  },
  
  // Dubai Airport Freezone
  {
    name: 'Dubai Airport Freezone',
    website: 'https://www.dafz.ae/en/',
    official: true
  },
  
  // Dubai Internet City
  {
    name: 'Dubai Internet City',
    website: 'https://dic.ae',
    official: true
  },
  
  // Jebel Ali Free Zone Authority
  {
    name: 'Jebel Ali Free Zone Authority',
    website: 'https://www.jafza.ae',
    official: true
  },
  
  // Generic entries (potentially to be removed or merged)
  {
    name: 'GRG UAE Free Zones - Business Setup in UAE - Company Setup in Dubai',
    website: 'https://www.uaefreezones.com',
    official: false,
    notes: 'This appears to be a directory rather than an actual free zone'
  },
  
  {
    name: 'UAE Free Zones',
    website: 'https://www.uaefreezones.com',
    official: false,
    notes: 'This appears to be a directory rather than an actual free zone'
  },
  
  {
    name: 'UAE Free Zones Overview',
    website: 'https://www.moec.gov.ae/en/free-zones',
    official: true,
    notes: 'This is a general overview page from the Ministry of Economy'
  }
];

// Function to update free zone website data
async function updateFreeZoneWebsites() {
  console.log('Updating Free Zone website information...');
  
  // Keep track of updates
  let updatedCount = 0;
  let notFoundCount = 0;
  
  // Process each free zone
  for (const freeZoneData of freeZoneWebsites) {
    try {
      // Find the free zone by name
      const matchingZones = await db
        .select()
        .from(freeZones)
        .where(sql`LOWER(${freeZones.name}) = LOWER(${freeZoneData.name})`);
      
      if (matchingZones.length > 0) {
        // Update the website field
        await db
          .update(freeZones)
          .set({
            website: freeZoneData.website,
            lastUpdated: new Date()
          })
          .where(eq(freeZones.id, matchingZones[0].id));
        
        updatedCount++;
        console.log(`✅ Updated ${freeZoneData.name} with website: ${freeZoneData.website}`);
      } else {
        console.log(`❌ Could not find free zone with name: ${freeZoneData.name}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`Error updating ${freeZoneData.name}:`, error);
    }
  }
  
  // Print summary
  console.log('\n--- Update Summary ---');
  console.log(`Total Free Zones to Update: ${freeZoneWebsites.length}`);
  console.log(`Successfully Updated: ${updatedCount}`);
  console.log(`Not Found: ${notFoundCount}`);
}

// Run the update function
updateFreeZoneWebsites()
  .catch(err => console.error('Error updating free zone websites:', err))
  .finally(() => process.exit(0));