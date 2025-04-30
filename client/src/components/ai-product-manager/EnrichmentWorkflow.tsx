import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckIcon, RefreshCw, DownloadIcon, BookOpenIcon, AlertTriangleIcon, PlayIcon, PauseIcon } from "lucide-react";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-performance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/logs'] });
      toast({
        title: "Enrichment complete",
        description: "Selected tasks have been processed successfully",
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
      queryClient.invalidateQueries({ queryKey: ['/api/ai-pm/enrichment-tasks'] });
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

  // Execute selected tasks
  const executeSelectedTasks = () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to execute",
        variant: "destructive"
      });
      return;
    }

    executeEnrichmentMutation.mutate({ 
      tasks: selectedTasks, 
      batchSize: selectedTasks.length 
    });
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
      const interval = setInterval(() => {
        runWorkflowMutation.mutate({ batchSize });
      }, 1000 * 60 * 10); // Run every 10 minutes
      
      setAutoInterval(interval);
      setAutoMode(true);
      
      // Run immediately
      runWorkflowMutation.mutate({ batchSize });
      
      toast({
        title: "Auto mode enabled",
        description: "Automatic enrichment will run every 10 minutes",
      });
    }
  };

  // Clean up interval on component unmount
  useState(() => {
    return () => {
      if (autoInterval) {
        clearInterval(autoInterval);
      }
    };
  });

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
          <Button 
            onClick={toggleAutoMode}
            variant={autoMode ? "destructive" : "default"}
            disabled={executeEnrichmentMutation.isPending || runWorkflowMutation.isPending}
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

      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Enrichment Tasks</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Controls</TabsTrigger>
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
                  <div className="border rounded-md divide-y">
                    <div className="grid grid-cols-12 p-3 font-medium bg-muted/50">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-3">Free Zone</div>
                      <div className="col-span-2">Field</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Confidence</div>
                      <div className="col-span-2">Priority</div>
                    </div>
                    
                    {tasks.tasks.map((task: EnrichmentTask) => (
                      <div key={`${task.freeZoneId}-${task.field}`} className="grid grid-cols-12 p-3 items-center">
                        <div className="col-span-1">
                          <input 
                            type="checkbox"
                            checked={selectedTasks.some(t => 
                              t.freeZoneId === task.freeZoneId && t.field === task.field
                            )}
                            onChange={() => toggleTaskSelection(task)}
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
    </div>
  );
}