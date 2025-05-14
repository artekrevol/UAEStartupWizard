import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Globe,
  FileText,
  Database,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  BarChart,
  Diff
} from "lucide-react";

interface AuditReportProps {
  freeZoneId: number;
  freeZoneName: string;
  onComplete?: (report: any) => void;
}

// Deep Audit Result interface
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

const AuditReport: React.FC<AuditReportProps> = ({ freeZoneId, freeZoneName, onComplete }) => {
  const { toast } = useToast();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<DeepAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Run deep audit for the free zone
  const runDeepAudit = async () => {
    setIsAuditing(true);
    
    try {
      const response = await axios.post(`/api/ai-pm/deep-audit/${freeZoneId}`);
      const result = response.data;
      
      setAuditResult(result);
      
      // Notify parent component
      if (onComplete) {
        onComplete(result);
      }
      
      toast({
        title: "Deep Audit Complete",
        description: `Successfully completed deep audit for ${freeZoneName}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error running deep audit:', error);
      toast({
        title: "Error",
        description: "Failed to run deep audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };
  
  // Format a field name for display
  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Render a badge for a specific priority level
  const renderPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const colorMap = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };
  
  // Render improvement indicator with sparkles for improved fields
  const renderImprovementIndicator = (field: string) => {
    const improved = auditResult?.scraperUpdate.fieldsImproved.includes(field);
    
    if (improved) {
      return (
        <span className="inline-flex items-center text-green-600">
          <Sparkles className="h-4 w-4 mr-1" />
          Improved
        </span>
      );
    }
    
    return null;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deep Audit Report</h3>
          <p className="text-sm text-gray-600">Compare database data with live website content for accuracy and completeness</p>
        </div>
        <Button 
          onClick={runDeepAudit} 
          disabled={isAuditing}
          className="flex items-center"
        >
          {isAuditing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Audit...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Deep Audit
            </>
          )}
        </Button>
      </div>
      
      {auditResult ? (
        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="summary">
                <BarChart className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="data-gaps">
                <Diff className="h-4 w-4 mr-2" />
                Data Gaps
              </TabsTrigger>
              <TabsTrigger value="website">
                <Globe className="h-4 w-4 mr-2" />
                Website Data
              </TabsTrigger>
              <TabsTrigger value="actions">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Actions
              </TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Overview</CardTitle>
                  <CardDescription>
                    Completed audit for {freeZoneName} on {new Date(auditResult.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Database Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <Database className="h-4 w-4 mr-2" />
                          Database
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-medium">Documents:</span> {auditResult.existingData.documents}
                          </div>
                          <div>
                            <span className="font-medium">Complete Fields:</span> {auditResult.existingData.fieldsPresent.length}
                          </div>
                          <div>
                            <span className="font-medium">Incomplete Fields:</span> {auditResult.existingData.fieldsIncomplete.length}
                          </div>
                          <div>
                            <span className="font-medium">Missing Fields:</span> {auditResult.existingData.fieldsMissing.length}
                          </div>
                          <div className="mt-3">
                            <span className="font-medium">Completeness:</span>
                            <Progress value={auditResult.existingData.completenessScore} className="h-2 mt-1" />
                            <span className="text-xs text-gray-500">{auditResult.existingData.completenessScore}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Delta Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <Diff className="h-4 w-4 mr-2" />
                          Delta Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-medium">Fields in Both:</span> {auditResult.delta.fieldsPresentInBoth.length}
                          </div>
                          <div>
                            <span className="font-medium">Only in Database:</span> {auditResult.delta.fieldsOnlyInDatabase.length}
                          </div>
                          <div>
                            <span className="font-medium">Only on Website:</span> {auditResult.delta.fieldsOnlyOnWebsite.length}
                          </div>
                          <div>
                            <span className="font-medium">Inconsistent Fields:</span> {auditResult.delta.inconsistentFields.length}
                          </div>
                          <div className="mt-3">
                            <span className="font-medium">Inconsistency Level:</span>
                            <Progress 
                              value={Math.min(100, (auditResult.delta.inconsistentFields.length / 11) * 100)} 
                              className={`h-2 mt-1 ${auditResult.delta.inconsistentFields.length > 3 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                            />
                            <span className="text-xs text-gray-500">
                              {auditResult.delta.inconsistentFields.length > 3 
                                ? 'High Inconsistency' 
                                : auditResult.delta.inconsistentFields.length > 0 
                                  ? 'Moderate Inconsistency' 
                                  : 'Low Inconsistency'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Scraper Update */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Scraper Update
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm space-y-2">
                          <div>
                            <span className="font-medium">Scraper Run:</span> {auditResult.scraperUpdate.scraperRun ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="font-medium">Success:</span> {auditResult.scraperUpdate.scraperSuccess ? 'Yes' : 'No'}
                          </div>
                          <div>
                            <span className="font-medium">Fields Improved:</span> {auditResult.scraperUpdate.fieldsImproved.length}
                          </div>
                          <div>
                            <span className="font-medium">Still Missing:</span> {auditResult.scraperUpdate.fieldsStillMissing.length}
                          </div>
                          {auditResult.scraperUpdate.scraperRun && auditResult.scraperUpdate.newCompleteness > 0 && (
                            <div className="mt-3">
                              <span className="font-medium">New Completeness:</span>
                              <Progress value={auditResult.scraperUpdate.newCompleteness} className="h-2 mt-1" />
                              <span className="text-xs text-gray-500">{auditResult.scraperUpdate.newCompleteness}%</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Key recommendations */}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Key Recommendations</h4>
                    <ul className="space-y-2">
                      {auditResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          {rec.priority === 'high' ? (
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                          ) : rec.priority === 'medium' ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                          ) : (
                            <FileText className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium mr-2">{rec.action.replace(/_/g, ' ')}</span>
                              {renderPriorityBadge(rec.priority)}
                              {rec.field && <span className="ml-2 text-sm text-gray-500">{formatFieldName(rec.field)}</span>}
                            </div>
                            <p className="text-sm text-gray-600">{rec.details}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Data Gaps Tab */}
            <TabsContent value="data-gaps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Field-by-Field Analysis</CardTitle>
                  <CardDescription>
                    Detailed analysis of data gaps and inconsistencies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Inconsistent Fields Section */}
                    {auditResult.delta.inconsistentFields.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Inconsistent Fields
                        </h4>
                        <div className="space-y-4">
                          {auditResult.delta.inconsistentFields.map((field, index) => (
                            <Card key={index} className="border-red-200">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                  <CardTitle className="text-base">{formatFieldName(field.field)}</CardTitle>
                                  {renderImprovementIndicator(field.field)}
                                </div>
                                <CardDescription>
                                  Confidence Score: {Math.round(field.confidenceScore * 100)}%
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-medium text-sm mb-1">Database Content</h5>
                                    <p className="text-sm text-gray-600">{field.databaseContent}</p>
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-sm mb-1">Website Content</h5>
                                    <p className="text-sm text-gray-600">{field.websiteContent}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Fields Only on Website Section */}
                    {auditResult.delta.fieldsOnlyOnWebsite.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-yellow-600 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Fields Only on Website
                        </h4>
                        <div className="space-y-4">
                          {auditResult.delta.fieldsOnlyOnWebsite.map((field, index) => (
                            <Card key={index} className="border-yellow-200">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                  <CardTitle className="text-base">{formatFieldName(field)}</CardTitle>
                                  {renderImprovementIndicator(field)}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div>
                                  <h5 className="font-medium text-sm mb-1">Website Content</h5>
                                  <p className="text-sm text-gray-600">
                                    {auditResult.liveWebsiteData.contentSummary[field] || 'Content not analyzed in detail'}
                                  </p>
                                </div>
                                <div className="mt-2">
                                  <h5 className="font-medium text-sm mb-1">Status</h5>
                                  {auditResult.scraperUpdate.fieldsImproved.includes(field) ? (
                                    <p className="text-sm text-green-600">This field was successfully scraped and added to the database.</p>
                                  ) : (
                                    <p className="text-sm text-red-600">This field is missing from our database and could not be automatically scraped.</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Missing Fields Section */}
                    {auditResult.existingData.fieldsMissing.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center">
                          <XCircle className="h-4 w-4 mr-2" />
                          Missing Fields
                        </h4>
                        <div className="space-y-4">
                          {auditResult.existingData.fieldsMissing.map((field, index) => (
                            <Card key={index} className="border-red-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">{formatFieldName(field)}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-600">
                                  No data available for this field in our database.
                                  {auditResult.liveWebsiteData.fieldsFound.includes(field) 
                                    ? ' However, this information is available on the official website.'
                                    : ' This information also appears to be missing from the official website.'}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Incomplete Fields Section */}
                    {auditResult.existingData.fieldsIncomplete.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-yellow-600 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Incomplete Fields
                        </h4>
                        <div className="space-y-4">
                          {auditResult.existingData.fieldsIncomplete.map((field, index) => (
                            <Card key={index} className="border-yellow-200">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                  <CardTitle className="text-base">{formatFieldName(field)}</CardTitle>
                                  {renderImprovementIndicator(field)}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-600">
                                  This field has some data in our database but is considered incomplete.
                                  Documents: {auditResult.existingData.fieldsWithDocs[field] || 0}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* No Issues Section */}
                    {auditResult.delta.inconsistentFields.length === 0 && 
                     auditResult.delta.fieldsOnlyOnWebsite.length === 0 && 
                     auditResult.existingData.fieldsMissing.length === 0 && 
                     auditResult.existingData.fieldsIncomplete.length === 0 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>No Data Gaps Found</AlertTitle>
                        <AlertDescription>
                          All fields are completely populated and consistent with the official website.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Website Data Tab */}
            <TabsContent value="website" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Website Data</CardTitle>
                  <CardDescription>
                    Information extracted from {auditResult.liveWebsiteData.url}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!auditResult.liveWebsiteData.url ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Website URL</AlertTitle>
                      <AlertDescription>
                        No official website URL is available for this free zone. Add a website URL to enable web auditing.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {/* Website Screenshot */}
                      {auditResult.liveWebsiteData.screenshotPath && (
                        <div>
                          <h4 className="font-semibold mb-2">Website Screenshot</h4>
                          <img 
                            src={`/screenshots/${auditResult.liveWebsiteData.screenshotPath.split('/').pop()}`} 
                            alt="Website Screenshot" 
                            className="max-w-full rounded border"
                          />
                        </div>
                      )}
                      
                      {/* Fields Found */}
                      <div>
                        <h4 className="font-semibold mb-2">Fields Found on Website</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {auditResult.liveWebsiteData.fieldsFound.length > 0 ? (
                            auditResult.liveWebsiteData.fieldsFound.map((field, index) => (
                              <Badge key={index} variant="outline">
                                {formatFieldName(field)}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-gray-600">No fields were identified on the website.</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Content Summary */}
                      <div>
                        <h4 className="font-semibold mb-2">Content Summary</h4>
                        <ScrollArea className="h-64 w-full rounded border p-4">
                          {Object.keys(auditResult.liveWebsiteData.contentSummary).length > 0 ? (
                            <div className="space-y-4">
                              {Object.entries(auditResult.liveWebsiteData.contentSummary).map(([field, content], index) => (
                                <div key={index}>
                                  <h5 className="font-medium">{formatFieldName(field)}</h5>
                                  <p className="text-sm text-gray-600">{content}</p>
                                  <Separator className="my-2" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No content summary is available.</p>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                  <CardDescription>
                    Actions to improve data completeness and accuracy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* High Priority Actions */}
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">High Priority</h4>
                      {auditResult.recommendations.filter(r => r.priority === 'high').length > 0 ? (
                        <div className="space-y-3">
                          {auditResult.recommendations
                            .filter(r => r.priority === 'high')
                            .map((rec, index) => (
                              <Card key={index} className="border-red-200">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">
                                    {rec.action.replace(/_/g, ' ')}
                                    {rec.field && <span className="ml-2 text-sm font-normal">({formatFieldName(rec.field)})</span>}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-gray-600">{rec.details}</p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No high priority actions required.</p>
                      )}
                    </div>
                    
                    {/* Medium Priority Actions */}
                    <div>
                      <h4 className="font-semibold text-yellow-600 mb-2">Medium Priority</h4>
                      {auditResult.recommendations.filter(r => r.priority === 'medium').length > 0 ? (
                        <div className="space-y-3">
                          {auditResult.recommendations
                            .filter(r => r.priority === 'medium')
                            .map((rec, index) => (
                              <Card key={index} className="border-yellow-200">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">
                                    {rec.action.replace(/_/g, ' ')}
                                    {rec.field && <span className="ml-2 text-sm font-normal">({formatFieldName(rec.field)})</span>}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-gray-600">{rec.details}</p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No medium priority actions required.</p>
                      )}
                    </div>
                    
                    {/* Low Priority Actions */}
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-2">Low Priority</h4>
                      {auditResult.recommendations.filter(r => r.priority === 'low').length > 0 ? (
                        <div className="space-y-3">
                          {auditResult.recommendations
                            .filter(r => r.priority === 'low')
                            .map((rec, index) => (
                              <Card key={index} className="border-blue-200">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base">
                                    {rec.action.replace(/_/g, ' ')}
                                    {rec.field && <span className="ml-2 text-sm font-normal">({formatFieldName(rec.field)})</span>}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-gray-600">{rec.details}</p>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No low priority actions required.</p>
                      )}
                    </div>
                    
                    {/* All Issues Resolved Section */}
                    {auditResult.recommendations.length === 0 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>No Actions Required</AlertTitle>
                        <AlertDescription>
                          All data appears to be complete and accurate. No actions are required at this time.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
                {auditResult.recommendations.length > 0 && (
                  <CardFooter>
                    <Button 
                      onClick={() => runDeepAudit()} 
                      disabled={isAuditing}
                      className="w-full flex items-center justify-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-run Deep Audit
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Audit Data Available</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Run a deep audit to compare database information with the official website and identify gaps or inconsistencies.
              </p>
              <Button 
                onClick={runDeepAudit} 
                disabled={isAuditing}
                className="flex items-center mx-auto"
              >
                {isAuditing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Start Deep Audit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuditReport;