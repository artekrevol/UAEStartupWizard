import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Document } from '@shared/schema';
import { Download, FileText, FileIcon, Search } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface DocumentListProps {
  freeZoneId?: number;
  category?: string;
}

interface DocumentsResponse {
  documents: Document[];
}

export function DocumentList({ freeZoneId, category }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  if (freeZoneId) queryParams.append('freeZoneId', String(freeZoneId));
  if (selectedCategory && selectedCategory !== 'all') queryParams.append('category', selectedCategory);
  
  // Fetch documents
  const { data, isLoading, error } = useQuery<Document[]>({
    queryKey: ['/api/documents', freeZoneId, selectedCategory],
    queryFn: async () => {
      const endpoint = `/api/documents?${queryParams.toString()}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    }
  });
  
  // Filter documents based on search query
  const filteredDocuments = data?.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle document download
  const handleDownload = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };
  
  // Format file size to readable format
  const formatFileSize = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return 'Unknown';
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          Browse and download business setup documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {!category && (
            <div className="w-full sm:w-1/2">
              <Select 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="company-setup">Company Setup</SelectItem>
                  <SelectItem value="licensing">Licensing</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="visa">Visa & Immigration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded text-red-600">
            Error loading documents. Please try again.
          </div>
        ) : filteredDocuments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No documents found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.category && (
                      <Badge variant="outline" className="capitalize">
                        {doc.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.documentType || 'General'}
                  </TableCell>
                  <TableCell>
                    {formatFileSize(doc.fileSize)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(doc.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}