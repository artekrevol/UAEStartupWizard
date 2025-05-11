import { useState } from 'react';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { trackUserAction } from '@/lib/user-tracker';
import { Lightbulb, Globe, Coins, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoalOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const goalOptions: GoalOption[] = [
  {
    id: 'enter-uae-market',
    label: 'Enter UAE Market',
    description: 'Focus on establishing a local presence to serve the UAE market',
    icon: <Lightbulb className="h-8 w-8" />
  },
  {
    id: 'access-global-markets',
    label: 'Access Global Markets',
    description: 'Use UAE as a strategic hub for international business operations',
    icon: <Globe className="h-8 w-8" />
  },
  {
    id: 'tax-benefits',
    label: 'Tax Benefits',
    description: 'Leverage UAE\'s favorable tax environment for business advantages',
    icon: <Coins className="h-8 w-8" />
  },
  {
    id: 'visa-residency',
    label: 'Visa & Residency',
    description: 'Obtain UAE residency through business establishment',
    icon: <Users className="h-8 w-8" />
  },
];

interface IntroductionStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function IntroductionStep({ 
  businessSetupData, 
  updateBusinessSetupData,
  onNext
}: IntroductionStepProps) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(
    businessSetupData.primaryGoal
  );
  const [showIntro, setShowIntro] = useState(true);

  const handleNext = () => {
    setShowIntro(false);
  };

  const handleSelect = (goalId: string) => {
    setSelectedGoal(goalId);
    updateBusinessSetupData('primaryGoal', goalId);
    
    // Track selection
    trackUserAction(
      'business_setup_selection',
      'IntroductionStep',
      {
        elementId: 'primaryGoalOption',
        interactionValue: goalId
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

  if (showIntro) {
    return (
      <motion.div 
        className="space-y-10 max-w-2xl mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-gray-900">
            Welcome to the UAE Business Setup Wizard
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            We'll guide you through the process of establishing your business in the UAE with a few simple questions.
          </p>
        </div>
        
        <div className="flex justify-center">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-left">
                <h3 className="font-medium text-base text-gray-900">Step-by-Step Guidance</h3>
                <p className="text-sm text-gray-500 mt-1">Clear instructions at each stage of the process</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-left">
                <h3 className="font-medium text-base text-gray-900">Expert Recommendations</h3>
                <p className="text-sm text-gray-500 mt-1">Tailored suggestions based on your specific needs</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-left">
                <h3 className="font-medium text-base text-gray-900">Save & Resume</h3>
                <p className="text-sm text-gray-500 mt-1">Return to your application at any time</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 text-left">
                <h3 className="font-medium text-base text-gray-900">Document Checklist</h3>
                <p className="text-sm text-gray-500 mt-1">Comprehensive list of everything you'll need</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        <Button 
          size="lg"
          className="mt-6 rounded-full px-8 py-6 text-base shadow-sm"
          onClick={handleNext}
        >
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      <motion.div 
        className="space-y-3 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-gray-900">
          What's your primary goal for establishing a business in the UAE?
        </h1>
        <p className="text-gray-600 text-lg mt-2 max-w-2xl mx-auto">
          This helps us recommend the most appropriate business setup options for your needs
        </p>
      </motion.div>

      <motion.div 
        className="space-y-4 mt-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {goalOptions.map((option) => (
          <motion.div key={option.id} variants={item}>
            <Card 
              className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                selectedGoal === option.id 
                  ? 'border-2 border-primary bg-white shadow-lg' 
                  : 'border border-gray-100 bg-white shadow-sm'
              }`}
              onClick={() => handleSelect(option.id)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className={`rounded-xl p-4 ${
                    selectedGoal === option.id 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-50 text-gray-500'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label className="text-lg font-medium text-gray-900">{option.label}</Label>
                    <p className="text-gray-600 text-base">{option.description}</p>
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