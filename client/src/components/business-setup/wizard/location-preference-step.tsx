import { useState } from 'react';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { trackUserAction } from '@/lib/user-tracker';
import { Building, Building2, Compass, HelpCircle, Star, SearchCheck, Globe2, Shield, CreditCard, BarChart3 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import ComparisonView from '../common/comparison-view';

interface LocationPreferenceStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function LocationPreferenceStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: LocationPreferenceStepProps) {
  // Location preference state
  const [locationPreference, setLocationPreference] = useState<string | null>(
    businessSetupData.locationPreference || null
  );
  
  // State for the mini questionnaire when "not sure" is selected
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(
    businessSetupData.locationPriorities || []
  );
  
  // State for showing comparison view
  const [showComparison, setShowComparison] = useState(false);

  const handleSelect = (preference: string) => {
    setLocationPreference(preference);
    updateBusinessSetupData('locationPreference', preference);
    
    // If "not sure" is selected, show the questionnaire
    if (preference === 'not-sure') {
      setShowQuestionnaire(true);
      return;
    }
    
    // For mainland or free zone direct selection, proceed to next step
    // Track selection
    trackUserAction(
      'business_setup_selection',
      'LocationPreferenceStep',
      {
        elementId: 'locationPreferenceOption',
        interactionValue: preference
      }
    );
    
    // Auto progress after selection
    setTimeout(onNext, 800);
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    let newPriorities = [...priorities];
    
    if (checked) {
      newPriorities.push(priority);
    } else {
      newPriorities = newPriorities.filter(p => p !== priority);
    }
    
    setPriorities(newPriorities);
    updateBusinessSetupData('locationPriorities', newPriorities);
  };

  const handleQuestionnaireContinue = () => {
    // Determine recommendation based on selected priorities
    let recommendation = 'free-zone'; // Default recommendation
    
    // If local market access or government contracts are priorities, recommend mainland
    if (priorities.includes('local-market-access') || priorities.includes('government-contracts')) {
      recommendation = 'mainland';
    }
    
    // If 100% ownership or tax benefits are priorities, recommend free zone
    if (priorities.includes('foreign-ownership') || priorities.includes('tax-benefits')) {
      recommendation = 'free-zone';
    }
    
    // Save the recommendation
    updateBusinessSetupData('locationRecommendation', recommendation);
    
    // Track questionnaire completion
    trackUserAction(
      'business_setup_questionnaire',
      'LocationPreferenceStep',
      {
        elementId: 'prioritiesQuestionnaire',
        interactionValue: priorities.join(',')
      }
    );
    
    // Proceed to next step
    onNext();
  };

  // Animation variants
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

  const toggleComparison = () => {
    setShowComparison(prev => !prev);
    
    // Track comparison view usage
    trackUserAction(
      'business_setup_comparison',
      'LocationPreferenceStep',
      {
        elementId: 'locationComparisonButton',
        interactionValue: !showComparison ? 'opened' : 'closed'
      }
    );
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
          Do you have a preference for where to establish your business?
        </h1>
        <p className="text-muted-foreground text-lg mt-3">
          Based on your understanding of the options, select your preferred location type
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={toggleComparison}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          {showComparison ? 'Hide comparison' : 'Compare options'}
        </Button>
      </motion.div>
      
      {showComparison && (
        <ComparisonView comparisonType="location" />
      )}

      <AnimatePresence mode="wait">
        {showQuestionnaire ? (
          <motion.div
            key="questionnaire"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">What are your top priorities?</h2>
              <p className="text-muted-foreground">Select the factors that are most important to you</p>
            </div>
            
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="local-market-access" 
                      checked={priorities.includes('local-market-access')}
                      onCheckedChange={(checked) => 
                        handlePriorityChange('local-market-access', checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="local-market-access"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <Globe2 className="h-4 w-4 text-primary" />
                        Direct access to UAE local market
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Ability to conduct business throughout the UAE without restrictions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="foreign-ownership" 
                      checked={priorities.includes('foreign-ownership')}
                      onCheckedChange={(checked) => 
                        handlePriorityChange('foreign-ownership', checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="foreign-ownership"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4 text-primary" />
                        100% foreign ownership
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Complete control of your business without local partner requirements
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="tax-benefits" 
                      checked={priorities.includes('tax-benefits')}
                      onCheckedChange={(checked) => 
                        handlePriorityChange('tax-benefits', checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="tax-benefits"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4 text-primary" />
                        Tax benefits and exemptions
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Maximum tax advantages and financial incentives
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="government-contracts" 
                      checked={priorities.includes('government-contracts')}
                      onCheckedChange={(checked) => 
                        handlePriorityChange('government-contracts', checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="government-contracts"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <Star className="h-4 w-4 text-primary" />
                        Government contract eligibility
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Ability to bid for and secure government projects
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="low-cost" 
                      checked={priorities.includes('low-cost')}
                      onCheckedChange={(checked) => 
                        handlePriorityChange('low-cost', checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="low-cost"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <SearchCheck className="h-4 w-4 text-primary" />
                        Lower setup and operating costs
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Minimize initial investment and ongoing expenses
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleQuestionnaireContinue}
                disabled={priorities.length === 0}
                size="lg"
              >
                Get Recommendation
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="location-options"
            className="space-y-3 mt-8"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <RadioGroup value={locationPreference || ''} className="space-y-4">
              <motion.div variants={item}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    locationPreference === 'mainland' ? 'border-2 border-primary bg-primary/5 shadow-md' : ''
                  }`}
                  onClick={() => handleSelect('mainland')}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className={`rounded-lg p-3 ${
                        locationPreference === 'mainland' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <Building className="h-8 w-8" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-lg font-medium">Mainland</Label>
                        <p className="text-muted-foreground text-sm sm:text-base">
                          Full market access with ability to do business anywhere in the UAE
                        </p>
                      </div>
                      <RadioGroupItem value="mainland" id="mainland" className="sr-only" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    locationPreference === 'free-zone' ? 'border-2 border-primary bg-primary/5 shadow-md' : ''
                  }`}
                  onClick={() => handleSelect('free-zone')}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className={`rounded-lg p-3 ${
                        locationPreference === 'free-zone' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <Building2 className="h-8 w-8" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-lg font-medium">Free Zone</Label>
                        <p className="text-muted-foreground text-sm sm:text-base">
                          100% ownership with tax benefits and simplified setup process
                        </p>
                      </div>
                      <RadioGroupItem value="free-zone" id="free-zone" className="sr-only" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    locationPreference === 'not-sure' ? 'border-2 border-primary bg-primary/5 shadow-md' : ''
                  }`}
                  onClick={() => handleSelect('not-sure')}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className={`rounded-lg p-3 ${
                        locationPreference === 'not-sure' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <Compass className="h-8 w-8" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-lg font-medium">I'm not sure yet</Label>
                        <p className="text-muted-foreground text-sm sm:text-base">
                          Help me determine the best option based on my priorities
                        </p>
                      </div>
                      <RadioGroupItem value="not-sure" id="not-sure" className="sr-only" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </RadioGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}