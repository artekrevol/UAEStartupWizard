import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { trackUserAction } from '@/lib/user-tracker';
import { useAuth } from '@/hooks/use-auth';
import { 
  CheckCircle, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Download, 
  ArrowRight,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CompletionStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function CompletionStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: CompletionStepProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Query to fetch business setup summary
  const { data: freeZone } = useQuery({
    queryKey: ['/api/free-zones', businessSetupData.selectedFreeZone],
    enabled: !!businessSetupData.selectedFreeZone,
  });

  // Track completion on mount
  useEffect(() => {
    trackUserAction(
      'business_setup_complete',
      'CompletionStep',
      {
        elementId: 'wizardCompletion',
        businessType: businessSetupData.businessType,
        industrySector: businessSetupData.industrySector,
        selectedFreeZone: businessSetupData.selectedFreeZone,
        legalStructure: businessSetupData.legalStructure
      }
    );
    
    // Update the timeline if not already set
    if (!businessSetupData.timeline) {
      updateBusinessSetupData('timeline', estimateTimeline());
    }
  }, []);

  // Estimate a timeline based on selections
  const estimateTimeline = (): string => {
    // This would eventually be calculated based on actual data
    const baseTime = 14; // 2 weeks base time
    
    // Add time for legal structure complexity
    const legalStructureTime = 
      businessSetupData.legalStructure === "LLC" ? 7 :
      businessSetupData.legalStructure === "Free Zone Company" ? 5 :
      businessSetupData.legalStructure === "Branch of Foreign Company" ? 14 :
      businessSetupData.legalStructure === "Public Joint Stock Company (PJSC)" ? 30 :
      7; // default
    
    const totalDays = baseTime + legalStructureTime;
    
    return `${totalDays} days`;
  };

  const handleDashboard = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/auth?redirectTo=/');
    }
    
    trackUserAction(
      'button_click',
      'CompletionStep',
      { elementId: 'dashboardButton', authenticated: !!user }
    );
  };

  const handleDocuments = () => {
    if (user) {
      navigate('/documents');
    } else {
      navigate('/auth?redirectTo=/documents');
    }
    
    trackUserAction(
      'button_click',
      'CompletionStep',
      { elementId: 'documentsButton', authenticated: !!user }
    );
  };

  const handleSupport = () => {
    if (user) {
      navigate('/support');
    } else {
      navigate('/auth?redirectTo=/support');
    }
    
    trackUserAction(
      'button_click',
      'CompletionStep',
      { elementId: 'supportButton', authenticated: !!user }
    );
  };

  const handleDownloadSummary = () => {
    // This would eventually generate a PDF summary
    trackUserAction(
      'document_download',
      'CompletionStep',
      { elementId: 'downloadSummaryButton' }
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.2
          }}
          className="flex justify-center"
        >
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-3xl font-bold">Setup Plan Complete!</h1>
          <p className="text-muted-foreground mt-2">
            We've created your customized business setup plan
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold">Your Business Summary</h2>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Business Type</p>
                <p className="font-medium">{businessSetupData.businessType}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-medium">{businessSetupData.industrySector}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Free Zone</p>
                <p className="font-medium">{freeZone?.name || businessSetupData.freeZoneName || 'Selected Free Zone'}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Business Activity</p>
                <p className="font-medium">{businessSetupData.businessActivityName || businessSetupData.businessActivity || 'Selected Business Activity'}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Legal Structure</p>
                <p className="font-medium">{businessSetupData.legalStructure || 'Selected Legal Structure'}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Estimated Timeline</p>
                <p className="font-medium">{businessSetupData.timeline || estimateTimeline()}</p>
              </div>
            </div>
            
            <Separator className="my-2" />
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={handleDownloadSummary}
              >
                <Download className="h-4 w-4" />
                Download Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold">Next Steps</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-lg font-medium mb-2">Track Your Progress</h3>
              <p className="text-muted-foreground mb-4 flex-1">
                Monitor your application progress and complete remaining tasks
              </p>
              
              <Button onClick={handleDashboard} className="mt-auto">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-lg font-medium mb-2">Prepare Documents</h3>
              <p className="text-muted-foreground mb-4 flex-1">
                Start gathering the required documents for your business registration
              </p>
              
              <Button onClick={handleDocuments} className="mt-auto">
                View Document Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-all md:col-span-2">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3 w-12 h-12 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-1">Need assistance?</h3>
                <p className="text-muted-foreground">
                  Our experts are ready to help you with the next steps in your business setup journey
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleSupport}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}