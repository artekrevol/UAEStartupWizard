import { useState, useEffect } from "react";
import React, { Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CheckIcon, 
  RefreshCw, 
  DownloadIcon, 
  BookOpenIcon, 
  AlertTriangleIcon, 
  PlayIcon, 
  PauseIcon,
  DatabaseIcon,
  ListIcon,
  Globe,
  ArrowDownToLine,
  Sparkles,
  X as XIcon
} from "lucide-react";
import axios from "axios";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Types
interface EnrichmentTask {
  freeZoneId: number;
  freeZoneName: string;
  field: string;
  status: 'missing' | 'incomplete';
  confidence: number;
  importance: number;
  priority: number;
}

interface EnrichmentResult {
  freeZoneId: number;
  freeZoneName: string;
  field: string;
  originalStatus: 'missing' | 'incomplete';
  newStatus: 'incomplete' | 'complete';
  content: string;
  source: string;
  confidence: number;
}

interface EnrichmentMetrics {
  totalEnrichments: number;
  successRate: number;
  avgContentLength: number;
  mostEnrichedFields: string[];
  mostEnrichedFreeZones: string[];
  timeStats: {
    lastHour: number;
    last24Hours: number;
    lastWeek: number;
  };
  recommendations: string[];
}

interface DeepAuditResult {
  freeZoneId: number;
  freeZoneName: string;
  existingData: {
    documents: number;
    documentsByCategory: { [key: string]: number };
    fieldsPresent: string[];
    fieldsIncomplete: string[];
    fieldsMissing: string[];
    fieldsWithDocs: { [key: string]: number };
    completenessScore: number;
  };
  liveWebsiteData: {
    url: string;
    fieldsFound: string[];
    contentSummary: { [key: string]: string };
    screenshotPath?: string;
  };
  delta: {
    fieldsPresentInBoth: string[];
    fieldsOnlyInDatabase: string[];
    fieldsOnlyOnWebsite: string[];
    inconsistentFields: { 
      field: string;
      databaseContent: string;
      websiteContent: string;
      confidenceScore: number;
    }[];
  };
  scraperUpdate: {
    scraperRun: boolean;
    scraperSuccess: boolean;
    fieldsImproved: string[];
    fieldsStillMissing: string[];
    newCompleteness: number;
    scrapedContentSummary?: { [key: string]: string };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    field?: string;
    details: string;
  }[];
  timestamp: string;
}

interface DeepAuditAllResult {
  success: boolean;
  auditResults: {
    freeZoneId: number;
    freeZoneName: string;
    result: DeepAuditResult;
    error?: string;
  }[];
  timestamp: string;
}

// Helper functions
const formatPriority = (priority: number) => {
  if (priority > 12) return "Critical";
  if (priority > 8) return "High";
  if (priority > 5) return "Medium";
  return "Low";
};

const getPriorityColor = (priority: number) => {
  if (priority > 12) return "bg-red-500";
  if (priority > 8) return "bg-orange-500";
  if (priority > 5) return "bg-yellow-500";
  return "bg-blue-500";
};

