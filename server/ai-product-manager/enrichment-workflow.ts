/**
 * AI Product Manager - Intelligent Data Enrichment Workflow
 * 
 * This module provides an automated workflow for identifying and enriching
 * incomplete data sections across free zones. It prioritizes sections for enrichment
 * based on importance, completeness, and available data sources.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logActivity } from './logger';
import { enrichFreeZoneData } from './index';
import { performWebResearch } from '../WebResearchAssistant';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define importance weights for different fields
// Higher weight means higher priority for enrichment
const FIELD_IMPORTANCE = {
  setup_process: 10,
  legal_requirements: 9,
  fee_structure: 8,
  visa_information: 7,
  facilities: 5,
  benefits: 6
};

// Enrichment task interface
interface EnrichmentTask {
  id?: number;
  freeZoneId: number;
  freeZoneName: string;
  field: string;
  status: 'missing' | 'incomplete' | 'complete';
  confidence: number;
  importance: number;
  priority: number; // Calculated priority score
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
  result?: any;
}

/**
 * Get tasks from the database based on the enrichment_tasks table
 */
export async function getEnrichmentTasksFromDB(): Promise<EnrichmentTask[]> {
  try {
    const tasksResult = await db.execute(sql`
      SELECT id, free_zone_id, free_zone_name, field, priority, status, created_at, updated_at, completed_at, result
      FROM enrichment_tasks
      WHERE status NOT IN ('completed', 'failed')
      ORDER BY priority DESC, created_at ASC
    `);
    
    console.log(`[AI-PM] Fetched ${tasksResult.rows.length} pending tasks from database`);
    
    // Convert DB results to EnrichmentTask format
    return tasksResult.rows.map((task: any) => {
      // Determine the status based on the database value
      let status: 'missing' | 'incomplete' | 'complete';
      if (task.status === 'completed') {
        status = 'complete';
      } else if (task.status === 'pending') {
        status = 'missing';
      } else {
        status = 'incomplete';
      }
      
      return {
        id: task.id,
        freeZoneId: task.free_zone_id,
        freeZoneName: task.free_zone_name,
        field: task.field,
        status,
        confidence: 0.5, // Default value since the DB might not have this
        importance: task.priority, // Use priority as importance
        priority: task.priority, // Use priority directly from the DB
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.completed_at,
        result: task.result
      };
    });
  } catch (error) {
    console.error(`Error fetching enrichment tasks from database: ${error}`);
    await logActivity(
      'task-fetch-error',
      `Error fetching enrichment tasks: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    return [];
  }
}

/**
 * Generate a prioritized list of enrichment tasks for all free zones
 */
export async function generateEnrichmentTasks(): Promise<EnrichmentTask[]> {
  try {
    // First, check if there are existing tasks in the database
    const existingTasks = await getEnrichmentTasksFromDB();
    
    // If we have tasks in the database, return them
    if (existingTasks.length > 0) {
      console.log(`[AI-PM] Found ${existingTasks.length} existing tasks in database`);
      return existingTasks;
    }
    
    // If no tasks in DB, generate new ones
    console.log('[AI-PM] No existing tasks found, generating from analysis');
    
    // Log the task generation start
    await logActivity(
      'enrichment-task-generation-start',
      'Starting generation of enrichment tasks for all free zones',
      {}
    );
    
    // Fetch all free zones
    const freeZonesResult = await db.execute(sql`
      SELECT id, name FROM free_zones
    `);
    
    const freeZones = freeZonesResult.rows;
    
    // Fetch current analysis results for all free zones
    const analysisResults = await Promise.all(
      freeZones.map(async (zone: any) => {
        // Get latest analysis from activity_logs
        const analysisLogResult = await db.execute(sql`
          SELECT metadata FROM activity_logs 
          WHERE type = 'analyze-complete' 
          AND metadata->>'freeZoneId' = ${zone.id.toString()}
          ORDER BY created_at DESC
          LIMIT 1
        `);
        
        if (analysisLogResult.rows.length === 0) {
          return null;
        }
        
        // Get the full analysis
        const analysisResult = await db.execute(sql`
          SELECT * FROM free_zone_analysis
          WHERE free_zone_id = ${zone.id}
          ORDER BY created_at DESC
          LIMIT 1
        `);
        
        if (analysisResult.rows.length === 0) {
          return null;
        }
        
        const analysis = analysisResult.rows[0];
        
        // Parse the fields
        const fields = typeof analysis.fields === 'string' 
          ? JSON.parse(analysis.fields) 
          : analysis.fields;
        
        return {
          freeZoneId: zone.id,
          freeZoneName: zone.name,
          fields: fields || []
        };
      })
    );
    
    // Filter out nulls from analysis results
    const validAnalysisResults = analysisResults.filter(result => result !== null);
    
    // Generate tasks for each free zone with incomplete fields
    const allTasks: EnrichmentTask[] = [];
    
    for (const analysis of validAnalysisResults) {
      // Find incomplete or missing fields
      const incompleteFields = analysis.fields.filter(
        (field: any) => field.status === 'incomplete' || field.status === 'missing'
      );
      
      // Generate tasks for each incomplete field
      for (const field of incompleteFields) {
        const importance = FIELD_IMPORTANCE[field.field] || 5; // Default importance if not specified
        
        // Calculate priority score based on importance, status and confidence
        // Missing fields get higher priority than incomplete ones
        const statusFactor = field.status === 'missing' ? 1.5 : 1.0;
        // Lower confidence means higher priority (we're less certain)
        const confidenceFactor = 1 - (field.confidence || 0.5);
        
        const priority = importance * statusFactor * (1 + confidenceFactor);
        
        allTasks.push({
          freeZoneId: analysis.freeZoneId,
          freeZoneName: analysis.freeZoneName,
          field: field.field,
          status: field.status,
          confidence: field.confidence || 0.5,
          importance,
          priority
        });
      }
    }
    
    // Sort tasks by priority (descending)
    const sortedTasks = allTasks.sort((a, b) => b.priority - a.priority);
    
    // Log the successful task generation
    await logActivity(
      'enrichment-task-generation-complete',
      `Generated ${sortedTasks.length} enrichment tasks for ${validAnalysisResults.length} free zones`,
      { 
        taskCount: sortedTasks.length,
        freeZoneCount: validAnalysisResults.length
      }
    );
    
    return sortedTasks;
  } catch (error) {
    console.error(`Error generating enrichment tasks: ${error}`);
    await logActivity(
      'enrichment-task-generation-error',
      `Error generating enrichment tasks: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Execute a batch of enrichment tasks
 * @param tasks The tasks to execute
 * @param batchSize Maximum number of tasks to execute in this batch
 */
/**
 * Execute a single enrichment task with timeout protection
 */
async function executeEnrichmentTask(task: EnrichmentTask, timeoutMs: number = 60000): Promise<{
  task: EnrichmentTask,
  success: boolean,
  result?: any,
  error?: string
}> {
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Task execution timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  // Create the actual task execution promise
  const executionPromise = (async () => {
    try {
      // Execute the enrichment
      const result = await enrichFreeZoneData(task.freeZoneId, task.field);
      
      // Update task status in database to completed
      if (task.id) {
        try {
          await db.execute(sql`
            UPDATE enrichment_tasks
            SET status = 'completed',
                completed_at = NOW(),
                result = ${JSON.stringify(result)}
            WHERE id = ${task.id}
          `);
          console.log(`[AI-PM] Updated task ID ${task.id} status to completed in database`);
        } catch (updateError) {
          console.error(`[AI-PM] Error updating task status: ${updateError}`);
        }
      }
      
      // Return successful result
      return {
        task,
        success: true,
        result
      };
    } catch (error) {
      console.error(`Error executing task for ${task.freeZoneName} - ${task.field}: ${error}`);
      
      // Update task status in database to failed
      if (task.id) {
        try {
          await db.execute(sql`
            UPDATE enrichment_tasks
            SET status = 'failed',
                completed_at = NOW(),
                result = ${JSON.stringify({ error: (error as Error).message })}
            WHERE id = ${task.id}
          `);
          console.log(`[AI-PM] Updated task ID ${task.id} status to failed in database`);
        } catch (updateError) {
          console.error(`[AI-PM] Error updating task status: ${updateError}`);
        }
      }
      
      // Log the task failure
      await logActivity(
        'enrichment-task-failed',
        `Failed to enrich ${task.field} for ${task.freeZoneName}: ${(error as Error).message}`,
        { 
          freeZoneId: task.freeZoneId,
          freeZoneName: task.freeZoneName,
          field: task.field,
          error: (error as Error).message
        },
        'ai-product-manager',
        'warning'
      );
      
      // Return failed result
      return {
        task,
        success: false,
        error: (error as Error).message
      };
    }
  })();
  
  // Race between the execution and timeout
  try {
    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (error) {
    // If we got here, it's likely a timeout
    console.error(`Task execution for ${task.freeZoneName} - ${task.field} timed out`);
    
    // Update task status in database to failed
    if (task.id) {
      try {
        await db.execute(sql`
          UPDATE enrichment_tasks
          SET status = 'failed',
              completed_at = NOW(),
              result = ${JSON.stringify({ error: (error as Error).message })}
          WHERE id = ${task.id}
        `);
        console.log(`[AI-PM] Updated task ID ${task.id} status to failed in database (timeout)`);
      } catch (updateError) {
        console.error(`[AI-PM] Error updating task status: ${updateError}`);
      }
    }
    
    // Log the timeout
    await logActivity(
      'enrichment-task-timeout',
      `Task timed out for ${task.field} on ${task.freeZoneName}: ${(error as Error).message}`,
      { 
        freeZoneId: task.freeZoneId,
        freeZoneName: task.freeZoneName,
        field: task.field,
        error: (error as Error).message
      },
      'ai-product-manager',
      'warning'
    );
    
    return {
      task,
      success: false,
      error: `Task execution timed out after ${timeoutMs}ms`
    };
  }
}

export async function executeEnrichmentTasks(
  tasks: EnrichmentTask[], 
  batchSize: number = 3
): Promise<{
  completedTasks: number,
  successfulTasks: number,
  failedTasks: number,
  results: any[]
}> {
  try {
    // Ensure batchSize doesn't exceed a reasonable limit to prevent overwhelming the system
    const effectiveBatchSize = Math.min(batchSize, 10);
    
    // Log the batch execution start
    await logActivity(
      'enrichment-batch-start',
      `Starting batch execution of ${Math.min(tasks.length, effectiveBatchSize)} enrichment tasks`,
      { 
        totalTasks: tasks.length,
        batchSize: effectiveBatchSize
      }
    );
    
    const tasksToExecute = tasks.slice(0, effectiveBatchSize);
    const results = [];
    
    let successfulTasks = 0;
    let failedTasks = 0;
    
    // Execute each task with a 2-minute timeout
    for (const task of tasksToExecute) {
      console.log(`[AI-PM] Executing task for ${task.freeZoneName} - ${task.field}`);
      const taskResult = await executeEnrichmentTask(task, 120000); // 2-minute timeout
      
      results.push(taskResult);
      
      if (taskResult.success) {
        successfulTasks++;
      } else {
        failedTasks++;
      }
      
      // Add a small delay between tasks to avoid API rate limits
      if (tasksToExecute.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
      }
    }
    
    // Log the batch execution completion
    await logActivity(
      'enrichment-batch-complete',
      `Completed batch of ${tasksToExecute.length} enrichment tasks: ${successfulTasks} successful, ${failedTasks} failed`,
      { 
        totalTasks: tasks.length,
        batchSize,
        executed: tasksToExecute.length,
        successful: successfulTasks,
        failed: failedTasks
      }
    );
    
    return {
      completedTasks: tasksToExecute.length,
      successfulTasks,
      failedTasks,
      results
    };
  } catch (error) {
    console.error(`Error executing enrichment tasks: ${error}`);
    await logActivity(
      'enrichment-batch-error',
      `Error executing enrichment batch: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Run the entire intelligent enrichment workflow
 * Generates tasks, runs a batch, and returns results
 */
export async function runIntelligentEnrichmentWorkflow(batchSize: number = 3): Promise<{
  totalTasks: number,
  completedTasks: number,
  successfulTasks: number,
  failedTasks: number,
  results: any[]
}> {
  try {
    // Log the workflow start
    await logActivity(
      'intelligent-enrichment-start',
      `Starting intelligent enrichment workflow with batch size ${batchSize}`,
      { batchSize }
    );
    
    // Generate tasks
    const tasks = await generateEnrichmentTasks();
    
    // Execute a batch of tasks
    const batchResult = await executeEnrichmentTasks(tasks, batchSize);
    
    // Log the workflow completion
    await logActivity(
      'intelligent-enrichment-complete',
      `Completed intelligent enrichment workflow: ${batchResult.successfulTasks}/${batchResult.completedTasks} tasks successful`,
      { 
        totalTasks: tasks.length,
        completedTasks: batchResult.completedTasks,
        successfulTasks: batchResult.successfulTasks,
        failedTasks: batchResult.failedTasks
      }
    );
    
    return {
      totalTasks: tasks.length,
      completedTasks: batchResult.completedTasks,
      successfulTasks: batchResult.successfulTasks,
      failedTasks: batchResult.failedTasks,
      results: batchResult.results
    };
  } catch (error) {
    console.error(`Error running intelligent enrichment workflow: ${error}`);
    await logActivity(
      'intelligent-enrichment-error',
      `Error running intelligent enrichment workflow: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Analyze the historical enrichment performance and provide insights
 */
export async function analyzeEnrichmentPerformance(): Promise<{
  totalEnrichments: number,
  successRate: number,
  avgContentLength: number,
  mostEnrichedFields: string[],
  mostEnrichedFreeZones: string[],
  timeStats: {
    lastHour: number,
    last24Hours: number,
    lastWeek: number
  },
  recommendations: string[]
}> {
  try {
    // Get enrichment logs
    const logsResult = await db.execute(sql`
      SELECT * FROM activity_logs
      WHERE (type = 'enrich-complete' OR type = 'enrich-error')
      ORDER BY created_at DESC
      LIMIT 1000
    `);
    
    const logs = logsResult.rows;
    
    if (logs.length === 0) {
      return {
        totalEnrichments: 0,
        successRate: 0,
        avgContentLength: 0,
        mostEnrichedFields: [],
        mostEnrichedFreeZones: [],
        timeStats: {
          lastHour: 0,
          last24Hours: 0,
          lastWeek: 0
        },
        recommendations: [
          "No enrichment data available yet. Start the enrichment workflow to generate performance metrics."
        ]
      };
    }
    
    // Count successful and failed enrichments
    const successfulLogs = logs.filter((log: any) => log.type === 'enrich-complete');
    const failedLogs = logs.filter((log: any) => log.type === 'enrich-error');
    
    const totalEnrichments = logs.length;
    const successRate = successfulLogs.length / totalEnrichments;
    
    // Calculate average content length
    let totalContentLength = 0;
    let contentLengthCount = 0;
    
    for (const log of successfulLogs) {
      const metadata = typeof log.metadata === 'string' 
        ? JSON.parse(log.metadata) 
        : log.metadata;
      
      if (metadata && metadata.contentLength) {
        totalContentLength += metadata.contentLength;
        contentLengthCount++;
      }
    }
    
    const avgContentLength = contentLengthCount > 0 ? totalContentLength / contentLengthCount : 0;
    
    // Find most enriched fields
    const fieldCounts: Record<string, number> = {};
    const freeZoneCounts: Record<string, number> = {};
    
    for (const log of successfulLogs) {
      const metadata = typeof log.metadata === 'string' 
        ? JSON.parse(log.metadata) 
        : log.metadata;
      
      // Ensure we're working with a properly typed metadata object
      if (metadata && typeof metadata === 'object') {
        if (metadata.field && typeof metadata.field === 'string') {
          fieldCounts[metadata.field] = (fieldCounts[metadata.field] || 0) + 1;
        }
        
        if (metadata.freeZoneName && typeof metadata.freeZoneName === 'string') {
          freeZoneCounts[metadata.freeZoneName] = (freeZoneCounts[metadata.freeZoneName] || 0) + 1;
        }
      }
    }
    
    // Sort fields and free zones by count
    const sortedFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([field]) => field)
      .slice(0, 5);
    
    const sortedFreeZones = Object.entries(freeZoneCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([freeZone]) => freeZone)
      .slice(0, 5);
    
    // Calculate time-based stats
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const lastHourCount = logs.filter((log: any) => new Date(log.created_at) >= hourAgo).length;
    const last24HoursCount = logs.filter((log: any) => new Date(log.created_at) >= dayAgo).length;
    const lastWeekCount = logs.filter((log: any) => new Date(log.created_at) >= weekAgo).length;
    
    // Generate recommendations based on performance
    const recommendations = [];
    
    if (successRate < 0.7) {
      recommendations.push(
        "Low success rate detected. Consider refining research queries or using more specific search terms."
      );
    }
    
    if (avgContentLength < 300) {
      recommendations.push(
        "Average content length is below target. Consider adjusting the AI instructions to generate more comprehensive content."
      );
    }
    
    if (sortedFields.length < 3) {
      recommendations.push(
        "Enrichment is focused on a limited set of fields. Consider expanding to cover all key areas."
      );
    }
    
    if (lastWeekCount < 10) {
      recommendations.push(
        "Enrichment activity is low. Schedule regular batch enrichments to improve overall data completeness."
      );
    }
    
    // If no recommendations, add a positive one
    if (recommendations.length === 0) {
      recommendations.push(
        "Enrichment workflow is performing well. Continue with the current strategy."
      );
    }
    
    return {
      totalEnrichments,
      successRate,
      avgContentLength,
      mostEnrichedFields: sortedFields,
      mostEnrichedFreeZones: sortedFreeZones,
      timeStats: {
        lastHour: lastHourCount,
        last24Hours: last24HoursCount,
        lastWeek: lastWeekCount
      },
      recommendations
    };
  } catch (error) {
    console.error(`Error analyzing enrichment performance: ${error}`);
    throw error;
  }
}