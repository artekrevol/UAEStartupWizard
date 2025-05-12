import { useState } from 'react';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackUserAction } from '@/lib/user-tracker';
import { motion } from 'framer-motion';
import { Building, Building2, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BusinessLocationEducationStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function BusinessLocationEducationStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: BusinessLocationEducationStepProps) {
  const [educationComplete, setEducationComplete] = useState<boolean>(
    businessSetupData.educationComplete || false
  );

  const handleContinue = () => {
    updateBusinessSetupData('educationComplete', true);
    setEducationComplete(true);
    
    // Track completion of educational content
    trackUserAction(
      'business_setup_education',
      'BusinessLocationEducationStep',
      {
        elementId: 'continueButton',
        interactionValue: 'completed'
      }
    );
    
    // Progress to next step
    setTimeout(onNext, 400);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut"
      }
    },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  // Tooltip component with question icon
  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-muted">
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">Info</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <motion.div 
        className="space-y-2 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Understanding Business Locations in the UAE
        </h1>
        <p className="text-muted-foreground text-lg mt-3">
          Before choosing a specific location, it's important to understand the key differences between the main options
        </p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={fadeIn}>
          <Card className="overflow-hidden border-2 border-primary/20">
            <div className="bg-primary/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-full">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl">Mainland</h3>
              </div>
              <InfoTooltip content="A mainland business is established under the UAE Commercial Companies Law and regulated by the Department of Economic Development (DED)." />
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Key Features</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Full access to UAE local market</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>No restrictions on business activities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Ability to bid for government contracts</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Considerations</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Ownership:</span>
                      <span>May require local sponsor (51% local ownership)*</span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Costs:</span>
                      <span>Generally higher setup and renewal fees</span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Office:</span>
                      <span>Physical office space required</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">*Certain activities may qualify for 100% foreign ownership</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Card className="overflow-hidden border-2 border-primary/20">
            <div className="bg-primary/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-full">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl">Free Zone</h3>
              </div>
              <InfoTooltip content="Free Zones are special economic zones with their own regulations, offering incentives to attract foreign investment." />
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Key Features</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>100% foreign ownership</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Tax benefits and exemptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Simplified setup procedures</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Considerations</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Market Access:</span>
                      <span>Restrictions on doing business directly in the UAE local market</span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Activities:</span>
                      <span>Limited to activities permitted by the specific free zone</span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      <span className="font-medium">Office:</span>
                      <span>Virtual office options available in many free zones</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center mt-8"
      >
        <Button 
          size="lg" 
          onClick={handleContinue}
          className="px-8"
        >
          I understand the differences
        </Button>
      </motion.div>
    </div>
  );
}