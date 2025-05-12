import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileUp, AlertCircle, CheckCircle } from 'lucide-react';

interface DocumentImportProps {
  title?: string;
  description?: string;
}

export function DocumentImport({ 
  title = "Import DMCC Documents", 
  description = "Process downloaded DMCC documents and import them into the database" 
}: DocumentImportProps) {
  const queryClient = useQueryClient();
  const [totalDocuments, setTotalDocuments] = useState<number | null>(null);
  
  // Mutation for processing DMCC documents
  const { mutate, isPending, isError, isSuccess, error, reset } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/documents/process-dmcc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process documents');
      }
      
      const data = await response.json();
      setTotalDocuments(data.count);
      return data;
    },
    onSuccess: () => {
      // Invalidate the documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    }
  });
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </AlertDescription>
          </Alert>
        )}
        
        {isSuccess && (
          <Alert className="mb-4 bg-green-50 border border-green-500 text-green-700">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Documents processed successfully. Total documents in database: {totalDocuments}
            </AlertDescription>
          </Alert>
        )}
        
        <p className="mb-4 text-muted-foreground">
          This will scan the <code>dmcc_docs</code> directory and import all documents into the database.
          Existing documents will be skipped.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => mutate()} 
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Process DMCC Documents
            </>
          )}
        </Button>
        
        {(isSuccess || isError) && (
          <Button 
            variant="outline" 
            onClick={() => reset()} 
            className="ml-2"
          >
            Reset
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}