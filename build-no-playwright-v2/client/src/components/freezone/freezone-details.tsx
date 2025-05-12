import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FreeZone } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  Briefcase, 
  CheckCircle2, 
  FileCheck, 
  ListChecks, 
  MapPin,
  Building,
  HelpCircle,
  DollarSign
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extended FreeZone interface with proper typing
interface ExtendedFreeZone extends FreeZone {
  setupCost: string | Record<string, unknown> | unknown;
  benefits: string[];
  requirements: string[];
  industries: string[];
  licenseTypes: Array<string | { name: string; description?: string }>;
  facilities: Array<string | { name: string; description?: string }>;
  faqs: Array<{ question: string; answer: string }> | string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface FreeZoneDetailsProps {
  freeZoneId: number;
}

export function FreeZoneDetails({ freeZoneId }: FreeZoneDetailsProps) {
  const { data: freeZone, isLoading, error } = useQuery<ExtendedFreeZone>({
    queryKey: [`/api/free-zones/${freeZoneId}`],
  });

  if (isLoading) {
    return <FreeZoneDetailsSkeleton />;
  }

  if (error || !freeZone) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-600 rounded">
        Error loading free zone details. Please try again later.
      </div>
    );
  }

  const lastUpdated = freeZone.lastUpdated 
    ? formatDistanceToNow(new Date(freeZone.lastUpdated), { addSuffix: true }) 
    : 'Unknown';

  // Parse FAQs if they're in string format
  let faqsList: FAQ[] = [];
  if (freeZone.faqs) {
    if (Array.isArray(freeZone.faqs)) {
      // Type assertion here since we know the structure from the db
      faqsList = freeZone.faqs as FAQ[];
    } else if (typeof freeZone.faqs === 'string') {
      try {
        const parsed = JSON.parse(freeZone.faqs);
        if (Array.isArray(parsed)) {
          faqsList = parsed;
        }
      } catch (e) {
        console.error("Failed to parse FAQs:", e);
      }
    }
  }

  // Ensure arrays are arrays and cast to known types
  const benefits: string[] = Array.isArray(freeZone.benefits) ? freeZone.benefits.map(b => String(b)) : [];
  const requirements: string[] = Array.isArray(freeZone.requirements) ? freeZone.requirements.map(r => String(r)) : [];
  const industries: string[] = Array.isArray(freeZone.industries) ? freeZone.industries.map(i => String(i)) : [];
  const licenseTypes: any[] = Array.isArray(freeZone.licenseTypes) ? freeZone.licenseTypes : [];
  const facilities: any[] = Array.isArray(freeZone.facilities) ? freeZone.facilities : [];
  
  // Convert setupCost to a displayable format
  const setupCostDisplay = (() => {
    if (!freeZone.setupCost) return null;
    
    if (typeof freeZone.setupCost === 'string') {
      return freeZone.setupCost;
    }
    
    try {
      return JSON.stringify(freeZone.setupCost);
    } catch (err) {
      return 'Setup cost information available, contact free zone for details';
    }
  })();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{freeZone.name}</h1>
            <div className="flex items-center gap-2">
              {freeZone.location && (
                <span className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  {freeZone.location}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>

          <div className="prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
            <p>{freeZone.description || 'No description available'}</p>
          </div>
        </div>

        <div className="lg:w-1/3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Quick Facts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {industries.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Top Industries:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {industries.slice(0, 3).map((industry, i) => (
                      <Badge key={i} variant="secondary">{industry}</Badge>
                    ))}
                    {industries.length > 3 && (
                      <Badge variant="outline">+{industries.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}
              {freeZone.website && (
                <div>
                  <p className="text-sm font-medium">Website:</p>
                  <a 
                    href={freeZone.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {freeZone.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {setupCostDisplay && (
            <Card className="setup-cost-overview">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Setup Cost Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{setupCostDisplay}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid grid-cols-5 h-auto">
          <TabsTrigger value="benefits" className="py-2">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">Benefits</span>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="py-2">
            <ListChecks className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">Requirements</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="py-2">
            <FileCheck className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">Licenses</span>
          </TabsTrigger>
          <TabsTrigger value="facilities" className="py-2">
            <Building className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">Facilities</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="py-2">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline-block">FAQ</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="benefits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Benefits</CardTitle>
              <CardDescription>
                Advantages of setting up your business in {freeZone.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {benefits.length > 0 ? (
                <ul className="space-y-2 list-disc pl-5">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="text-sm">{benefit}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No benefits information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="requirements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Requirements</CardTitle>
              <CardDescription>
                Requirements for establishing a business in {freeZone.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requirements.length > 0 ? (
                <ul className="space-y-2 list-disc pl-5">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="text-sm">{requirement}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No requirements information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="licenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>License Types</CardTitle>
              <CardDescription>
                Available license types in {freeZone.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {licenseTypes.length > 0 ? (
                <div className="space-y-4">
                  {licenseTypes.map((license, index) => (
                    <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                      <h4 className="font-medium">
                        {typeof license === 'string' ? license : 
                         typeof license === 'object' && license !== null && 'name' in license ? 
                         String(license.name) : String(license)}
                      </h4>
                      {typeof license === 'object' && license !== null && 'description' in license && 
                        <p className="text-sm text-muted-foreground mt-1">{String(license.description)}</p>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No license type information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="facilities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Facilities & Amenities</CardTitle>
              <CardDescription>
                Available facilities in {freeZone.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {facilities.map((facility, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h4 className="font-medium">
                        {typeof facility === 'string' ? facility : 
                         typeof facility === 'object' && facility !== null && 'name' in facility ? 
                         String(facility.name) : String(facility)}
                      </h4>
                      {typeof facility === 'object' && facility !== null && 'description' in facility && 
                        <p className="text-sm text-muted-foreground mt-1">{String(facility.description)}</p>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No facilities information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="faq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common questions about {freeZone.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {faqsList.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {faqsList.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground italic">No FAQ information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {industries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Supported Industries
            </CardTitle>
            <CardDescription>
              Industries that are supported in {freeZone.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1">
                  {industry}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FreeZoneDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="lg:w-1/3">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      
      <Skeleton className="h-12 w-full" />
      
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}