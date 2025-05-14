import { useState } from 'react';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { trackUserAction } from '@/lib/user-tracker';
import { Building2, Briefcase, Store, Factory, Building } from 'lucide-react';

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
    icon: <Building className="h-8 w-8" />
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
    trackUserAction(
      'business_setup_selection',
      'BusinessTypeStep',
      {
        elementId: 'businessTypeOption',
        interactionValue: typeId
      }
    );
    
    // Auto progress after selection
    setTimeout(onNext, 800);
  };

  // Animation variants for staggered animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <motion.div 
        className="space-y-2 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          What type of business are you establishing?
        </h1>
        <p className="text-muted-foreground text-lg mt-3">
          This helps us tailor your setup experience to your specific business needs
        </p>
      </motion.div>

      <motion.div 
        className="space-y-3 mt-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {businessTypeOptions.map((option) => (
          <motion.div key={option.id} variants={item}>
            <Card 
              className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                selectedType === option.id ? 'border-2 border-primary bg-primary/5 shadow-md' : ''
              }`}
              onClick={() => handleSelect(option.id)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`rounded-lg p-3 ${
                    selectedType === option.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-lg font-medium">{option.label}</Label>
                    <p className="text-muted-foreground text-sm sm:text-base">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}