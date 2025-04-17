import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, Database, RefreshCw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DocumentStats {
  totalDocuments: number;
  categoryCounts: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

interface SubcategoryStats {
  totalDocuments: number;
  subcategoryCounts: {
    category: string;
    subcategory: string;
    count: number;
    percentage: number;
  }[];
}

interface Document {
  id: number;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  documentType: string;
  category: string;
  freeZoneId: number | null;
  metadata: {
    source?: string;
    uploadMethod?: string;
    processingDate?: string;
    subcategory?: string;
    [key: string]: any;
  } | null;
  uploadedAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocumentManagement() {
  const { toast } = useToast();
  const [isRunningDownloader, setIsRunningDownloader] = useState(false);
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [processingOutput, setProcessingOutput] = useState<string>('');
  const [documentsFilter, setDocumentsFilter] = useState({
    category: '',
    subcategory: '',
  });

  // Fetch document statistics
  const { data: docStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<DocumentStats>({
    queryKey: ['/api/documents/stats'],
    staleTime: 60000, // 1 minute
  });

  // Fetch subcategory statistics
  const { data: subcategoryStats, isLoading: isLoadingSubcatStats, refetch: refetchSubcatStats } = useQuery<SubcategoryStats>({
    queryKey: ['/api/documents/stats/subcategories', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/api/documents/stats/subcategories?category=${selectedCategory}`
        : '/api/documents/stats/subcategories';
      const response = await apiRequest('GET', url);
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch documents (filtered if needed)
  const { data: documents, isLoading: isLoadingDocs, refetch: refetchDocs } = useQuery<Document[]>({
    queryKey: ['/api/documents', documentsFilter],
    queryFn: async () => {
      let url = '/api/documents';
      const params: string[] = [];
      
      if (documentsFilter.category) {
        params.push(`category=${documentsFilter.category}`);
      }
      
      if (documentsFilter.subcategory) {
        params.push(`subcategory=${documentsFilter.subcategory}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const response = await apiRequest('GET', url);
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  interface ProcessingResult {
    status: string;
    output: string;
    message?: string;
    count?: number;
  }

  // Run the comprehensive document downloader
  const runComprehensiveDownloader = async () => {
    try {
      setIsRunningDownloader(true);
      setProcessingOutput('Starting comprehensive document downloader...\n');
      
      const response = await apiRequest('POST', '/api/documents/run-comprehensive-downloader');
      const result = await response.json();
      
      setProcessingOutput(prev => prev + (result.output || '') + '\n');
      
      if (result.status === 'running') {
        toast({
          title: 'Document Downloader Running',
          description: 'The document downloader is running in the background. This may take several minutes.',
          variant: 'default',
        });
      } else if (result.status === 'success') {
        toast({
          title: 'Document Download Complete',
          description: 'Successfully downloaded DMCC documents.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Download Failed',
          description: result.message || 'An error occurred during document download.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running document downloader:', error);
      setProcessingOutput(prev => prev + 'Error running document downloader: ' + JSON.stringify(error) + '\n');
      toast({
        title: 'Download Failed',
        description: 'Failed to start document downloader. See console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsRunningDownloader(false);
    }
  };

  // Process documents with enhanced processor
  const processDocumentsEnhanced = async () => {
    try {
      setIsProcessingDocs(true);
      setProcessingOutput('Starting enhanced document processing...\n');
      
      const response = await apiRequest('POST', '/api/documents/process-enhanced');
      const result = await response.json();
      
      setProcessingOutput(prev => prev + (result.output || '') + '\n');
      
      if (result.status === 'success') {
        toast({
          title: 'Document Processing Complete',
          description: `Successfully processed documents. Total documents: ${result.count || 0}`,
          variant: 'default',
        });
        
        // Refresh data
        refetchStats();
        refetchSubcatStats();
        refetchDocs();
      } else {
        toast({
          title: 'Processing Failed',
          description: result.message || 'An error occurred during document processing.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing documents:', error);
      setProcessingOutput(prev => prev + 'Error processing documents: ' + JSON.stringify(error) + '\n');
      toast({
        title: 'Processing Failed',
        description: 'Failed to process documents. See console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingDocs(false);
    }
  };

  // Process documents with standard processor
  const processDocumentsStandard = async () => {
    try {
      setIsProcessingDocs(true);
      setProcessingOutput('Starting standard document processing...\n');
      
      const response = await apiRequest('POST', '/api/documents/process-dmcc');
      const result = await response.json();
      
      setProcessingOutput(prev => prev + `Documents processed successfully. Total documents: ${result.count || 0}\n`);
      
      toast({
        title: 'Document Processing Complete',
        description: `Successfully processed documents. Total documents: ${result.count || 0}`,
        variant: 'default',
      });
      
      // Refresh data
      refetchStats();
      refetchSubcatStats();
      refetchDocs();
    } catch (error) {
      console.error('Error processing documents:', error);
      setProcessingOutput(prev => prev + 'Error processing documents: ' + JSON.stringify(error) + '\n');
      toast({
        title: 'Processing Failed',
        description: 'Failed to process documents. See console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingDocs(false);
    }
  };

  // Handle category selection change
  useEffect(() => {
    if (selectedCategory) {
      refetchSubcatStats();
    }
  }, [selectedCategory, refetchSubcatStats]);

  // Handle refreshing all data
  const refreshAllData = () => {
    refetchStats();
    refetchSubcatStats();
    refetchDocs();
    toast({
      title: 'Data Refreshed',
      description: 'Document statistics and listings have been refreshed.',
      variant: 'default',
    });
  };

  // Filter documents by category
  const filterByCategory = (category: string) => {
    setDocumentsFilter(prev => ({ ...prev, category }));
  };

  // Filter documents by subcategory
  const filterBySubcategory = (subcategory: string) => {
    setDocumentsFilter(prev => ({ ...prev, subcategory }));
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Download, process, and manage DMCC documents
          </p>
        </div>
        <Button onClick={refreshAllData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="process">Process Documents</TabsTrigger>
          <TabsTrigger value="download">Download Documents</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Document Summary</CardTitle>
                <CardDescription>Overview of all documents in the database</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-4">
                      {docStats?.totalDocuments || 0} Documents
                    </div>
                    <div className="space-y-4">
                      {docStats?.categoryCounts?.map((category) => (
                        <div key={category.category} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="font-medium capitalize">
                              {category.category.replace(/_/g, ' ')}
                            </span>
                            <span>
                              {category.count} ({category.percentage}%)
                            </span>
                          </div>
                          <Progress value={category.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Subcategory Distribution Card */}
            <Card>
              <CardHeader>
                <CardTitle>Subcategory Distribution</CardTitle>
                <CardDescription>Document breakdown by subcategory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select
                    value={selectedCategory || ''}
                    onValueChange={(value) => setSelectedCategory(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {docStats?.categoryCounts?.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoadingSubcatStats ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subcategoryStats?.subcategoryCounts?.map((item) => (
                      <div key={`${item.category}-${item.subcategory}`} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">
                            {item.subcategory.replace(/_/g, ' ')}
                          </span>
                          <span>
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>Browse and filter all documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="w-1/2">
                  <Label htmlFor="category-filter">Category</Label>
                  <Select
                    value={documentsFilter.category}
                    onValueChange={(value) => filterByCategory(value)}
                  >
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {docStats?.categoryCounts?.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-1/2">
                  <Label htmlFor="subcategory-filter">Subcategory</Label>
                  <Select
                    value={documentsFilter.subcategory}
                    onValueChange={(value) => filterBySubcategory(value)}
                  >
                    <SelectTrigger id="subcategory-filter">
                      <SelectValue placeholder="All Subcategories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {subcategoryStats?.subcategoryCounts?.map((item) => (
                        <SelectItem key={`${item.category}-${item.subcategory}`} value={item.subcategory}>
                          {item.subcategory.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoadingDocs ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>
                      {documents?.length
                        ? `Showing ${documents.length} document${documents.length !== 1 ? 's' : ''}`
                        : 'No documents found with the selected filters'}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents?.map((doc: Document) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {doc.category.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.metadata?.subcategory ? (
                              <Badge variant="secondary" className="capitalize">
                                {doc.metadata.subcategory.replace(/_/g, ' ')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">General</Badge>
                            )}
                          </TableCell>
                          <TableCell className="uppercase">{doc.documentType}</TableCell>
                          <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell className="text-right">
                            <a 
                              href={`/api/documents/${doc.id}/download`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4 mr-1" /> Download
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Process Documents Tab */}
        <TabsContent value="process">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Process Documents</CardTitle>
                <CardDescription>
                  Import documents from the filesystem into the database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="enhanced" checked={true} />
                    <Label htmlFor="enhanced">
                      Use enhanced processing with subcategory classification
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Enhanced processing detects document subcategories automatically and
                    applies intelligent categorization.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  onClick={processDocumentsStandard}
                  variant="outline"
                  disabled={isProcessingDocs}
                >
                  {isProcessingDocs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Standard Process
                </Button>
                <Button
                  onClick={processDocumentsEnhanced}
                  disabled={isProcessingDocs}
                >
                  {isProcessingDocs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enhanced Process
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Output</CardTitle>
                <CardDescription>
                  View logs and results from document processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded-md h-80 font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {processingOutput || 'No processing output yet. Run a processor to see results.'}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setProcessingOutput('')}
                  disabled={!processingOutput}
                  className="w-full"
                >
                  Clear Output
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Download Documents Tab */}
        <TabsContent value="download">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Download DMCC Documents</CardTitle>
                <CardDescription>
                  Automatically download documents from the DMCC website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-primary/10 p-4">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 mr-2 text-primary" />
                    <div>
                      <h4 className="font-semibold">Comprehensive Downloader</h4>
                      <p className="text-sm text-muted-foreground">
                        Downloads all documents from the DMCC knowledge bank and portal pages.
                        May take 10-15 minutes to complete.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md bg-primary/10 p-4">
                  <div className="flex items-center">
                    <Database className="h-6 w-6 mr-2 text-primary" />
                    <div>
                      <h4 className="font-semibold">Import After Download</h4>
                      <p className="text-sm text-muted-foreground">
                        After downloading, remember to process the documents 
                        using the Process Documents tab to import them to the database.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={runComprehensiveDownloader}
                  disabled={isRunningDownloader}
                  className="w-full"
                >
                  {isRunningDownloader && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Comprehensive Download
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Downloader Output</CardTitle>
                <CardDescription>
                  View logs and results from document downloading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded-md h-80 font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {processingOutput || 'No download output yet. Run a downloader to see results.'}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => setProcessingOutput('')}
                  disabled={!processingOutput}
                  className="w-full"
                >
                  Clear Output
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}