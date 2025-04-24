import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import EnrichmentWorkflow from '@/components/ai-product-manager/EnrichmentWorkflow';

export default function EnrichmentWorkflowPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Enrichment Workflow...</span>
        </div>
      }>
        <EnrichmentWorkflow />
      </Suspense>
    </div>
  );
}