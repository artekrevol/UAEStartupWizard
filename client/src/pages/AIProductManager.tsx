import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  AlertCircle,
  Search,
  FileSearch,
  Database,
  Globe,
  RefreshCw,
  BarChart,
  ArrowUpRight,
  Sparkles,
  FileQuestion,
  List,
  Clock
} from "lucide-react";

// Define types for the data we'll be working with
interface AnalysisField {
  field: string;
  status: 'missing' | 'incomplete' | 'complete';
  confidence: number;
  recommendation?: string;
}

interface FreeZoneAnalysis {
  freeZoneId: number;
  freeZoneName: string;
  fields: AnalysisField[];
  overallCompleteness: number;
  recommendedActions: string[];
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

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface ScrapeResult {
  title: string;
  content: string;
  metadata: any;
}

interface SearchAndScrapeResult {
  query: string;
  results: {
    title: string;
    url: string;
    content: string;
  }[];
  summary: string;
}

interface LogEntry {
  id: number;
  type: string;
  component: string;
  message: string;
  severity: string;
  created_at: string;
  metadata: any;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    complete: "bg-green-100 text-green-800 border-green-200",
    incomplete: "bg-yellow-100 text-yellow-800 border-yellow-200",
    missing: "bg-red-100 text-red-800 border-red-200",
  };
  
  const iconMap: Record<string, React.ReactNode> = {
    complete: <CheckCircle className="h-4 w-4 mr-1" />,
    incomplete: <AlertCircle className="h-4 w-4 mr-1" />,
    missing: <FileQuestion className="h-4 w-4 mr-1" />,
  };

