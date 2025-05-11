import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackUserAction } from '@/lib/user-tracker';
import { Loader2, Search } from 'lucide-react';

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
    setTimeout(onNext, 500);
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

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">What industry sector is your business in?</h1>
        <p className="text-muted-foreground">
          This helps us recommend the most suitable license types and free zones
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10"
          placeholder="Search for your industry..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {isIndustryGroupsLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
          {filteredIndustries.length > 0 ? (
            filteredIndustries.map((industry) => (
              <Card
                key={industry}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                  selectedIndustry === industry ? 'border-2 border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleSelect(industry)}
              >
                <CardContent className="p-4">
                  <Label className="text-base font-medium cursor-pointer">{industry}</Label>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No matching industries found</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => {
                  if (searchQuery) {
                    handleSelect(searchQuery);
                  }
                }}
              >
                Use "{searchQuery}" as my industry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}