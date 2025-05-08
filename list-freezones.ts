import { db } from './server/db';
import { freeZones } from './shared/schema';

async function listFreeZones() {
  try {
    const zones = await db.select().from(freeZones);
    
    console.log(`Total free zones in database: ${zones.length}`);
    console.log('\nList of free zones:');
    zones.forEach((zone, i) => console.log(`${i+1}. ${zone.name}`));
    
  } catch (err) {
    console.error('Error fetching free zones:', err);
  }
}

listFreeZones().catch(console.error);