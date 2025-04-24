import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  BarChart4,
  Bot,
  BotMessageSquare,
  Brain,
  Download,
  FileSearch,
  Globe,
  HardDrive,
  Layers,
  Lightbulb,
  Loader2,
  Wand2 as MagicWand, // Using Wand2 as MagicWand is not in lucide-react
  RefreshCw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface AnalysisField {
  field: string;
  status: 'missing' | 'incomplete' | 'complete';
  confidence: number;
  recommendation?: string;
}

interface AnalysisResult {
  freeZoneId: number;
  freeZoneName: string;
  fields: AnalysisField[];
  overallCompleteness: number;
  recommendedActions: string[];
}

interface SearchResult {
  query: string;
  results: {
    title: string;
    url: string;
    snippet: string;
  }[];
  success: boolean;
  error?: string;
}

// Main Product Manager Page Component
export default function AIProductManagerPage() {
  const { toast } = useToast();
  const [selectedFreeZoneId, setSelectedFreeZoneId] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [contentType, setContentType] = useState<'general' | 'setup' | 'costs'>('general');
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  
  // Fetch free zones for selection
  const { data: freeZones, isLoading: isLoadingFreeZones } = useQuery({
    queryKey: ['/api/free-zones'],
  });
  
  // Analyze a specific free zone
  const { 
    data: analysisResults, 
    isLoading: isAnalyzing,
    refetch: refetchAnalysis
  } = useQuery({
    queryKey: ['/api/ai-pm/analyze', selectedFreeZoneId],
    queryFn: async () => {
      if (!selectedFreeZoneId) return null;
      const response = await apiRequest('GET', `/api/ai-pm/analyze/${selectedFreeZoneId}`);
      return response.json();
    },
    enabled: selectedFreeZoneId !== null,
  });
  
  // Mutation for data enrichment
  const enrichMutation = useMutation({
    mutationFn: async ({ freeZoneId, field }: { freeZoneId: number, field: string }) => {
      const response = await apiRequest('POST', `/api/ai-pm/enrich/${freeZoneId}`, { field });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Data Enriched',
        description: 'The free zone data has been enriched successfully.',
      });
      refetchAnalysis();
    },
    onError: (error) => {
      toast({
        title: 'Enrichment Failed',
        description: error instanceof Error ? error.message : 'An error occurred during data enrichment.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for web search
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('GET', `/api/ai-pm/search?q=${encodeURIComponent(query)}`);
      return response.json() as Promise<SearchResult>;
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: 'Search Partial Results',
          description: data.error || 'Search completed but with some issues.',
          variant: 'default',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'An error occurred during web search.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for URL scraping
  const scrapeMutation = useMutation({
    mutationFn: async ({ url, type }: { url: string, type: 'general' | 'setup' | 'costs' }) => {
      const response = await apiRequest('POST', '/api/ai-pm/scrape-url', { url, contentType: type });
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: 'Scraping Failed',
          description: data.error || 'Failed to extract content from the URL.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'URL Scraped Successfully',
          description: `Extracted ${data.content.length} characters of content.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Scraping Failed',
        description: error instanceof Error ? error.message : 'An error occurred during URL scraping.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutation for combined search and scrape
  const searchAndScrapeMutation = useMutation({
    mutationFn: async ({ query, type, maxResults }: { query: string, type: 'general' | 'setup' | 'costs', maxResults: number }) => {
      const response = await apiRequest('POST', '/api/ai-pm/search-and-scrape', { 
        query, 
        contentType: type, 
        maxResults
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.searchResults.success) {
        toast({
          title: 'Search Issues',
          description: data.searchResults.error || 'Search completed but with some issues.',
          variant: 'default',
        });
      }
      
      if (data.scrapedContent.length === 0) {
        toast({
          title: 'No Content Extracted',
          description: 'Could not extract content from any of the search results.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Research Completed',
          description: `Extracted content from ${data.scrapedContent.length} sources.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Research Failed',
        description: error instanceof Error ? error.message : 'An error occurred during the research process.',
        variant: 'destructive',
      });
    }
  });
  
  // Get product recommendations
  const { 
    data: recommendations, 
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['/api/ai-pm/recommendations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai-pm/recommendations');
      const data = await response.json();
      return data.recommendations;
    },
  });
  
  // Mutation for running the complete product manager cycle
  const cycleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai-pm/run-cycle');
      return response.json();
    },
    onSuccess: (data) => {
      setIsRunningCycle(false);
      toast({
        title: 'Product Manager Cycle Completed',
        description: `Analyzed ${data.analysis.length} free zones, enhanced ${data.enhancements.length} fields.`,
      });
      // Refresh data after cycle
      refetchAnalysis();
      refetchRecommendations();
    },
    onError: (error) => {
      setIsRunningCycle(false);
      toast({
        title: 'Cycle Failed',
        description: error instanceof Error ? error.message : 'An error occurred during the product manager cycle.',
        variant: 'destructive',
      });
    }
  });
  
  // Handle running full cycle
  const handleRunCycle = () => {
    setIsRunningCycle(true);
    cycleMutation.mutate();
  };
  
  // Handle enriching data for a field
  const handleEnrichField = (field: string) => {
    if (!selectedFreeZoneId) {
      toast({
        title: 'Selection Required',
        description: 'Please select a free zone first.',
        variant: 'destructive',
      });
      return;
    }
    
    enrichMutation.mutate({ 
      freeZoneId: selectedFreeZoneId, 
      field 
    });
  };
  
  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a search query.',
        variant: 'destructive',
      });
      return;
    }
    
    searchMutation.mutate(searchQuery);
  };
  
  // Handle URL scraping
  const handleScrapeUrl = () => {
    if (!scrapeUrl.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a URL to scrape.',
        variant: 'destructive',
      });
      return;
    }
    
    scrapeMutation.mutate({ 
      url: scrapeUrl, 
      type: contentType 
    });
  };
  
  // Handle combined search and scrape
  const handleSearchAndScrape = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a search query.',
        variant: 'destructive',
      });
      return;
    }
    
    searchAndScrapeMutation.mutate({ 
      query: searchQuery, 
      type: contentType, 
      maxResults: 3 
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" /> 
            AI Product Manager
          </h1>
          <p className="text-muted-foreground">
            Analyze data completeness, identify gaps, and enhance platform content
          </p>
        </div>
        <Button 
          onClick={handleRunCycle} 
          disabled={isRunningCycle}
          className="gap-2"
        >
          {isRunningCycle ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MagicWand className="h-4 w-4" />
          )}
          Run Complete Cycle
        </Button>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <BarChart4 className="h-4 w-4" /> 
            Analyze
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> 
            Research
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> 
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> 
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analyze">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Select Free Zone</CardTitle>
                <CardDescription>
                  Choose a free zone to analyze its data completeness
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFreeZones ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Select
                    value={selectedFreeZoneId?.toString() || ""}
                    onValueChange={(value) => setSelectedFreeZoneId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a free zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {freeZones?.map((freeZone: any) => (
                        <SelectItem key={freeZone.id} value={freeZone.id.toString()}>
                          {freeZone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <div className="mt-6">
                  <Button 
                    onClick={() => refetchAnalysis()} 
                    disabled={!selectedFreeZoneId || isAnalyzing} 
                    variant="outline" 
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Analyze Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Data Analysis Results</CardTitle>
                <CardDescription>
                  {analysisResults ? (
                    <div className="flex justify-between items-center">
                      <span>{analysisResults.freeZoneName} - Data Completeness Analysis</span>
                      <Badge className={`
                        ${analysisResults.overallCompleteness > 80 ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                        analysisResults.overallCompleteness > 50 ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                        "bg-red-100 text-red-800 hover:bg-red-100"}
                      `}>
                        {analysisResults.overallCompleteness.toFixed(1)}% Complete
                      </Badge>
                    </div>
                  ) : (
                    "Select a free zone to see analysis results"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p>Analyzing data completeness...</p>
                  </div>
                ) : analysisResults ? (
                  <div className="space-y-6">
                    {/* Enhanced progress display with breakdown */}
                    <div className="space-y-4">
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Data Completeness</span>
                        <span className="font-semibold">{analysisResults.overallCompleteness.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={analysisResults.overallCompleteness} 
                        className="h-3"
                      />
                      
                      {/* Field status summary */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="rounded-md bg-green-50 p-2 text-center">
                          <div className="text-xs text-green-600 font-medium">Complete</div>
                          <div className="text-lg font-bold text-green-700">
                            {analysisResults.fields.filter(f => f.status === 'complete').length}
                            <span className="text-xs ml-1 font-normal">/ {analysisResults.fields.length}</span>
                          </div>
                        </div>
                        <div className="rounded-md bg-amber-50 p-2 text-center">
                          <div className="text-xs text-amber-600 font-medium">Incomplete</div>
                          <div className="text-lg font-bold text-amber-700">
                            {analysisResults.fields.filter(f => f.status === 'incomplete').length}
                            <span className="text-xs ml-1 font-normal">/ {analysisResults.fields.length}</span>
                          </div>
                        </div>
                        <div className="rounded-md bg-red-50 p-2 text-center">
                          <div className="text-xs text-red-600 font-medium">Missing</div>
                          <div className="text-lg font-bold text-red-700">
                            {analysisResults.fields.filter(f => f.status === 'missing').length}
                            <span className="text-xs ml-1 font-normal">/ {analysisResults.fields.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md mt-4">
                      <div className="py-2 px-4 bg-muted font-medium text-sm">Field Status Details</div>
                      <div className="divide-y">
                        {analysisResults.fields.map((field) => (
                          <div 
                            key={field.field} 
                            className="grid grid-cols-5 items-center p-3"
                          >
                            <div className="col-span-2 font-medium capitalize">
                              {field.field ? field.field.replace(/_/g, ' ') : 'Unknown field'}
                            </div>
                            <div className="col-span-1 flex items-center">
                              <Badge 
                                className={`
                                  ${field.status === 'complete' ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                                    field.status === 'incomplete' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                                    "bg-red-100 text-red-800 hover:bg-red-100"}
                                `}
                              >
                                {field.status} 
                                {field.confidence && 
                                  <span className="ml-1 opacity-70">({(field.confidence * 100).toFixed(0)}%)</span>
                                }
                              </Badge>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              {field.status !== 'complete' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEnrichField(field.field)}
                                  disabled={enrichMutation.isPending}
                                  className="gap-1"
                                >
                                {enrichMutation.isPending && enrichMutation.variables?.field === field.field ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3 mr-1" />
                                )}
                                Enrich
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {analysisResults.recommendedActions.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-2">Recommended Actions:</h3>
                        <ul className="space-y-1 text-sm">
                          {analysisResults.recommendedActions.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary mr-2">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileSearch className="h-16 w-16 mb-4 opacity-20" />
                    <p>Select a free zone and run analysis to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Web Research
                </CardTitle>
                <CardDescription>
                  Search the web for information to enrich free zone data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-query">Search Query</Label>
                    <Input
                      id="search-query"
                      placeholder="e.g., DMCC license types and fees"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={contentType}
                      onValueChange={(value) => setContentType(value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Information</SelectItem>
                        <SelectItem value="setup">Setup Process</SelectItem>
                        <SelectItem value="costs">Costs & Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button 
                      onClick={handleSearch}
                      disabled={searchMutation.isPending || !searchQuery.trim()}
                      variant="outline"
                      className="flex-1"
                    >
                      {searchMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Search Only
                    </Button>

                    <Button 
                      onClick={handleSearchAndScrape}
                      disabled={searchAndScrapeMutation.isPending || !searchQuery.trim()}
                      className="flex-1"
                    >
                      {searchAndScrapeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4 mr-2" />
                      )}
                      Research
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  URL Scraper
                </CardTitle>
                <CardDescription>
                  Extract information from a specific website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scrape-url">Website URL</Label>
                    <Input
                      id="scrape-url"
                      placeholder="e.g., https://www.dmcc.ae/free-zone/costs"
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={contentType}
                      onValueChange={(value) => setContentType(value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Information</SelectItem>
                        <SelectItem value="setup">Setup Process</SelectItem>
                        <SelectItem value="costs">Costs & Fees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleScrapeUrl}
                    disabled={scrapeMutation.isPending || !scrapeUrl.trim()}
                    className="w-full"
                  >
                    {scrapeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Scrape Website
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(searchMutation.data || searchAndScrapeMutation.data || scrapeMutation.data) && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Research Results</CardTitle>
                  <CardDescription>
                    Search results and extracted content
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  {/* Search Results */}
                  {(searchMutation.data || searchAndScrapeMutation.data?.searchResults) && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">Search Results</h3>
                      <div className="space-y-4">
                        {(searchMutation.data?.results || searchAndScrapeMutation.data?.searchResults.results || []).map((result, index) => (
                          <div key={index} className="p-3 border rounded-md">
                            <h4 className="font-medium text-primary">{result.title}</h4>
                            <a href={result.url} target="_blank" rel="noopener noreferrer" 
                               className="text-xs text-muted-foreground block mb-2 truncate hover:underline">
                              {result.url}
                            </a>
                            <p className="text-sm">{result.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scraped Content */}
                  {(scrapeMutation.data?.success || searchAndScrapeMutation.data?.scrapedContent?.length > 0) && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Extracted Content</h3>
                      
                      {/* Single URL scraping result */}
                      {scrapeMutation.data?.success && (
                        <div className="p-4 border rounded-md mb-4">
                          <h4 className="font-medium">{scrapeMutation.data.title}</h4>
                          <a href={scrapeMutation.data.url} target="_blank" rel="noopener noreferrer" 
                             className="text-xs text-muted-foreground block mb-2 hover:underline">
                            {scrapeMutation.data.url}
                          </a>
                          <Separator className="my-2" />
                          <div className="mt-2 text-sm max-h-64 overflow-y-auto">
                            {scrapeMutation.data.content.split('\n').map((paragraph, idx) => (
                              <p key={idx} className="mb-2">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Combined search & scrape results */}
                      {searchAndScrapeMutation.data?.scrapedContent?.map((content, index) => (
                        <div key={index} className="p-4 border rounded-md mb-4">
                          <h4 className="font-medium">{content.title}</h4>
                          <a href={content.url} target="_blank" rel="noopener noreferrer" 
                             className="text-xs text-muted-foreground block mb-2 hover:underline">
                            {content.url}
                          </a>
                          <Separator className="my-2" />
                          <div className="mt-2 text-sm max-h-64 overflow-y-auto">
                            {content.content.split('\n').map((paragraph, idx) => (
                              <p key={idx} className="mb-2">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Product Recommendations
              </CardTitle>
              <CardDescription>
                AI-generated recommendations based on data analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecommendations ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p>Generating product recommendations...</p>
                </div>
              ) : recommendations?.length > 0 ? (
                <div className="space-y-6">
                  {recommendations.map((recommendation, index) => (
                    <div key={index} className="flex space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-base">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    onClick={() => refetchRecommendations()} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Recommendations
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Lightbulb className="h-16 w-16 mb-4 opacity-20" />
                  <p>No recommendations available</p>
                  <Button 
                    onClick={() => refetchRecommendations()} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Generate Recommendations
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Activity Logs
              </CardTitle>
              <CardDescription>
                Track AI Product Manager activities and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">This feature is coming soon</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  disabled
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}