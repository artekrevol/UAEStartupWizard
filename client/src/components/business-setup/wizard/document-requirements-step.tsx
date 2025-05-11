import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { trackUserAction } from '@/lib/user-tracker';
import { FileText, Download, CheckCircle, Loader2, AlertTriangle, Link2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: 'personal' | 'business' | 'government' | 'financial';
  downloadUrl?: string;
  templateAvailable?: boolean;
  attestationRequired?: boolean;
  sampleAvailable?: boolean;
}

interface DocumentRequirementsStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function DocumentRequirementsStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: DocumentRequirementsStepProps) {
  // Get values from previous steps
  const businessType = businessSetupData.businessType;
  const selectedFreeZoneId = businessSetupData.selectedFreeZone;
  const legalStructure = businessSetupData.legalStructure;
  
  // Track acknowledged requirements
  const [acknowledgedRequirements, setAcknowledgedRequirements] = useState<Record<string, boolean>>({});
  
  // Initialize from existing data if available
  useEffect(() => {
    if (businessSetupData.requirements) {
      setAcknowledgedRequirements(
        businessSetupData.requirements.acknowledged || {}
      );
    }
  }, [businessSetupData.requirements]);

  // Query to fetch document requirements
  const { data: requirementsList = [], isLoading } = useQuery<DocumentRequirement[]>({
    queryKey: ['/api/document-requirements', { 
      businessType,
      freeZoneId: selectedFreeZoneId,
      legalStructure
    }],
    // Only fetch if we have the necessary data from previous steps
    enabled: !!businessType && !!legalStructure,
    // If backend doesn't support this yet, we'll provide some example data
    placeholderData: getPlaceholderRequirements()
  });

  // Toggle acknowledgment of a requirement
  const toggleAcknowledgment = (requirementId: string) => {
    setAcknowledgedRequirements(prev => {
      const newState = { 
        ...prev, 
        [requirementId]: !prev[requirementId] 
      };
      
      // Update the business setup data with the new acknowledgments
      updateBusinessSetupData('requirements', {
        ...businessSetupData.requirements,
        acknowledged: newState
      });
      
      return newState;
    });
    
    // Track interaction
    trackUserAction(
      'business_setup_requirement_acknowledgment',
      'DocumentRequirementsStep',
      {
        elementId: `requirement-${requirementId}`,
        interactionValue: (!acknowledgedRequirements[requirementId]).toString()
      }
    );
  };

  // Group requirements by category
  const groupedRequirements: Record<string, DocumentRequirement[]> = requirementsList.reduce(
    (acc, requirement) => {
      if (!acc[requirement.category]) {
        acc[requirement.category] = [];
      }
      acc[requirement.category].push(requirement);
      return acc;
    }, 
    {} as Record<string, DocumentRequirement[]>
  );

  // Check if all requirements have been acknowledged
  const allRequirementsAcknowledged = requirementsList.every(
    req => req.required ? acknowledgedRequirements[req.id] : true
  );

  // Function to handle download (placeholder for now)
  const handleDownload = (requirementId: string) => {
    // This would eventually link to actual document templates
    trackUserAction(
      'document_download',
      'DocumentRequirementsStep',
      { elementId: `download-${requirementId}` }
    );
  };

  // Handle continuing to next step
  const handleContinue = () => {
    // Track acknowledgment
    trackUserAction(
      'business_setup_step_complete',
      'DocumentRequirementsStep',
      {
        elementId: 'continueButton',
        interactionValue: 'document_requirements_acknowledged'
      }
    );
    
    onNext();
  };

