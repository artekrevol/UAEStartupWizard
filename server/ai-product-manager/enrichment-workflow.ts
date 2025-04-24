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
  freeZoneId: number;
  freeZoneName: string;
  field: string;
  status: 'missing' | 'incomplete';
  confidence: number;
  importance: number;
  priority: number; // Calculated priority score
}

/**
 * Generate a prioritized list of enrichment tasks for all free zones
 */
export async function generateEnrichmentTasks(): Promise<EnrichmentTask[]> {
  try {
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
          SELECT payload FROM activity_logs 
          WHERE type = 'analyze-complete' 
          AND payload->>'freeZoneId' = ${zone.id.toString()}
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
    // Log the batch execution start
    await logActivity(
      'enrichment-batch-start',
      `Starting batch execution of ${Math.min(tasks.length, batchSize)} enrichment tasks`,
      { 
        totalTasks: tasks.length,
        batchSize
      }
    );
    
    const tasksToExecute = tasks.slice(0, batchSize);
    const results = [];
    
    let successfulTasks = 0;
    let failedTasks = 0;
    
    // Execute each task
    for (const task of tasksToExecute) {
      try {
        // Execute the enrichment
        const result = await enrichFreeZoneData(task.freeZoneId, task.field);
        
        // Record the successful result
        results.push({
          task,
          success: true,
          result
        });
        
        successfulTasks++;
      } catch (error) {
        console.error(`Error executing task for ${task.freeZoneName} - ${task.field}: ${error}`);
        
        // Record the failed result
        results.push({
          task,
          success: false,
          error: (error as Error).message
        });
        
        failedTasks++;
        
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
      const payload = typeof log.payload === 'string' 
        ? JSON.parse(log.payload) 
        : log.payload;
      
      if (payload && payload.contentLength) {
        totalContentLength += payload.contentLength;
        contentLengthCount++;
      }
    }
    
    const avgContentLength = contentLengthCount > 0 ? totalContentLength / contentLengthCount : 0;
    
    // Find most enriched fields
    const fieldCounts = {};
    const freeZoneCounts = {};
    
    for (const log of successfulLogs) {
      const payload = typeof log.payload === 'string' 
        ? JSON.parse(log.payload) 
        : log.payload;
      
      if (payload) {
        if (payload.field) {
          fieldCounts[payload.field] = (fieldCounts[payload.field] || 0) + 1;
        }
        
        if (payload.freeZoneName) {
          freeZoneCounts[payload.freeZoneName] = (freeZoneCounts[payload.freeZoneName] || 0) + 1;
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