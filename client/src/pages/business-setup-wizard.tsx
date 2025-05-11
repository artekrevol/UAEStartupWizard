import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Loader2, Bookmark, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackUserAction } from '@/lib/user-tracker';
import { useToast } from '@/hooks/use-toast';
import { useBusinessSetup, BusinessSetupData } from '@/hooks/useBusinessSetup';
import BusinessTypeStep from '@/components/business-setup/wizard/business-type-step';
import IndustrySectorStep from '@/components/business-setup/wizard/industry-sector-step';
import FreezoneStep from '@/components/business-setup/wizard/freezone-step';
import BusinessActivityStep from '@/components/business-setup/wizard/business-activity-step';
import LegalStructureStep from '@/components/business-setup/wizard/legal-structure-step';
import DocumentRequirementsStep from '@/components/business-setup/wizard/document-requirements-step';
import CompletionStep from '@/components/business-setup/wizard/completion-step';

// Re-export BusinessSetupData type for other components
export type { BusinessSetupData };

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  visitedSteps: number[];
}

function StepIndicator({ currentStep, totalSteps, visitedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex space-x-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentStep
                ? 'bg-primary w-4' // Current step: larger and primary color
                : visitedSteps.includes(index)
                ? 'bg-primary/60' // Visited steps: primary color with opacity
                : 'bg-gray-200' // Unvisited steps: gray
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {currentStep + 1}/{totalSteps}
      </span>
    </div>
  );
}

export default function BusinessSetupWizard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const {
    currentStep,
    direction,
    businessSetupData,
    updateBusinessSetupData,
    handleNext,
    handleBack,
    isLoadingSetup,
    canProceedToNextStep,
    saveProgress
  } = useBusinessSetup();

  // Track visited steps for the step indicator
  const [visitedSteps, setVisitedSteps] = useState<number[]>([0]);

  // Update visited steps when currentStep changes
  useEffect(() => {
    if (!visitedSteps.includes(currentStep)) {
      setVisitedSteps(prev => [...prev, currentStep]);
    }
  }, [currentStep, visitedSteps]);
  
  const steps = [
    { title: "Business Type", component: BusinessTypeStep },
    { title: "Industry Sector", component: IndustrySectorStep, condition: () => !!businessSetupData.businessType },
    { title: "Free Zone", component: FreezoneStep, condition: () => !!businessSetupData.industrySector },
    { title: "Business Activity", component: BusinessActivityStep, condition: () => !!businessSetupData.selectedFreeZone },
    { title: "Legal Structure", component: LegalStructureStep, condition: () => !!businessSetupData.businessActivity },
    { title: "Document Requirements", component: DocumentRequirementsStep, condition: () => !!businessSetupData.legalStructure },
    { title: "Complete", component: CompletionStep }
  ];

  const handleExit = () => {
    navigate('/');
    
    // Track exit
    trackUserAction(
      'business_setup_exit',
      'BusinessSetupWizard',
      {
        elementId: 'exitButton'
      }
    );
  };

  const handleSaveProgress = () => {
    saveProgress();
    toast({
      title: "Progress saved",
      description: "You can resume your business setup later.",
      action: (
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          Go to Dashboard
        </Button>
      ),
    });
  };

  if (isLoadingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Apply conditional step logic to determine if step should be shown
  const filteredSteps = steps.filter((step, index) => {
    // If there's no condition or it's the first or last step, always show it
    if (!step.condition || index === 0 || index === steps.length - 1) return true;
    // Otherwise, check the condition
    return step.condition();
  });

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b z-10 py-3 px-4">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExit} className="text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSaveProgress}
              className="text-muted-foreground"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Save progress</span>
            </Button>
          </div>
          
          <StepIndicator 
            currentStep={currentStep} 
            totalSteps={steps.length}
            visitedSteps={visitedSteps} 
          />
        </div>
        <div className="max-w-3xl mx-auto w-full mt-1">
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-20 pb-28 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={direction === 'forward' ? { y: 20, opacity: 0 } : { y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={direction === 'forward' ? { y: -20, opacity: 0 } : { y: 20, opacity: 0 }}
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
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t z-10 py-4 px-4">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="rounded-full"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              className="rounded-full transition-all"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleExit}
              className="rounded-full bg-green-600 hover:bg-green-700"
            >
              Finish
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}