  // Helper function to get category title
  const getCategoryTitle = (category: string): string => {
    switch(category) {
      case 'personal': return 'Personal Documents';
      case 'business': return 'Business Documents';
      case 'government': return 'Government Approvals';
      case 'financial': return 'Financial Documents';
      default: return 'Other Documents';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Document Requirements</h1>
        <p className="text-muted-foreground">
          Review the documents you'll need to establish your business
        </p>
      </div>

      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={Object.keys(groupedRequirements)}>
          {Object.entries(groupedRequirements).map(([category, requirements]) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-lg font-medium">
                {getCategoryTitle(category)}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 mt-2">
                  {requirements.map((requirement) => (
                    <Card key={requirement.id} className="border border-muted">
                      <CardContent className="p-4 pt-4">
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            <Checkbox 
                              id={`requirement-${requirement.id}`}
                              checked={!!acknowledgedRequirements[requirement.id]}
                              onCheckedChange={() => toggleAcknowledgment(requirement.id)}
                            />
                          </div>
                          
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Label 
                                htmlFor={`requirement-${requirement.id}`}
                                className={`text-base font-medium ${requirement.required ? 'after:content-["*"] after:text-red-500 after:ml-0.5' : ''}`}
                              >
                                {requirement.name}
                              </Label>
                              
                              {requirement.required ? (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                  Required
                                </span>
                              ) : (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                  Optional
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {requirement.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {requirement.templateAvailable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => handleDownload(requirement.id)}
                                >
                                  <Download className="h-3 w-3" />
                                  Template
                                </Button>
                              )}
                              
                              {requirement.sampleAvailable && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => handleDownload(`sample-${requirement.id}`)}
                                >
                                  <FileText className="h-3 w-3" />
                                  Sample
                                </Button>
                              )}
                              
                              {requirement.attestationRequired && (
                                <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Attestation required
                                </span>
                              )}
                              
                              {requirement.downloadUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  asChild
                                >
                                  <a 
                                    href={requirement.downloadUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      trackUserAction(
                                        'external_link_click',
                                        'DocumentRequirementsStep',
                                        { elementId: `external-link-${requirement.id}` }
                                      );
                                    }}
                                  >
                                    <Link2 className="h-3 w-3" />
                                    More info
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <Button
          className="gap-2"
          disabled={!allRequirementsAcknowledged}
          onClick={handleContinue}
        >
          {allRequirementsAcknowledged ? (
            <>
              <CheckCircle className="h-4 w-4" />
              I understand the document requirements
            </>
          ) : (
            'Please acknowledge all required documents'
          )}
        </Button>
        
        {!allRequirementsAcknowledged && (
          <p className="text-center text-sm text-muted-foreground">
            Please check all required document requirements to continue
          </p>
        )}
      </div>
    </div>
  );
}

// Placeholder function to generate example requirements
// This would be replaced with actual API data
function getPlaceholderRequirements(): DocumentRequirement[] {
  return [
    {
      id: 'passport',
      name: 'Passport copies',
      description: 'Color copy of passport for all shareholders/directors with validity of at least 6 months',
      required: true,
      category: 'personal',
    },
    {
      id: 'visa',
      name: 'Residency visa',
      description: 'Valid UAE residency visa for all shareholders/directors',
      required: true,
      category: 'personal',
    },
    {
      id: 'emirates-id',
      name: 'Emirates ID',
      description: 'Copy of Emirates ID for all UAE residents',
      required: true,
      category: 'personal',
    },
    {
      id: 'photos',
      name: 'Passport photos',
      description: 'Recent passport-size photos with white background',
      required: true,
      category: 'personal',
    },
    {
      id: 'business-plan',
      name: 'Business plan',
      description: 'Detailed business plan including executive summary, market analysis, and financial projections',
      required: true,
      category: 'business',
      templateAvailable: true,
      sampleAvailable: true,
    },
    {
      id: 'moa',
      name: 'Memorandum of Association',
      description: 'Legal document outlining the company structure, responsibilities, and powers',
      required: true,
      category: 'business',
      templateAvailable: true,
      attestationRequired: true,
    },
    {
      id: 'noc-sponsor',
      name: 'NOC from sponsor',
      description: 'No Objection Certificate from UAE sponsor (for mainland companies)',
      required: false,
      category: 'business',
    },
    {
      id: 'tenancy-contract',
      name: 'Office lease agreement',
      description: 'Valid office space lease agreement registered with Ejari',
      required: true,
      category: 'business',
    },
    {
      id: 'initial-approval',
      name: 'Initial approval',
      description: 'Initial approval from Department of Economic Development',
      required: true,
      category: 'government',
      downloadUrl: 'https://ded.ae/initial-approval'
    },
    {
      id: 'trade-name-approval',
      name: 'Trade name approval',
      description: 'Approved trade name reservation certificate',
      required: true,
      category: 'government',
    },
    {
      id: 'external-approvals',
      name: 'External department approvals',
      description: 'Approvals from relevant authorities based on business activity',
      required: false,
      category: 'government',
    },
    {
      id: 'bank-reference',
      name: 'Bank reference letter',
      description: 'Reference letter from home country bank showing good standing',
      required: false,
      category: 'financial',
      sampleAvailable: true,
    },
    {
      id: 'capital-deposit',
      name: 'Capital deposit certificate',
      description: 'Bank certificate confirming deposit of share capital',
      required: true,
      category: 'financial',
    },
    {
      id: 'financial-statements',
      name: 'Financial statements',
      description: 'Audited financial statements for existing companies',
      required: false,
      category: 'financial',
    },
  ];
}