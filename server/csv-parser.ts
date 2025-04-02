import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { businessActivities } from '@shared/schema';

// Define the type for business activities based on the table schema
type ActivityRecord = {
  activityCode?: string;
  name: string;
  nameArabic?: string;
  description?: string;
  descriptionArabic?: string;
  industryGroup?: string;
  isicActivity?: boolean;
};

/**
 * Parse the ISIC activities CSV file
 * @param filePath Path to the CSV file
 * @returns Promise resolving to an array of ISIC activities
 */
export async function parseIsicActivitiesCsv(filePath: string): Promise<ActivityRecord[]> {
  return new Promise((resolve, reject) => {
    const activities: ActivityRecord[] = [];
    const parser = parse({
      delimiter: ',',
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
      columns: false // We'll handle column mapping manually due to the irregular format
    });

    // Create a readable stream for the CSV file
    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (row: string[]) => {
        // Only process rows that have an activity code in the second column
        if (row.length > 2 && row[1] && /^[0-9a-zA-Z-]+$/.test(row[1])) {
          const activity: ActivityRecord = {
            activityCode: row[1],
            name: row[2] || '',
            nameArabic: row[3] || '',
            description: row[4] || '',
            descriptionArabic: row[5] || '',
            industryGroup: row[6] || ''
          };

          // Check if this is marked as an ISIC activity (column 7)
          if (row[7] && row[7].toLowerCase() === 'true') {
            activity.isicActivity = true;
          }

          activities.push(activity);
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        resolve(activities);
      });
  });
}

/**
 * Group activities by industry group
 * @param activities List of business activities
 * @returns Object with industry groups as keys and arrays of activities as values
 */
export function groupActivitiesByIndustry(activities: ActivityRecord[]): Record<string, ActivityRecord[]> {
  const grouped: Record<string, ActivityRecord[]> = {};
  
  activities.forEach(activity => {
    if (activity.industryGroup) {
      if (!grouped[activity.industryGroup]) {
        grouped[activity.industryGroup] = [];
      }
      grouped[activity.industryGroup].push(activity);
    }
  });
  
  return grouped;
}

/**
 * Import ISIC activities from a CSV file to the database
 * @param db Database instance
 * @param filePath Path to the CSV file
 */
export async function importIsicActivities(filePath: string): Promise<ActivityRecord[]> {
  try {
    console.log(`Parsing ISIC activities from ${filePath}`);
    const activities = await parseIsicActivitiesCsv(filePath);
    console.log(`Parsed ${activities.length} ISIC activities`);
    return activities;
  } catch (error) {
    console.error('Error importing ISIC activities:', error);
    throw error;
  }
}