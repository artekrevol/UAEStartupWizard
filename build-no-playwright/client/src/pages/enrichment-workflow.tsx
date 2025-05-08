import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import EnrichmentWorkflow from "@/components/ai-product-manager/EnrichmentWorkflow";
import { ArrowLeft, Database } from "lucide-react";

export default function EnrichmentWorkflowPage() {
  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/ai-product-manager">AI Product Manager</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Enrichment Workflow</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Intelligent Data Enrichment</h1>
        <Link href="/ai-product-manager">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Product Manager
          </Button>
        </Link>
      </div>
      
      <div className="bg-muted p-4 rounded-lg flex items-start space-x-4">
        <Database className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-medium">Automatic Data Enhancement</h3>
          <p className="text-sm text-muted-foreground">
            This workflow automatically identifies missing or incomplete data across UAE free zones and
            enriches it through intelligent web research and AI analysis. The system prioritizes tasks
            based on importance, difficulty, and strategic value to ensure the most critical data gaps
            are addressed first.
          </p>
        </div>
      </div>
      
      <EnrichmentWorkflow />
    </div>
  );
}