export default function EnrichmentWorkflow() {
  const queryClient = useQueryClient();
  const [batchSize, setBatchSize] = useState(3);
  const [selectedTasks, setSelectedTasks] = useState<EnrichmentTask[]>([]);
  const [autoMode, setAutoMode] = useState(false);
  const [autoInterval, setAutoInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Deep Audit state
  const [isRunningDeepAudit, setIsRunningDeepAudit] = useState(false);
  const [deepAuditAllResults, setDeepAuditAllResults] = useState<DeepAuditAllResult | null>(null);
  const [selectedAuditResults, setSelectedAuditResults] = useState<{freeZoneId: number, fields: string[]}[]>([]);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  
  // Dialog state for task confirmation
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [tasksToConfirm, setTasksToConfirm] = useState<{tasks: EnrichmentTask[], batchSize: number} | null>(null);

  // Define response types for the API
  interface EnrichmentTasksResponse {
    tasks: EnrichmentTask[];
  }

  interface EnrichmentMetricsResponse {
    totalEnrichments: number;
    successRate: number;
    avgContentLength: number;
    timeStats: {
      lastHour: number;
      last24Hours: number;
      lastWeek: number;
    };
    mostEnrichedFields: string[];
    mostEnrichedFreeZones: string[];
    recommendations: string[];
  }

  // Fetch tasks
  const { 
    data: tasks = { tasks: [] } as EnrichmentTasksResponse, 
    isLoading: isLoadingTasks,
    refetch: refetchTasks 
  } = useQuery<EnrichmentTasksResponse>({ 
    queryKey: ['/api/ai-pm/enrichment-tasks'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch metrics
  const { 
    data: metrics = {
      totalEnrichments: 0,
      successRate: 0,
      avgContentLength: 0,
      timeStats: { lastHour: 0, last24Hours: 0, lastWeek: 0 },
      mostEnrichedFields: [],
      mostEnrichedFreeZones: [],
      recommendations: []
    } as EnrichmentMetricsResponse, 
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics 
  } = useQuery<EnrichmentMetricsResponse>({ 
    queryKey: ['/api/ai-pm/enrichment-performance'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Execute enrichment mutation
  const executeEnrichmentMutation = useMutation({
    mutationFn: async (data: { tasks: EnrichmentTask[], batchSize: number }) => {
      const response = await apiRequest('POST', '/api/ai-pm/execute-enrichment', data);
      return response.json();
    },
    onSuccess: (data) => {
      // If server returned updated tasks, immediately update the cache to avoid needing a refetch
      if (data && data.updatedTasks) {
        // Update the cache with the new tasks list
        queryClient.setQueryData(['/api/ai-pm/enrichment-tasks'], { 
          tasks: data.updatedTasks 
        });
        
        // Clear selected tasks as they've been processed
        setSelectedTasks([]);
      } else {
        // Fall back to invalidating the cache for a refetch
        queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-tasks'] });
      }
      
      // Always update metrics and logs
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-performance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/logs'] });
      
      toast({
        title: "Enrichment complete",
        description: `${data.successfulTasks} of ${data.completedTasks} tasks processed successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Enrichment failed",
        description: error.message || "An error occurred while processing enrichment tasks",
        variant: "destructive"
      });
    }
  });

  // Run workflow mutation
  const runWorkflowMutation = useMutation({
    mutationFn: async (data: { batchSize: number }) => {
      const response = await apiRequest('POST', '/api/ai-pm/run-enrichment-workflow', data);
      return response.json();
    },
    onSuccess: (data: { completedTasks: number, successfulTasks: number }) => {
      // Always refresh tasks list after a workflow run
      refetchTasks();
      
      // Update other data
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-performance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/logs'] });
      
      toast({
        title: "Workflow complete",
        description: `Processed ${data.completedTasks} tasks with ${data.successfulTasks} successful completions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Workflow failed",
        description: error.message || "An error occurred while running the enrichment workflow",
        variant: "destructive"
      });
    }
  });

  // Handle task selection
  const toggleTaskSelection = (task: EnrichmentTask) => {
    if (selectedTasks.some(t => t.freeZoneId === task.freeZoneId && t.field === task.field)) {
      setSelectedTasks(selectedTasks.filter(t => 
        t.freeZoneId !== task.freeZoneId || t.field !== task.field
      ));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };
  
  // Select all tasks for a specific free zone
  const selectAllTasksForFreeZone = (freeZoneId: number, freeZoneName: string) => {
    if (!tasks?.tasks) return;
    
    // Get all tasks for this free zone
    const freeZoneTasks = tasks.tasks.filter((task: EnrichmentTask) => task.freeZoneId === freeZoneId);
    if (freeZoneTasks.length === 0) return;
    
    // Get currently selected tasks from other free zones
    const otherFreeZoneTasks = selectedTasks.filter(task => task.freeZoneId !== freeZoneId);
    
    // Add all tasks from this free zone to the selection
    setSelectedTasks([...otherFreeZoneTasks, ...freeZoneTasks]);
    
    toast({
      title: "Free Zone Tasks Selected",
      description: `Selected ${freeZoneTasks.length} tasks for ${freeZoneName}.`
    });
  };
  
  // Deselect all tasks for a specific free zone
  const deselectAllTasksForFreeZone = (freeZoneId: number, freeZoneName: string) => {
    // Remove all tasks for this free zone from selection
    setSelectedTasks(selectedTasks.filter(task => task.freeZoneId !== freeZoneId));
    
    toast({
      title: "Tasks Deselected",
    });
  };
  
  // Select ALL tasks across all free zones
  const selectAllTasks = () => {
    if (!tasks?.tasks) return;
    
    // Set selected tasks to all available tasks
    setSelectedTasks([...tasks.tasks]);
    
    toast({
      title: "All Tasks Selected",
      description: `Selected ${tasks.tasks.length} tasks across all free zones.`
    });
  };
  
  // Clear all task selections
  const clearAllTaskSelections = () => {
    setSelectedTasks([]);
    
    toast({
      title: "All Selections Cleared",
      description: "Deselected all tasks."
    });
  };

  // Execute selected tasks with confirmation dialog where needed
  const executeSelectedTasks = () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to execute",
        variant: "destructive"
      });
      return;
    }
    
    // Limit batch size to a maximum of 10 tasks at a time to prevent overwhelming the system
    const effectiveBatchSize = Math.min(selectedTasks.length, 10);
    
    // Warn if too many tasks selected
    const MAX_RECOMMENDED_TASKS = 10;
    if (selectedTasks.length > MAX_RECOMMENDED_TASKS) {
      // Show confirmation dialog instead of window.confirm
      setTasksToConfirm({
        tasks: selectedTasks,
        batchSize: effectiveBatchSize
      });
      setShowConfirmationDialog(true);
      return;
    }
    
    // If not too many tasks, execute directly
    executeEnrichmentTasksWithBatchSize(selectedTasks, effectiveBatchSize);
  };
  
  // Execute tasks after confirmation or directly if under the limit
  const executeEnrichmentTasksWithBatchSize = (tasks: EnrichmentTask[], batchSize: number) => {
    executeEnrichmentMutation.mutate({ 
      tasks: tasks, 
      batchSize: batchSize 
    });
    
    // Show toast about batch size if it was limited
    if (batchSize < tasks.length) {
      toast({
        title: "Batch size limited",
        description: `For better performance, only ${batchSize} tasks will be processed at once, even though ${tasks.length} were selected.`
      });
    }
    
    // Close dialog if it was open
    setShowConfirmationDialog(false);
  };

  // Run enrichment workflow
  const runWorkflow = () => {
    runWorkflowMutation.mutate({ batchSize });
  };

  // Toggle auto mode
  const toggleAutoMode = () => {
    if (autoMode) {
      // Turn off auto mode
      if (autoInterval) {
        clearInterval(autoInterval);
        setAutoInterval(null);
      }
      setAutoMode(false);
      toast({
        title: "Auto mode disabled",
        description: "Automatic enrichment has been stopped",
      });
    } else {
      // Turn on auto mode
      const interval = setInterval(async () => {
        try {
          // If there are existing deep audit results, use them directly for enrichment
          if (deepAuditAllResults && deepAuditAllResults.auditResults) {
            const allMissingFields = deepAuditAllResults.auditResults
              .filter(auditResult => !auditResult.error)
              .map(auditResult => ({
                freeZoneId: auditResult.freeZoneId,
                freeZoneName: auditResult.freeZoneName,
                fields: auditResult.result?.existingData?.fieldsMissing || []
              }))
              .filter(item => item.fields.length > 0);

            // Prepare fields for direct enrichment
            const selectedFields = allMissingFields.flatMap(item => 
              item.fields.map(field => ({
                freeZoneId: item.freeZoneId,
                freeZoneName: item.freeZoneName,
                field
              }))
            );

            // Use the new direct enrichment endpoint
            if (selectedFields.length > 0) {
              await axios.post('/api/ai-pm/enrich-from-audit', {
                selectedFields,
                batchSize: 5 // Moderate batch size for auto
              });
              
              // Refresh data after processing
              refetchTasks();
              refetchMetrics();
              
              console.log(`Auto mode: processed ${Math.min(5, selectedFields.length)} fields from audit`);
            } else {
              console.log('Auto mode: no missing fields found in audit results');
            }
          } else {
            // Fall back to standard workflow if no audit results exist
            await runWorkflowMutation.mutateAsync({ batchSize: 5 });
          }
        } catch (error) {
          console.error('Auto mode enrichment error:', error);
        }
      }, 1000 * 60 * 10); // Run every 10 minutes
      
      setAutoInterval(interval);
      setAutoMode(true);
      
      // Run immediately by triggering the same process
      (async () => {
        try {
          if (deepAuditAllResults && deepAuditAllResults.auditResults) {
            const allMissingFields = deepAuditAllResults.auditResults
              .filter(auditResult => !auditResult.error)
              .map(auditResult => ({
                freeZoneId: auditResult.freeZoneId,
                freeZoneName: auditResult.freeZoneName,
                fields: auditResult.result?.existingData?.fieldsMissing || []
              }))
              .filter(item => item.fields.length > 0);

            const selectedFields = allMissingFields.flatMap(item => 
              item.fields.map(field => ({
                freeZoneId: item.freeZoneId,
                freeZoneName: item.freeZoneName,
                field
              }))
            );

            if (selectedFields.length > 0) {
              await axios.post('/api/ai-pm/enrich-from-audit', {
                selectedFields,
                batchSize: 5
              });
              refetchTasks();
              refetchMetrics();
            } else {
              // If no fields to process, run a standard workflow
              await runWorkflowMutation.mutateAsync({ batchSize: 5 });
            }
          } else {
            // If no audit, run a standard workflow
            await runWorkflowMutation.mutateAsync({ batchSize: 5 });
          }
        } catch (error) {
          console.error('Initial auto mode error:', error);
        }
      })();
      
      toast({
        title: "Auto mode enabled",
        description: "Automatic enrichment will run every 10 minutes using latest audit data",
      });
    }
  };

  // Deep Audit functions
  const runDeepAuditAllFreeZones = async () => {
    setIsRunningDeepAudit(true);
    setDeepAuditAllResults(null);
    
    try {
      // Run the audit in smaller batches to avoid timeout
      const batchSize = 5;
      
      toast({
        title: "Deep Audit Started",
        description: "Auditing free zones in batches. This may take a few minutes.",
      });
      
      // First batch (first 5 free zones)
      const response = await axios.post('/api/ai-pm/deep-audit-all', {
        startIndex: 0,
        maxCount: batchSize
      });
      
      const firstBatchResults = response.data;
      
      // Set initial results
      setDeepAuditAllResults(firstBatchResults);
      
      toast({
        title: "First Batch Complete",
        description: `Processed first ${firstBatchResults.auditResults.length} free zones, continuing with remaining zones.`,
      });
      
      // Process remaining batches in the background
      const processNextBatch = async (startIndex: number, currentResults: any) => {
        try {
          const nextResponse = await axios.post('/api/ai-pm/deep-audit-all', {
            startIndex,
            maxCount: batchSize
          });
          
          const nextBatchResults = nextResponse.data;
          
          // Merge the results
          const combinedResults = {
            ...currentResults,
            auditResults: [
              ...currentResults.auditResults,
              ...nextBatchResults.auditResults
            ],
            timestamp: nextBatchResults.timestamp
          };
          
          // Update state with combined results
          setDeepAuditAllResults(combinedResults);
          
          // If there are more to process, continue
          if (startIndex + batchSize < 35) { // Assuming 35 free zones total
            await processNextBatch(startIndex + batchSize, combinedResults);
          } else {
            // We're done with all batches
            toast({
              title: "Deep Audit Complete",
              description: `Successfully audited ${combinedResults.auditResults.length} free zones.`,
            });
          }
        } catch (error) {
          console.error(`Error processing batch starting at ${startIndex}:`, error);
          toast({
            title: "Batch Processing Issue",
            description: `Encountered an issue with some free zones. ${currentResults.auditResults.length} zones were processed successfully.`,
            variant: "destructive"
          });
        }
      };
      
      // Start processing the rest of the batches
      processNextBatch(batchSize, firstBatchResults);
      
    } catch (error) {
      console.error('Error running deep audit for all free zones:', error);
      toast({
        title: "Deep Audit Failed",
        description: "An error occurred while starting the deep audit. Please try again.",
        variant: "destructive"
      });
      setIsRunningDeepAudit(false);
    }
  };
  
  // Select all missing fields for all free zones
  const selectAllMissingFields = () => {
    if (!deepAuditAllResults) return;
    
    const allSelections = deepAuditAllResults.auditResults
      .filter(auditResult => !auditResult.error) // Skip free zones with errors
      .map(auditResult => {
        const missingFields = auditResult.result?.existingData?.fieldsMissing || [];
        return {
          freeZoneId: auditResult.freeZoneId,
          fields: missingFields
        };
      })
      .filter(item => item.fields.length > 0); // Only include free zones with missing fields
    
    setSelectedAuditResults(allSelections);
    
    toast({
      title: "All Missing Fields Selected",
      description: `Selected ${allSelections.reduce((total, item) => total + item.fields.length, 0)} fields across ${allSelections.length} free zones.`
    });
  };
  
  // Clear all selected fields
  const clearAllSelections = () => {
    setSelectedAuditResults([]);
    
    toast({
      title: "Selections Cleared",
      description: "All field selections have been cleared."
    });
  };
  
  // Toggle a field selection for a free zone
  const toggleFieldSelection = (freeZoneId: number, field: string) => {
    const existingFreeZone = selectedAuditResults.find(item => item.freeZoneId === freeZoneId);
    
    if (existingFreeZone) {
      // Free zone already exists in selection
      if (existingFreeZone.fields.includes(field)) {
        // Remove field if already selected
        setSelectedAuditResults(prevResults => 
          prevResults.map(item => 
            item.freeZoneId === freeZoneId
              ? { ...item, fields: item.fields.filter(f => f !== field) }
              : item
          ).filter(item => item.fields.length > 0) // Remove free zone if no fields selected
        );
      } else {
        // Add field to existing free zone
        setSelectedAuditResults(prevResults => 
          prevResults.map(item => 
            item.freeZoneId === freeZoneId
              ? { ...item, fields: [...item.fields, field] }
              : item
          )
        );
      }
    } else {
      // Add new free zone with field
      setSelectedAuditResults(prevResults => 
        [...prevResults, { freeZoneId, fields: [field] }]
      );
    }
  };
  
  // Select all fields for a specific free zone
  const selectAllFieldsForFreeZone = (freeZoneId: number) => {
    if (!deepAuditAllResults) return;
    
    const auditResult = deepAuditAllResults.auditResults.find(result => result.freeZoneId === freeZoneId);
    if (!auditResult || auditResult.error) return;
    
    const missingFields = auditResult.result?.existingData?.fieldsMissing || [];
    if (missingFields.length === 0) return;
    
    // Check if this free zone is already in the selection
    const existingFreeZone = selectedAuditResults.find(item => item.freeZoneId === freeZoneId);
    
    if (existingFreeZone) {
      // Update the existing entry to include all missing fields
      setSelectedAuditResults(prevResults => 
        prevResults.map(item => 
          item.freeZoneId === freeZoneId
            ? { ...item, fields: missingFields }
            : item
        )
      );
    } else {
      // Add a new entry with all missing fields
      setSelectedAuditResults(prevResults => 
        [...prevResults, { freeZoneId, fields: missingFields }]
      );
    }
    
    toast({
      title: "Free Zone Fields Selected",
      description: `Selected ${missingFields.length} fields for ${auditResult.freeZoneName}.`
    });
  };
  
  // Deselect all fields for a specific free zone
  const deselectAllFieldsForFreeZone = (freeZoneId: number) => {
    // Remove the free zone from selection completely
    setSelectedAuditResults(prevResults => 
      prevResults.filter(item => item.freeZoneId !== freeZoneId)
    );
    
    const freeZoneName = deepAuditAllResults?.auditResults.find(r => r.freeZoneId === freeZoneId)?.freeZoneName || "Free Zone";
    
    toast({
      title: "Fields Deselected",
      description: `Deselected all fields for ${freeZoneName}.`
    });
  };
  
  // Create tasks from selected audit results
  const createTasksFromAudit = async () => {
    if (selectedAuditResults.length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please select at least one field to create tasks.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingTasks(true);
    
    try {
      // Prepare the data with only the necessary information to reduce payload size
      const selectedFields = selectedAuditResults.flatMap(item => {
        // Get the free zone name from the audit results
        const freeZone = deepAuditAllResults?.auditResults.find(
          result => result.freeZoneId === item.freeZoneId
        );
        
        return item.fields.map(field => ({
          freeZoneId: item.freeZoneId,
          freeZoneName: freeZone?.freeZoneName || '',
          field
        }));
      });
      
      // Send only the selected fields to create tasks, not the full audit results
      const response = await axios.post('/api/ai-pm/create-tasks-from-audit', {
        selectedFields: selectedFields
      });
      
      const result = response.data;
      
      if (result.success) {
        // Refresh tasks list
        refetchTasks();
        
        // Reset selections
        setSelectedAuditResults([]);
        
        toast({
          title: "Tasks Created",
          description: `Successfully created ${result.createdTasks.length} tasks from audit results.`,
        });
      } else {
        toast({
          title: "Error Creating Tasks",
          description: result.message || "Failed to create tasks from audit results.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating tasks from audit:', error);
      toast({
        title: "Error Creating Tasks",
        description: "An error occurred while creating tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTasks(false);
    }
  };
  
  // Format field name for display
  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (autoInterval) {
        clearInterval(autoInterval);
      }
    };
  }, [autoInterval]);
  
  // Auto mode status text
  const getAutoModeStatus = () => {
    if (autoMode) {
      return "Auto mode enabled - Enriching every 10 minutes";
    } else {
      return "Auto mode disabled";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Intelligent Data Enrichment</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchTasks();
              refetchMetrics();
            }}
            disabled={isLoadingTasks || executeEnrichmentMutation.isPending || runWorkflowMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <div className={`h-2 w-2 rounded-full mr-2 ${autoMode ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-xs text-muted-foreground">{getAutoModeStatus()}</span>
            </div>
            <Button 
              onClick={toggleAutoMode}
              variant={autoMode ? "destructive" : "default"}
              disabled={executeEnrichmentMutation.isPending || runWorkflowMutation.isPending}
              className="w-full"
            >
              {autoMode ? (
                <>
                  <PauseIcon className="mr-2 h-4 w-4" />
                  Stop Auto Mode
                </>
              ) : (
                <>
                  <PlayIcon className="mr-2 h-4 w-4" />
                  Start Auto Mode
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Enrichment Tasks</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Controls</TabsTrigger>
          <TabsTrigger value="deepAudit">Deep Audit</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prioritized Enrichment Tasks</CardTitle>
              <CardDescription>
                These tasks are intelligently sorted by priority based on importance, status, and confidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Loading tasks..." />
                </div>
              ) : tasks?.tasks && tasks.tasks.length > 0 ? (
                <div className="space-y-4">
                  {/* Global Select All / Clear All controls */}
                  <div className="flex justify-end gap-2 mb-2">
                    <Button 
                      onClick={selectAllTasks}
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1"
                    >
                      <CheckIcon className="mr-1 h-3 w-3" />
                      Select All Tasks
                    </Button>
                    <Button 
                      onClick={clearAllTaskSelections}
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1"
                    >
                      <XIcon className="mr-1 h-3 w-3" />
                      Clear All
                    </Button>
                  </div>
                  <div className="border rounded-md divide-y">
                    <div className="grid grid-cols-12 p-3 font-medium bg-muted/50">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-3">Free Zone</div>
                      <div className="col-span-2">Field</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Confidence</div>
                      <div className="col-span-2">Priority</div>
                    </div>
                  
                    {/* Group tasks by free zone */}
                    {Object.entries(tasks.tasks.reduce((groups: {[key: string]: {id: number, name: string, tasks: EnrichmentTask[]}}, task: EnrichmentTask) => {
                      const key = `${task.freeZoneId}`;
                      if (!groups[key]) {
                        groups[key] = {
                          id: task.freeZoneId,
                          name: task.freeZoneName,
                          tasks: []
                        };
                      }
                      groups[key].tasks.push(task);
                      return groups;
                    }, {})).map(([freeZoneKey, freeZoneGroup]) => (
                      <div key={freeZoneKey.toString()} className="task-group-container">
                        {/* Free Zone header with select/deselect controls */}
                        <div className="grid grid-cols-12 p-2 bg-muted/30 items-center">
                          <div className="col-span-1"></div>
                          <div className="col-span-11 flex items-center justify-between">
                            <span className="font-medium">{freeZoneGroup.name}</span>
                            <div className="flex gap-1">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  selectAllTasksForFreeZone(freeZoneGroup.id, freeZoneGroup.name);
                                }}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                Select All
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  deselectAllTasksForFreeZone(freeZoneGroup.id, freeZoneGroup.name);
                                }}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Tasks for this free zone */}
                        {freeZoneGroup.tasks.map((task: EnrichmentTask) => (
                          <div key={`${task.freeZoneId}-${task.field}`} className="grid grid-cols-12 p-3 items-center">
                            <div className="col-span-1">
                              <Checkbox 
                                checked={selectedTasks.some(t => 
                                  t.freeZoneId === task.freeZoneId && t.field === task.field
                                )}
                                onCheckedChange={() => toggleTaskSelection(task)}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="col-span-3 truncate">{task.freeZoneName}</div>
                            <div className="col-span-2 capitalize">{task.field.replace(/_/g, ' ')}</div>
                            <div className="col-span-2">
                              <Badge variant={task.status === 'missing' ? "destructive" : "outline"}>
                                {task.status}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              {Math.round(task.confidence * 100)}%
                            </div>
                            <div className="col-span-2">
                              <span className={`px-2 py-1 rounded-full text-xs text-white ${getPriorityColor(task.priority)}`}>
                                {formatPriority(task.priority)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No enrichment tasks available. All fields may be complete or no analysis has been run.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {selectedTasks.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedTasks.length} task(s) selected
                  </span>
                )}
              </div>
              <Button 
                onClick={executeSelectedTasks}
                disabled={selectedTasks.length === 0 || executeEnrichmentMutation.isPending}
              >
                {executeEnrichmentMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Execute Selected
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Workflow</CardTitle>
              <CardDescription>
                Run the intelligent enrichment workflow to automatically process the highest priority tasks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="batchSize" className="text-right">
                    Batch Size:
                  </label>
                  <input
                    id="batchSize"
                    type="number"
                    min="1"
                    max="10"
                    value={batchSize}
                    onChange={e => setBatchSize(parseInt(e.target.value))}
                    className="col-span-3 p-2 border rounded-md"
                  />
                </div>
              </div>
              
              <Alert>
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertTitle>Processing Time Warning</AlertTitle>
                <AlertDescription>
                  Each enrichment task involves web research and AI analysis, which may take 10-30 seconds per task.
                  Larger batch sizes will take longer to complete.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runWorkflow}
                disabled={runWorkflowMutation.isPending || executeEnrichmentMutation.isPending}
                className="w-full"
              >
                {runWorkflowMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Running Workflow...
                  </>
                ) : (
                  <>
                    <PlayIcon className="mr-2 h-4 w-4" />
                    Run Enrichment Workflow
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Deep Audit Tab */}
        <TabsContent value="deepAudit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deep Audit All Free Zones</CardTitle>
              <CardDescription>
                Run a comprehensive audit of all free zones to compare database information with official websites.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deepAuditAllResults ? (
                <div className="text-center py-8">
                  {isRunningDeepAudit ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
                      <p className="text-muted-foreground">Running deep audit on all free zones. This may take several minutes...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <DatabaseIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div className="max-w-md mx-auto">
                        <p className="mb-4">Run a deep audit to compare database information with the official websites and identify gaps or inconsistencies across all free zones.</p>
                        <Button 
                          onClick={runDeepAuditAllFreeZones} 
                          disabled={isRunningDeepAudit}
                          className="mx-auto"
                        >
                          <DatabaseIcon className="mr-2 h-4 w-4" />
                          Run Deep Audit on All Free Zones
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium">
                        Audit Results
                        <span className="ml-2 text-sm text-muted-foreground">
                          {new Date(deepAuditAllResults.timestamp).toLocaleString()}
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Processed {deepAuditAllResults.auditResults.length} free zones
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={runDeepAuditAllFreeZones}
                        disabled={isRunningDeepAudit}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Audit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={selectAllMissingFields}
                        disabled={isRunningDeepAudit}
                        className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                      >
                        <CheckIcon className="mr-2 h-4 w-4" />
                        Select All
                      </Button>
                      {selectedAuditResults.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={clearAllSelections}
                          className="text-red-600"
                        >
                          Clear All
                        </Button>
                      )}
                      <Button
                        onClick={createTasksFromAudit}
                        disabled={selectedAuditResults.length === 0 || isCreatingTasks}
                      >
                        {isCreatingTasks ? (
                          <>
                            <div className="mr-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            Creating Tasks...
                          </>
                        ) : (
                          <>
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Create Tasks from Selected Fields
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-md divide-y">
                    <div className="grid grid-cols-12 p-3 font-medium bg-muted/50">
                      <div className="col-span-3">Free Zone</div>
                      <div className="col-span-2">Completeness</div>
                      <div className="col-span-7 flex justify-between items-center">
                        <span>Missing Fields</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedAuditResults.reduce((total, item) => total + item.fields.length, 0)} fields selected
                        </span>
                      </div>
                    </div>
                    
                    {deepAuditAllResults.auditResults.map((auditResult) => {
                      // Find missing fields
                      const missingFields = auditResult.result?.existingData?.fieldsMissing || [];
                      
                      const isSelected = (field: string) => {
                        const selectedFreeZone = selectedAuditResults.find(
                          item => item.freeZoneId === auditResult.freeZoneId
                        );
                        return selectedFreeZone ? selectedFreeZone.fields.includes(field) : false;
                      };
                      
                      return (
                        <div key={auditResult.freeZoneId} className="grid grid-cols-12 p-3">
                          <div className="col-span-3 flex items-center gap-2">
                            <span className="font-medium">{auditResult.freeZoneName}</span>
                            {!auditResult.error && missingFields.length > 0 && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    selectAllFieldsForFreeZone(auditResult.freeZoneId);
                                  }}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  Select All
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deselectAllFieldsForFreeZone(auditResult.freeZoneId);
                                  }}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="col-span-2">
                            {auditResult.error ? (
                              <Badge variant="destructive">Error</Badge>
                            ) : (
                              <div className="flex items-center">
                                <Progress value={auditResult.result.existingData.completenessScore * 100} className="w-16 h-2 mr-2" />
                                <span>{Math.round(auditResult.result.existingData.completenessScore * 100)}%</span>
                              </div>
                            )}
                          </div>
                          <div className="col-span-7">
                            {auditResult.error ? (
                              <span className="text-red-500 text-sm">{auditResult.error}</span>
                            ) : missingFields.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {missingFields.map((field) => (
                                  <label 
                                    key={field} 
                                    className="flex items-center gap-2 p-2 rounded border hover:bg-muted cursor-pointer"
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected(field)}
                                      onChange={() => toggleFieldSelection(auditResult.freeZoneId, field)}
                                      className="h-4 w-4"
                                    />
                                    <span>{formatFieldName(field)}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-500">No missing fields</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedAuditResults.length > 0 && (
                    <div className="bg-muted/30 p-4 rounded-md">
                      <h4 className="font-medium mb-2">Selected Fields ({selectedAuditResults.reduce((sum, item) => sum + item.fields.length, 0)})</h4>
                      <div className="space-y-2">
                        {selectedAuditResults.map((item) => {
                          const freeZone = deepAuditAllResults.auditResults.find(
                            result => result.freeZoneId === item.freeZoneId
                          );
                          
                          return (
                            <div key={item.freeZoneId} className="flex flex-wrap items-center gap-2">
                              <span className="font-medium mr-2">{freeZone?.freeZoneName}:</span>
                              {item.fields.map((field) => (
                                <Badge
                                  key={field}
                                  variant="default"
                                  className="cursor-pointer flex items-center"
                                  onClick={() => toggleFieldSelection(item.freeZoneId, field)}
                                >
                                  {formatFieldName(field)}
                                  <span className="ml-1 text-xs">×</span>
                                </Badge>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Performance Metrics</CardTitle>
              <CardDescription>
                Insights and statistics about the enrichment process and data quality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-label="Loading metrics..." />
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{metrics.totalEnrichments}</div>
                      <div className="text-sm text-muted-foreground">Total Enrichments</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{(metrics.successRate * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{Math.round(metrics.avgContentLength)}</div>
                      <div className="text-sm text-muted-foreground">Avg. Content Length</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{metrics.timeStats.last24Hours}</div>
                      <div className="text-sm text-muted-foreground">Last 24 Hours</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">Most Enriched Fields</h3>
                      <ul className="space-y-1">
                        {metrics.mostEnrichedFields.length > 0 ? (
                          metrics.mostEnrichedFields.map((field, index) => (
                            <li key={index} className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                              <span className="capitalize">{field.replace(/_/g, ' ')}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-muted-foreground">No data available yet</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Most Enriched Free Zones</h3>
                      <ul className="space-y-1">
                        {metrics.mostEnrichedFreeZones.length > 0 ? (
                          metrics.mostEnrichedFreeZones.map((freeZone, index) => (
                            <li key={index} className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                              {freeZone}
                            </li>
                          ))
                        ) : (
                          <li className="text-muted-foreground">No data available yet</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {metrics.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <BookOpenIcon className="h-5 w-5 mr-2 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No metrics available. Start the enrichment workflow to generate performance data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Confirmation Dialog for Large Task Selections */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warning: Large Task Selection</DialogTitle>
            <DialogDescription>
              You've selected {tasksToConfirm?.tasks.length || 0} tasks, which may take a long time to process and could cause timeouts. 
              It's recommended to process no more than 10 tasks at once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-amber-600">
            <AlertTriangleIcon className="h-6 w-6 inline-block mr-2" />
            <span>Processing too many tasks at once can lead to performance issues or timeouts.</span>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmationDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => tasksToConfirm && executeEnrichmentTasksWithBatchSize(tasksToConfirm.tasks, tasksToConfirm.batchSize)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}