import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { trackUserAction } from '@/lib/user-tracker';

export type BusinessSetupData = {
  // New intro fields
  primaryGoal: string | null;
  
  // Original fields
  businessType: string | null;
  industrySector: string | null;
  
  // New location fields
  educationComplete: boolean;
  locationPreference: string | null; 
  locationPriorities: string[];
  locationRecommendation: string | null;
  
  // Remaining fields
  selectedFreeZone: number | null;
  businessActivity: string | null;
  legalStructure: string | null;
  budget: string | null;
  timeline: string | null;
  requirements: Record<string, any> | null;
  lastCompletedStep?: number;
};

export function useBusinessSetup() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [businessSetupData, setBusinessSetupData] = useState<BusinessSetupData>({
    // New intro fields
    primaryGoal: null,
    
    // Original fields
    businessType: null,
    industrySector: null,
    
    // New location fields
    educationComplete: false,
    locationPreference: null,
    locationPriorities: [],
    locationRecommendation: null,
    
    // Remaining fields
    selectedFreeZone: null,
    businessActivity: null,
    legalStructure: null,
    budget: null,
    timeline: null,
    requirements: null,
    lastCompletedStep: 0
  });

  // Fetch existing business setup data if it exists
  const { data: existingSetup, isLoading: isLoadingSetup } = useQuery({
    queryKey: ['/api/business-setup'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/business-setup');
        if (!res.ok) {
          // For demo purposes, use local storage if API fails
          const savedData = localStorage.getItem('business_setup_demo');
          if (savedData) return JSON.parse(savedData);
          return null;
        }
        return res.json();
      } catch (err) {
        // For demo purposes, use local storage if API fails
        const savedData = localStorage.getItem('business_setup_demo');
        if (savedData) return JSON.parse(savedData);
        return null;
      }
    },
    retry: false
  });

  // Save or update business setup data
  const saveBusinessSetupMutation = useMutation({
    mutationFn: async (data: BusinessSetupData) => {
      try {
        if (existingSetup?.id) {
          // Update existing record
          return await apiRequest('PATCH', `/api/business-setup/${existingSetup.id}`, data);
        } else {
          // Create new record
          return await apiRequest('POST', '/api/business-setup', data);
        }
      } catch (error) {
        // For demo purposes, save to local storage
        localStorage.setItem('business_setup_demo', JSON.stringify({
          ...data,
          id: 'demo-id'
        }));
        // Return mock data to prevent error handling
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/business-setup'] });
      
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
      const newData = {
        // New intro fields
        primaryGoal: existingSetup.primaryGoal || null,
        
        // Original fields
        businessType: existingSetup.businessType,
        industrySector: existingSetup.industrySector || existingSetup.businessActivity, // Backwards compatibility
        
        // New location fields
        educationComplete: existingSetup.educationComplete || false,
        locationPreference: existingSetup.locationPreference || null,
        locationPriorities: existingSetup.locationPriorities || [],
        locationRecommendation: existingSetup.locationRecommendation || null,
        
        // Remaining fields
        selectedFreeZone: existingSetup.selectedFreeZone,
        businessActivity: existingSetup.businessActivity,
        legalStructure: existingSetup.legalStructure,
        budget: existingSetup.budget,
        timeline: existingSetup.timeline,
        requirements: existingSetup.requirements,
        lastCompletedStep: existingSetup.lastCompletedStep || 0
      };
      
      setBusinessSetupData(newData);
      
      // Resume from last completed step if available
      if (existingSetup.lastCompletedStep) {
        // Go to the next incomplete step
        setCurrentStep(Math.min(existingSetup.lastCompletedStep + 1, 9)); // 9 is the new max steps
      }
    }
  }, [existingSetup]);

  const updateBusinessSetupData = (key: keyof BusinessSetupData, value: any) => {
    setBusinessSetupData(prev => {
      const newData = { ...prev, [key]: value };
      
      // Save progress automatically
      saveBusinessSetupMutation.mutate({
        ...newData,
        lastCompletedStep: currentStep
      });
      
      return newData;
    });
  };

  const handleNext = () => {
    // Save the last completed step
    const updatedData = {
      ...businessSetupData,
      lastCompletedStep: currentStep
    };
    saveBusinessSetupMutation.mutate(updatedData);
    setBusinessSetupData(updatedData);
    
    // Move to next step
    setDirection('forward');
    setCurrentStep(prev => prev + 1);
    
    // Track step completion
    trackUserAction(
      'business_setup_step_complete',
      'BusinessSetupWizard',
      {
        elementId: 'nextButton',
        interactionValue: `Step ${currentStep + 1}`
      }
    );
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
      
      // Track going back
      trackUserAction(
        'business_setup_step_back',
        'BusinessSetupWizard',
        {
          elementId: 'backButton',
          interactionValue: `Step ${currentStep + 1}`
        }
      );
    }
  };

  // Check if we can proceed to the next step based on current data
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: // Introduction
        return true; // Always allow proceeding from introduction
      case 1: // Primary Goal
        return !!businessSetupData.primaryGoal;
      case 2: // Business Type
        return !!businessSetupData.businessType;
      case 3: // Industry Sector
        return !!businessSetupData.industrySector;
      case 4: // Business Location Education
        return businessSetupData.educationComplete;
      case 5: // Location Preference
        return !!businessSetupData.locationPreference;
      case 6: // Free Zone Selection
        return !!businessSetupData.selectedFreeZone;
      case 7: // Business Activity
        return !!businessSetupData.businessActivity;
      case 8: // Legal Structure
        return !!businessSetupData.legalStructure;
      case 9: // Document Requirements
        return true; // Always allow proceeding from document requirements
      default:
        return true;
    }
  };

  return {
    currentStep,
    setCurrentStep,
    direction,
    businessSetupData,
    updateBusinessSetupData,
    handleNext,
    handleBack,
    isLoadingSetup,
    canProceedToNextStep,
    saveProgress: () => saveBusinessSetupMutation.mutate({
      ...businessSetupData,
      lastCompletedStep: currentStep
    })
  };
}