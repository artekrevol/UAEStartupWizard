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
  Landmark, 
  ListChecks, 
  MapPin,
  PanelTop,
  Building,
  HelpCircle,
  DollarSign
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FreeZoneDetailsProps {
  freeZoneId: number;
}

export function FreeZoneDetails({ freeZoneId }: FreeZoneDetailsProps) {
  const { data: freeZone, isLoading, error } = useQuery<FreeZone>({
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
              {freeZone.industries && freeZone.industries.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Top Industries:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {freeZone.industries.slice(0, 3).map((industry, i) => (
                      <Badge key={i} variant="secondary">{industry}</Badge>
                    ))}
                    {freeZone.industries.length > 3 && (
                      <Badge variant="outline">+{freeZone.industries.length - 3} more</Badge>
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

          {freeZone.setupCost && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Setup Cost Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {typeof freeZone.setupCost === 'object' && freeZone.setupCost.description ? (
                  <p className="text-sm">{freeZone.setupCost.description}</p>
                ) : (
                  <p className="text-sm italic">Cost details available on request</p>
                )}
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
              {freeZone.benefits && freeZone.benefits.length > 0 ? (
                <ul className="space-y-2 list-disc pl-5">
                  {freeZone.benefits.map((benefit, index) => (
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
              {freeZone.requirements && freeZone.requirements.length > 0 ? (
                <ul className="space-y-2 list-disc pl-5">
                  {freeZone.requirements.map((requirement, index) => (
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
              {freeZone.licenseTypes && Array.isArray(freeZone.licenseTypes) && freeZone.licenseTypes.length > 0 ? (
                <div className="space-y-4">
                  {freeZone.licenseTypes.map((license, index) => (
                    <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                      <h4 className="font-medium">{license.name}</h4>
                      {license.description && (
                        <p className="text-sm text-muted-foreground mt-1">{license.description}</p>
                      )}
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
              {freeZone.facilities && Array.isArray(freeZone.facilities) && freeZone.facilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {freeZone.facilities.map((facility, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h4 className="font-medium">{facility.name}</h4>
                      {facility.description && (
                        <p className="text-sm text-muted-foreground mt-1">{facility.description}</p>
                      )}
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
              {/* This assumes FAQs are stored somewhere in the free zone object */}
              {freeZone.faqs && Array.isArray(freeZone.faqs) && freeZone.faqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {freeZone.faqs.map((faq, index) => (
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

      {freeZone.industries && freeZone.industries.length > 0 && (
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
              {freeZone.industries.map((industry, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1">
                  {industry}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {freeZone.setupCost && typeof freeZone.setupCost === 'object' && freeZone.setupCost.header && freeZone.setupCost.rows && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Landmark className="mr-2 h-5 w-5" />
              Detailed Setup Costs
            </CardTitle>
            <CardDescription>
              Fees and costs associated with setting up in {freeZone.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {freeZone.setupCost.header.map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {freeZone.setupCost.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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