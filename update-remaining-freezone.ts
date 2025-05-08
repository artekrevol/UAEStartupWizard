/**
 * Update the Remaining Free Zone Without a Website
 */

import { db } from './server/db';
import { freeZones } from './shared/schema';
import { sql } from 'drizzle-orm';

async function updateRemainingFreeZone() {
  try {
    console.log('Updating the remaining free zone without a website...');
    
    // Update Dubai Multi Commodities Centre
    const result = await db
      .update(freeZones)
      .set({
        website: 'https://www.dmcc.ae',
        lastUpdated: new Date()
      })
      .where(sql`${freeZones.name} = 'Dubai Multi Commodities Centre'`);
    
    console.log('Update completed!');
    
    // Verify the update
    const updatedZone = await db
      .select()
      .from(freeZones)
      .where(sql`${freeZones.name} = 'Dubai Multi Commodities Centre'`);
    
    if (updatedZone.length > 0 && updatedZone[0].website) {
      console.log(`✅ Successfully updated: Dubai Multi Commodities Centre with website: ${updatedZone[0].website}`);
    } else {
      console.log('❌ Failed to update the free zone.');
    }
    
  } catch (error) {
    console.error('Error updating remaining free zone:', error);
  }
}

// Run the update
updateRemainingFreeZone().catch(console.error).finally(() => {
  process.exit(0);
});