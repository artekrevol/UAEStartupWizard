import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { trackUserAction } from '@/lib/user-tracker';
import BusinessTypeStep from '@/components/business-setup/wizard/business-type-step';
import IndustrySectorStep from '@/components/business-setup/wizard/industry-sector-step';
import FreezoneStep from '@/components/business-setup/wizard/freezone-step';
import BusinessActivityStep from '@/components/business-setup/wizard/business-activity-step';
import LegalStructureStep from '@/components/business-setup/wizard/legal-structure-step';
import DocumentRequirementsStep from '@/components/business-setup/wizard/document-requirements-step';
import CompletionStep from '@/components/business-setup/wizard/completion-step';

export type BusinessSetupData = {
  businessType: string | null;
  industrySector: string | null;
  selectedFreeZone: number | null;
  businessActivity: string | null;
  legalStructure: string | null;
  budget: string | null;
  timeline: string | null;
  requirements: Record<string, any> | null;
};

export default function BusinessSetupWizard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [businessSetupData, setBusinessSetupData] = useState<BusinessSetupData>({
    businessType: null,
    industrySector: null,
    selectedFreeZone: null,
    businessActivity: null,
    legalStructure: null,
    budget: null,
    timeline: null,
    requirements: null
  });

  // Fetch existing business setup data if it exists
  const { data: existingSetup, isLoading: isLoadingSetup } = useQuery({
    queryKey: ['/api/business-setup'],
    queryFn: async () => {
      const res = await fetch('/api/business-setup');
      if (!res.ok) throw new Error('Failed to fetch business setup data');
      return res.json();
    },
    retry: false
  });

  // Save or update business setup data
  const saveBusinessSetupMutation = useMutation({
    mutationFn: async (data: BusinessSetupData) => {
      if (existingSetup?.id) {
        // Update existing record
        return apiRequest('PATCH', `/api/business-setup/${existingSetup.id}`, data);
      } else {
        // Create new record
        return apiRequest('POST', '/api/business-setup', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-setup'] });
      toast({
        title: "Progress saved",
        description: "Your business setup progress has been saved.",
      });
      
      // Track successful save
      trackUserAction(
        'business_setup_progress',
        'BusinessSetupWizard',
        {
          elementId: 'saveProgress',
          success: true
        }
      );
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
      
      // Track error
      trackUserAction(
        'business_setup_progress',
        'BusinessSetupWizard',
        {
          elementId: 'saveProgress',
          success: false,
          interactionValue: error.message
        }
      );
    },
  });

  // Load existing data if available
  useEffect(() => {
    if (existingSetup) {
      setBusinessSetupData({
        businessType: existingSetup.businessType,
        industrySector: existingSetup.industrySector || existingSetup.businessActivity, // Backwards compatibility
        selectedFreeZone: existingSetup.selectedFreeZone,
        businessActivity: existingSetup.businessActivity,
        legalStructure: existingSetup.legalStructure,
        budget: existingSetup.budget,
        timeline: existingSetup.timeline,
        requirements: existingSetup.requirements
      });
    }
  }, [existingSetup]);

  const steps = [
    { title: "Business Type", component: BusinessTypeStep },
    { title: "Industry Sector", component: IndustrySectorStep },
    { title: "Free Zone", component: FreezoneStep },
    { title: "Business Activity", component: BusinessActivityStep },
    { title: "Legal Structure", component: LegalStructureStep },
    { title: "Document Requirements", component: DocumentRequirementsStep },
    { title: "Complete", component: CompletionStep }
  ];

  const updateBusinessSetupData = (key: keyof BusinessSetupData, value: any) => {
    setBusinessSetupData(prev => {
      const newData = { ...prev, [key]: value };
      
      // Save progress automatically
      saveBusinessSetupMutation.mutate(newData);
      
      return newData;
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
      
      // Track step completion
      trackUserAction(
        'business_setup_step_complete',
        'BusinessSetupWizard',
        {
          elementId: 'nextButton',
          interactionValue: steps[currentStep].title
        }
      );
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
      
      // Track going back
      trackUserInteraction({
        interactionType: 'business_setup_step_back',
        component: 'BusinessSetupWizard',
        elementId: 'backButton',
        interactionValue: steps[currentStep].title
      });
    }
  };

  const handleExit = () => {
    navigate('/');
    
    // Track exit
    trackUserInteraction({
      interactionType: 'business_setup_exit',
      component: 'BusinessSetupWizard',
      elementId: 'exitButton'
    });
  };

  if (isLoadingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-10 py-3 px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Progress value={progress} className="w-40 h-2" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-20 pb-28">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={direction === 'forward' ? { x: 20, opacity: 0 } : { x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={direction === 'forward' ? { x: -20, opacity: 0 } : { x: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full"
            >
              <CurrentStepComponent 
                businessSetupData={businessSetupData}
                updateBusinessSetupData={updateBusinessSetupData}
                onNext={handleNext}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t z-10 py-4 px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleExit}>
              Finish
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}