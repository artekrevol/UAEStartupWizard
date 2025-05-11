import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackUserAction } from '@/lib/user-tracker';
import { Loader2, Search, MoveRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Common industry sectors
const commonIndustries = [
  "Technology & IT",
  "Financial Services",
  "Healthcare",
  "Real Estate",
  "Retail & E-commerce",
  "Hospitality & Tourism",
  "Education",
  "Manufacturing",
  "Media & Entertainment",
  "Professional Services"
];

interface IndustrySectorStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function IndustrySectorStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: IndustrySectorStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(
    businessSetupData.industrySector
  );
  const [focusInput, setFocusInput] = useState(false);

  // Query to fetch all industry groups
  const { data: industryGroups = [], isLoading: isIndustryGroupsLoading } = useQuery<string[]>({
    queryKey: ['/api/industry-groups'],
    // If the backend doesn't support this yet, we'll use the predefined list
    enabled: true,
  });

  // Combine predefined and API-loaded industries, removing duplicates
  const industries = [...new Set([...commonIndustries, ...(industryGroups || [])])];

  // Filter industries based on search query
  const filteredIndustries = industries.filter(industry => 
    industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus input on component mount
  useEffect(() => {
    setFocusInput(true);
  }, []);

  const handleSelect = (industry: string) => {
    setSelectedIndustry(industry);
    updateBusinessSetupData('industrySector', industry);
    
    // Track selection
    trackUserAction(
      'business_setup_selection',
      'IndustrySectorStep',
      {
        elementId: 'industrySectorOption',
        interactionValue: industry
      }
    );
    
    // Auto progress after selection
    setTimeout(onNext, 800);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Track search
    if (e.target.value.length > 2) {
      trackUserAction(
        'search',
        'IndustrySectorStep',
        {
          elementId: 'industrySectorSearch',
          interactionValue: e.target.value
        }
      );
    }
  };

  // Animation variants for staggered animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
          What industry sector is your business in?
        </h1>
        <p className="text-muted-foreground text-lg mt-3">
          This helps us recommend the most suitable license types and free zones
        </p>
      </motion.div>

      <motion.div 
        className="relative mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          className="pl-10 py-6 text-lg rounded-xl shadow-sm"
          placeholder="Search for your industry..."
          value={searchQuery}
          onChange={handleSearchChange}
          autoFocus={focusInput}
        />
      </motion.div>

      <AnimatePresence>
        {isIndustryGroupsLoading ? (
          <motion.div 
            className="flex justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 -mr-2 rounded-lg"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((industry) => (
                <motion.div key={industry} variants={item}>
                  <Card
                    className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                      selectedIndustry === industry ? 'border-2 border-primary bg-primary/5 shadow-md' : ''
                    }`}
                    onClick={() => handleSelect(industry)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <Label className="text-base font-medium cursor-pointer">{industry}</Label>
                      {selectedIndustry === industry && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-primary text-primary-foreground p-1 rounded-full"
                        >
                          <MoveRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div 
                className="text-center py-8 bg-background rounded-lg border p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-muted-foreground mb-3">No matching industries found</p>
                <Button 
                  className="mt-2"
                  onClick={() => {
                    if (searchQuery) {
                      handleSelect(searchQuery);
                    }
                  }}
                  disabled={!searchQuery}
                >
                  Use "{searchQuery || '...'}" as my industry
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}