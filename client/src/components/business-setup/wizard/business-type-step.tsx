import { useState } from 'react';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trackUserAction } from '@/lib/user-tracker';
import { Building2, Briefcase, Store, Factory, BuildingCommunity } from 'lucide-react';

interface BusinessTypeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const businessTypeOptions: BusinessTypeOption[] = [
  {
    id: 'small-business',
    label: 'Small Business',
    description: 'For sole traders and micro businesses with simple needs',
    icon: <Store className="h-8 w-8" />
  },
  {
    id: 'professional-services',
    label: 'Professional Services',
    description: 'For consultants, advisors, and specialized service providers',
    icon: <Briefcase className="h-8 w-8" />
  },
  {
    id: 'tech-startup',
    label: 'Tech Startup',
    description: 'For innovative technology companies seeking growth',
    icon: <Building2 className="h-8 w-8" />
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    description: 'For production facilities and industrial operations',
    icon: <Factory className="h-8 w-8" />
  },
  {
    id: 'corporate',
    label: 'Corporate Entity',
    description: 'For large established businesses and holding companies',
    icon: <BuildingCommunity className="h-8 w-8" />
  },
];

interface BusinessTypeStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function BusinessTypeStep({ 
  businessSetupData, 
  updateBusinessSetupData,
  onNext
}: BusinessTypeStepProps) {
  const [selectedType, setSelectedType] = useState<string | null>(
    businessSetupData.businessType
  );

  const handleSelect = (typeId: string) => {
    setSelectedType(typeId);
    updateBusinessSetupData('businessType', typeId);
    
    // Track selection
    trackUserAction({
      interactionType: 'business_setup_selection',
      component: 'BusinessTypeStep',
      elementId: 'businessTypeOption',
      interactionValue: typeId
    });
    
    // Auto progress after selection
    setTimeout(onNext, 500);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">What type of business are you establishing?</h1>
        <p className="text-muted-foreground">
          This helps us tailor your setup experience to your specific business needs
        </p>
      </div>

      <div className="space-y-4">
        {businessTypeOptions.map((option) => (
          <Card 
            key={option.id}
            className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedType === option.id ? 'border-2 border-primary bg-primary/5' : ''
            }`}
            onClick={() => handleSelect(option.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`rounded-lg p-2 ${selectedType === option.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {option.icon}
                </div>
                <div className="space-y-1">
                  <Label className="text-lg font-medium">{option.label}</Label>
                  <p className="text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}