  const color = colorMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {iconMap[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ConfidenceIndicator: React.FC<{ confidence: number }> = ({ confidence }) => {
  let color = "bg-gray-200";
  
  if (confidence >= 0.7) {
    color = "bg-green-500";
  } else if (confidence >= 0.4) {
    color = "bg-yellow-500";
  } else {
    color = "bg-red-500";
  }
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
      <div className={`${color} h-2.5 rounded-full`} style={{ width: `${confidence * 100}%` }}></div>
      <div className="text-xs text-gray-500 mt-1">{Math.round(confidence * 100)}% Confidence</div>
    </div>
  );
};

const AIProductManager: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("analyze");
  const [freeZones, setFreeZones] = useState<any[]>([]);
  const [selectedFreeZone, setSelectedFreeZone] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<FreeZoneAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<FreeZoneAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [url, setUrl] = useState("");
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [searchAndScrapeQuery, setSearchAndScrapeQuery] = useState("");
  const [searchAndScrapeResults, setSearchAndScrapeResults] = useState<SearchAndScrapeResult | null>(null);
  const [isSearchAndScraping, setIsSearchAndScraping] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isCycleRunning, setIsCycleRunning] = useState(false);
  const [cycleResults, setCycleResults] = useState<any | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Fetch free zones on component mount
  useEffect(() => {
    const fetchFreeZones = async () => {
      try {
        const response = await axios.get('/api/free-zones');
        setFreeZones(response.data);
        
        if (response.data.length > 0) {
          setSelectedFreeZone(response.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching free zones:', error);
        toast({
          title: "Error",
          description: "Failed to fetch free zones. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchFreeZones();
    fetchLogs();
  }, []);
  
  // Analyze a single free zone
  const analyzeFreeZone = async () => {
    if (!selectedFreeZone) {
      toast({
        title: "Error",
        description: "Please select a free zone to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await axios.get(`/api/ai-pm/analyze/${selectedFreeZone}`);
      const result = response.data;
      
      // Add to or update existing analysis results
      setAnalysisResults(prev => {
        const existing = prev.find(item => item.freeZoneId === result.freeZoneId);
        
        if (existing) {
          return prev.map(item => 
            item.freeZoneId === result.freeZoneId ? result : item
          );
        } else {
          return [...prev, result];
        }
      });
      
      setSelectedAnalysis(result);
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${result.freeZoneName} with ${result.overallCompleteness.toFixed(2)}% completeness.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error analyzing free zone:', error);
      toast({
        title: "Error",
        description: "Failed to analyze free zone. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Analyze all free zones
  const analyzeAllFreeZones = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await axios.get('/api/ai-pm/analyze-all');
      const results = response.data;
      
      setAnalysisResults(results);
      
      if (results.length > 0) {
        setSelectedAnalysis(results[0]);
      }
      
      const averageCompleteness = results.reduce((sum: number, result: FreeZoneAnalysis) => 
        sum + result.overallCompleteness, 0) / results.length;
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${results.length} free zones with average ${averageCompleteness.toFixed(2)}% completeness.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error analyzing all free zones:', error);
      toast({
        title: "Error",
        description: "Failed to analyze free zones. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Enrich a field for a free zone
  const enrichField = async (freeZoneId: number, field: string) => {
    setIsEnriching(true);
    
    try {
      const response = await axios.post('/api/ai-pm/enrich', { freeZoneId, field });
      const result = response.data;
      
      setEnrichmentResults(prev => [...prev, result]);
      
      // Update analysis results to reflect the enrichment
      setAnalysisResults(prev => 
        prev.map(analysis => {
          if (analysis.freeZoneId === freeZoneId) {
            return {
              ...analysis,
              fields: analysis.fields.map(f => 
                f.field === field ? { ...f, status: 'complete', confidence: 1.0 } : f
              ),
              overallCompleteness: analysis.overallCompleteness + 
                ((1.0 - (analysis.fields.find(f => f.field === field)?.confidence || 0)) * 
                (100 / analysis.fields.length))
            };
          }
          return analysis;
        })
      );
      
      if (selectedAnalysis?.freeZoneId === freeZoneId) {
        setSelectedAnalysis(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            fields: prev.fields.map(f => 
              f.field === field ? { ...f, status: 'complete', confidence: 1.0 } : f
            ),
            overallCompleteness: prev.overallCompleteness + 
              ((1.0 - (prev.fields.find(f => f.field === field)?.confidence || 0)) * 
              (100 / prev.fields.length))
          };
        });
      }
      
      toast({
        title: "Enrichment Complete",
        description: `Successfully enriched ${field} for ${result.freeZoneName}.`,
        variant: "default",
      });
      
      // Refresh logs after enrichment
      fetchLogs();
    } catch (error) {
      console.error('Error enriching field:', error);
      toast({
        title: "Error",
        description: "Failed to enrich field. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };
  
  // Web search
  const search = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await axios.post('/api/ai-pm/search', { query: searchQuery });
      const { results, error } = response.data;
      
      if (error) {
        throw new Error(error);
      }
      
      setSearchResults(results);
      
      toast({
        title: "Search Complete",
        description: `Found ${results.length} results for "${searchQuery}".`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Web scraping
  const scrape = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL to scrape.",
        variant: "destructive",
      });
      return;
    }
    
    setIsScraping(true);
    
    try {
      const response = await axios.post('/api/ai-pm/scrape-url', { url });
      const result = response.data;
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setScrapeResults(result);
      
      toast({
        title: "Scraping Complete",
        description: `Successfully scraped content from ${url}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error scraping URL:', error);
      toast({
        title: "Error",
        description: "Failed to scrape URL. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };
  
  // Combined search and scrape
  const searchAndScrape = async () => {
    if (!searchAndScrapeQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a query for search and scrape.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearchAndScraping(true);
    
    try {
      const response = await axios.post('/api/ai-pm/search-and-scrape', { query: searchAndScrapeQuery });
      const result = response.data;
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSearchAndScrapeResults(result);
      
      toast({
        title: "Search and Scrape Complete",
        description: `Successfully processed "${searchAndScrapeQuery}" with ${result.results.length} sources.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error in search and scrape:', error);
      toast({
        title: "Error",
        description: "Failed to search and scrape. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchAndScraping(false);
    }
  };
  
  // Get product recommendations
  const getRecommendations = async () => {
    setIsLoadingRecommendations(true);
    
    try {
      const response = await axios.get('/api/ai-pm/recommendations');
      const { recommendations } = response.data;
      
      setRecommendations(recommendations);
      
      toast({
        title: "Recommendations Ready",
        description: `Generated ${recommendations.length} product recommendations.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to get recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  };
  
  // Run a complete product manager cycle
  const runCycle = async () => {
    setIsCycleRunning(true);
    
    try {
      const response = await axios.post('/api/ai-pm/run-cycle');
      const result = response.data;
      
      setCycleResults(result);
      setAnalysisResults(result.analysis);
      setEnrichmentResults(prev => [...prev, ...result.enhancements]);
      setRecommendations(result.recommendations);
      
      if (result.analysis.length > 0) {
        setSelectedAnalysis(result.analysis[0]);
      }
      
      toast({
        title: "Cycle Complete",
        description: `Analyzed ${result.analysis.length} free zones, enriched ${result.enhancements.length} fields, and generated ${result.recommendations.length} recommendations.`,
        variant: "default",
      });
      
      // Refresh logs after cycle
      fetchLogs();
    } catch (error) {
      console.error('Error running product manager cycle:', error);
      toast({
        title: "Error",
        description: "Failed to run product manager cycle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCycleRunning(false);
    }
  };
  
  // Fetch logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    
    try {
      const response = await axios.get('/api/ai-pm/logs');
      const { logs } = response.data;
      
      setLogs(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  // Clear logs
  const clearLogs = async () => {
    try {
      await axios.delete('/api/ai-pm/logs');
      setLogs([]);
      
      toast({
        title: "Logs Cleared",
        description: "Successfully cleared all logs.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: "Failed to clear logs. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI Product Manager</h1>
      <p className="mb-6 text-gray-600">
        The AI Product Manager helps analyze and enhance your free zone data, providing insights
        and automatically enriching missing information through web research.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="analyze">
            <BarChart className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="enrich">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Enrichment
          </TabsTrigger>
          <TabsTrigger value="research">
            <Globe className="h-4 w-4 mr-2" />
            Web Research
          </TabsTrigger>
          <TabsTrigger value="recommend">
            <Sparkles className="h-4 w-4 mr-2" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="logs">
            <List className="h-4 w-4 mr-2" />
            Activity Logs
          </TabsTrigger>
        </TabsList>
      
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Free Zone Analysis</CardTitle>
              <CardDescription>
                Analyze the completeness of free zone data and identify gaps that need to be filled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="freeZone">Select Free Zone:</Label>
                  <select
                    id="freeZone"
                    className="w-full p-2 border rounded mt-1"
                    value={selectedFreeZone || ''}
                    onChange={(e) => setSelectedFreeZone(parseInt(e.target.value))}
                    disabled={isAnalyzing}
                  >
                    <option value="">Select a Free Zone</option>
                    {freeZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end space-x-2">
                  <Button 
                    onClick={analyzeFreeZone} 
                    disabled={isAnalyzing || !selectedFreeZone}
                    className="flex-1"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Selected Free Zone'}
                  </Button>
                  <Button 
                    onClick={analyzeAllFreeZones} 
                    disabled={isAnalyzing}
                    className="flex-1"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze All Free Zones'}
                  </Button>
                </div>
              </div>
              
              {analysisResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysisResults.map((result) => (
                      <Card 
                        key={result.freeZoneId} 
                        className={`cursor-pointer ${selectedAnalysis?.freeZoneId === result.freeZoneId ? 'border-primary' : ''}`}
                        onClick={() => setSelectedAnalysis(result)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{result.freeZoneName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Progress value={result.overallCompleteness} className="h-2" />
                          <p className="text-sm mt-2">{result.overallCompleteness.toFixed(2)}% Complete</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {result.fields.filter(f => f.status === 'complete').length} / {result.fields.length} fields complete
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedAnalysis && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">{selectedAnalysis.freeZoneName} - Detailed Analysis</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Data Completeness</CardTitle>
                        <CardDescription>
                          Overall completeness: {selectedAnalysis.overallCompleteness.toFixed(2)}%
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedAnalysis.fields.map((field) => (
                            <div key={field.field} className="pb-3 border-b last:border-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium capitalize">{field.field}</span>
                                <StatusBadge status={field.status} />
                              </div>
                              <ConfidenceIndicator confidence={field.confidence} />
                              {field.recommendation && (
                                <p className="text-xs text-gray-600 mt-1">{field.recommendation}</p>
                              )}
                              {field.status !== 'complete' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => enrichField(selectedAnalysis.freeZoneId, field.field)}
                                  disabled={isEnriching}
                                >
                                  {isEnriching ? 'Enriching...' : 'Enrich this field'}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recommended Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 list-disc pl-5">
                          {selectedAnalysis.recommendedActions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          onClick={() => {
                            const incompleteFields = selectedAnalysis.fields.filter(f => f.status !== 'complete');
                            if (incompleteFields.length > 0) {
                              enrichField(selectedAnalysis.freeZoneId, incompleteFields[0].field);
                            }
                          }}
                          disabled={isEnriching || selectedAnalysis.fields.every(f => f.status === 'complete')}
                          className="w-full"
                        >
                          {isEnriching ? 'Enriching...' : 'Enrich Next Field'}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="enrich" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Enrichment Results</CardTitle>
              <CardDescription>
                View the results of data enrichment activities performed by the AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrichmentResults.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No enrichment results yet</AlertTitle>
                  <AlertDescription>
                    Analyze free zones and enrich their data to see results here.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {enrichmentResults.map((result, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">{result.freeZoneName} - {result.field}</CardTitle>
                          <div className="flex items-center">
                            <StatusBadge status={result.originalStatus} />
                            <ArrowUpRight className="h-4 w-4 mx-2" />
                            <StatusBadge status={result.newStatus} />
                          </div>
                        </div>
                        <CardDescription>
                          Source: {result.source}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px] border rounded p-4">
                          <div className="whitespace-pre-wrap">
                            {result.content}
                          </div>
                        </ScrollArea>
                        <div className="mt-2">
                          <ConfidenceIndicator confidence={result.confidence} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Web Research Tools</CardTitle>
              <CardDescription>
                Search the web and extract information from websites to enhance your database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <Search className="h-4 w-4 inline mr-2" />
                      Web Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2 mb-4">
                      <Input
                        type="text"
                        placeholder="Enter search query"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={search} disabled={isSearching}>
                        {isSearching ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {searchResults.map((result, index) => (
                          <div key={index} className="border p-3 rounded">
                            <h4 className="font-medium text-blue-600">{result.title}</h4>
                            <p className="text-sm text-gray-600 my-1 truncate">{result.url}</p>
                            <p className="text-sm">{result.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Web Scraping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2 mb-4">
                      <Input
                        type="text"
                        placeholder="Enter URL to scrape"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={scrape} disabled={isScraping}>
                        {isScraping ? 'Scraping...' : 'Scrape'}
                      </Button>
                    </div>
                    
                    {scrapeResults && (
                      <div className="mt-4">
                        <h4 className="font-medium">{scrapeResults.title}</h4>
                        <Separator className="my-2" />
                        <ScrollArea className="h-[200px] border rounded p-4">
                          <div className="whitespace-pre-wrap">
                            {scrapeResults.content}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">
                    <FileSearch className="h-4 w-4 inline mr-2" />
                    Combined Search & Scrape
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2 mb-4">
                    <Input
                      type="text"
                      placeholder="Enter search & scrape query"
                      value={searchAndScrapeQuery}
                      onChange={(e) => setSearchAndScrapeQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={searchAndScrape} 
                      disabled={isSearchAndScraping}
                      className="whitespace-nowrap"
                    >
                      {isSearchAndScraping ? 'Processing...' : 'Search & Scrape'}
                    </Button>
                  </div>
                  
                  {searchAndScrapeResults && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Summary</CardTitle>
                          <CardDescription>
                            Query: "{searchAndScrapeResults.query}"
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="p-3 bg-gray-50 rounded border">
                            {searchAndScrapeResults.summary}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <h4 className="font-medium mt-4 mb-2">Sources ({searchAndScrapeResults.results.length})</h4>
                      <div className="space-y-4">
                        {searchAndScrapeResults.results.map((result, index) => (
                          <Card key={index}>
                            <CardHeader className="py-2">
                              <CardTitle className="text-sm">{result.title}</CardTitle>
                              <CardDescription className="text-xs truncate">
                                {result.url}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="py-2">
                              <ScrollArea className="h-[100px] border rounded p-2">
                                <div className="text-sm whitespace-pre-wrap">
                                  {result.content.substring(0, 300)}
                                  {result.content.length > 300 && '...'}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Product Recommendations</CardTitle>
              <CardDescription>
                Get strategic recommendations for improving the platform based on data analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Button 
                  onClick={getRecommendations} 
                  disabled={isLoadingRecommendations}
                >
                  {isLoadingRecommendations ? 'Loading...' : 'Get Recommendations'}
                </Button>
                
                <Button 
                  onClick={runCycle} 
                  variant="outline"
                  disabled={isCycleRunning}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isCycleRunning ? 'Running Full Cycle...' : 'Run Full Analysis & Enrichment Cycle'}
                </Button>
              </div>
              
              {recommendations.length === 0 ? (
                <Alert>
                  <FileQuestion className="h-4 w-4" />
                  <AlertTitle>No recommendations yet</AlertTitle>
                  <AlertDescription>
                    Generate recommendations to see strategic insights for improving your platform.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 border rounded bg-gray-50">
                      <div className="flex items-start">
                        <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-semibold text-white bg-primary rounded-full">
                          {index + 1}
                        </span>
                        <p>{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {cycleResults && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Last Cycle Results</CardTitle>
                      <CardDescription>
                        Summary of the last analysis and enrichment cycle
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 border rounded bg-blue-50">
                          <p className="text-lg font-semibold text-blue-700">
                            {cycleResults.analysis.length}
                          </p>
                          <p className="text-sm text-blue-600">Free Zones Analyzed</p>
                        </div>
                        <div className="p-4 border rounded bg-green-50">
                          <p className="text-lg font-semibold text-green-700">
                            {cycleResults.enhancements.length}
                          </p>
                          <p className="text-sm text-green-600">Fields Enriched</p>
                        </div>
                        <div className="p-4 border rounded bg-purple-50">
                          <p className="text-lg font-semibold text-purple-700">
                            {cycleResults.recommendations.length}
                          </p>
                          <p className="text-sm text-purple-600">Recommendations</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Track AI Product Manager actions and activities
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={clearLogs}
                  disabled={isLoadingLogs || logs.length === 0}
                >
                  Clear Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex justify-center py-4">
                  <p>Loading logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>No activity logs yet</AlertTitle>
                  <AlertDescription>
                    Perform actions with the AI Product Manager to see logs here.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px] mt-2">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded border ${
                          log.severity === 'error' ? 'bg-red-50 border-red-200' :
                          log.component === 'enrich' ? 'bg-green-50 border-green-200' :
                          log.component === 'analyze' ? 'bg-blue-50 border-blue-200' :
                          log.component === 'search' ? 'bg-yellow-50 border-yellow-200' :
                          log.component === 'scrape' ? 'bg-purple-50 border-purple-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-700 capitalize">{log.component}</span>
                          <span className="text-xs text-gray-500">{formatTimestamp(log.created_at)}</span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div 
                            className="mt-2 p-2 bg-white rounded text-xs font-mono overflow-x-auto" 
                            style={{ maxHeight: '100px' }}
                          >
                            {JSON.stringify(log.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIProductManager;