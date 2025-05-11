import { useState } from 'react';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trackUserAction } from '@/lib/user-tracker';
import { Shield, Users, User, Building, Landmark, Info } from 'lucide-react';
import { LEGAL_FORMS } from '@shared/schema';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Descriptions and details for each legal structure type
const LEGAL_FORM_DETAILS: Record<string, {
  icon: React.ReactNode;
  description: string;
  details: Record<string, string>;
}> = {
  "LLC": {
    icon: <Shield className="h-8 w-8" />,
    description: "Limited Liability Company - The most common type for foreign investors",
    details: {
      "Liability": "Limited to capital contribution",
      "Ownership": "51% UAE national, 49% foreign (with some exceptions)",
      "Capital": "Min. AED 300,000 (can vary by emirate)",
      "Management": "By UAE national partner or appointed managers"
    }
  },
  "Free Zone Company": {
    icon: <Building className="h-8 w-8" />,
    description: "100% foreign ownership with tax and customs benefits for specific free zones",
    details: {
      "Liability": "Limited to capital contribution",
      "Ownership": "100% foreign ownership allowed",
      "Capital": "Varies by free zone (AED 50,000-1,000,000)",
      "Restrictions": "Cannot operate directly in mainland UAE"
    }
  },
  "Sole Establishment": {
    icon: <User className="h-8 w-8" />,
    description: "Single-owner entity for individual entrepreneurs",
    details: {
      "Liability": "Unlimited personal liability",
      "Ownership": "Available to UAE/GCC nationals only",
      "Capital": "No minimum requirement",
      "Management": "By the owner directly"
    }
  },
  "Civil Company": {
    icon: <Users className="h-8 w-8" />,
    description: "Partnership for professional services like law, engineering, or medicine",
    details: {
      "Liability": "Unlimited joint liability",
      "Ownership": "Available to professionals with valid licenses",
      "Capital": "No minimum requirement",
      "Activities": "Restricted to professional services only"
    }
  },
  "Branch of Foreign Company": {
    icon: <Building className="h-8 w-8" />,
    description: "Extension of an existing foreign company",
    details: {
      "Liability": "Parent company bears full liability",
      "Ownership": "100% foreign ownership allowed",
      "Capital": "No minimum requirement",
      "Requirements": "Requires local service agent (not a sponsor)"
    }
  },
  "Representative Office": {
    icon: <Info className="h-8 w-8" />,
    description: "Limited operation for marketing and liasing without commercial activities",
    details: {
      "Liability": "Parent company bears liability",
      "Ownership": "100% foreign ownership allowed",
      "Restrictions": "Cannot generate revenue in UAE",
      "Purpose": "Marketing, liaison, market research only"
    }
  },
  "Public Joint Stock Company (PJSC)": {
    icon: <Landmark className="h-8 w-8" />,
    description: "Large companies with publicly traded shares",
    details: {
      "Liability": "Limited to share value",
      "Ownership": "Min. 51% UAE/GCC nationals",
      "Capital": "Min. AED 30 million",
      "Shareholders": "Minimum 10 founding shareholders"
    }
  },
  "Private Joint Stock Company": {
    icon: <Landmark className="h-8 w-8" />,
    description: "Companies with private subscription of shares",
    details: {
      "Liability": "Limited to share value",
      "Ownership": "Min. 51% UAE/GCC nationals",
      "Capital": "Min. AED 5 million",
      "Shareholders": "Minimum 3, maximum 200 shareholders"
    }
  },
  "Partnership": {
    icon: <Users className="h-8 w-8" />,
    description: "Entity jointly owned by two or more partners",
    details: {
      "Liability": "Unlimited joint liability",
      "Ownership": "Available to UAE nationals only",
      "Structure": "Min. 2 partners, max. unlimited",
      "Management": "By all partners or specified partners"
    }
  },
  "Limited Partnership": {
    icon: <Users className="h-8 w-8" />,
    description: "Partnership with limited and general partners",
    details: {
      "Liability": "General: unlimited, Limited: limited to capital",
      "Ownership": "General partners must be UAE nationals",
      "Structure": "At least one general and one limited partner",
      "Management": "By general partners only"
    }
  }
};

interface LegalStructureStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function LegalStructureStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: LegalStructureStepProps) {
  const [selectedLegalForm, setSelectedLegalForm] = useState<string | null>(
    businessSetupData.legalStructure
  );

  // Get values from previous steps
  const selectedFreeZoneId = businessSetupData.selectedFreeZone;
  
  // Filter legal forms based on previous selections
  const filteredLegalForms = LEGAL_FORMS.filter(form => {
    // If a free zone is selected, prioritize Free Zone Company
    if (selectedFreeZoneId && form === "Free Zone Company") {
      return true;
    }
    
    // If a free zone is selected, exclude entities that can't operate in free zones
    if (selectedFreeZoneId && 
        (form === "Sole Establishment" || 
         form === "Partnership" || 
         form === "Limited Partnership")) {
      return false;
    }
    
    return true;
  });

  // Sort to put recommended options first
  const sortedLegalForms = [...filteredLegalForms].sort((a, b) => {
    // If free zone is selected, put "Free Zone Company" first
    if (selectedFreeZoneId) {
      if (a === "Free Zone Company") return -1;
      if (b === "Free Zone Company") return 1;
    }
    return 0;
  });

  const handleSelect = (legalForm: string) => {
    setSelectedLegalForm(legalForm);
    updateBusinessSetupData('legalStructure', legalForm);
    
    // Track selection
    trackUserAction({
      interactionType: 'business_setup_selection',
      component: 'LegalStructureStep',
      elementId: 'legalStructureOption',
      interactionValue: legalForm
    });
    
    // Auto progress after selection
    setTimeout(onNext, 800);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Choose a Legal Structure</h1>
        <p className="text-muted-foreground">
          The legal structure affects ownership, liability, and operations of your business
        </p>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
        {sortedLegalForms.map((legalForm) => {
          const details = LEGAL_FORM_DETAILS[legalForm] || {
            icon: <Building className="h-8 w-8" />,
            description: "Legal entity type for business operations",
            details: {}
          };
          
          const isRecommended = 
            (selectedFreeZoneId && legalForm === "Free Zone Company") ||
            (!selectedFreeZoneId && legalForm === "LLC");
          
          return (
            <Card
              key={legalForm}
              className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                selectedLegalForm === legalForm ? 'border-2 border-primary bg-primary/5' : ''
              } ${isRecommended ? 'border-green-200' : ''}`}
              onClick={() => handleSelect(legalForm)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2 ${
                    selectedLegalForm === legalForm 
                      ? 'bg-primary text-primary-foreground' 
                      : isRecommended 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-muted'
                  }`}>
                    {details.icon}
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center">
                      <Label className="text-lg font-medium">{legalForm}</Label>
                      {isRecommended && (
                        <span className="text-xs ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    
                    <CardDescription>
                      {details.description}
                    </CardDescription>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      {Object.entries(details.details).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            // This could open a more detailed modal in the future
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Click for more information about {legalForm}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}