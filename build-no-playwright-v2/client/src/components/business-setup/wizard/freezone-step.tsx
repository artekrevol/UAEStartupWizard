import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trackUserAction } from '@/lib/user-tracker';
import { Loader2, Search, MapPin, DollarSign, Building, Info, ArrowUpDown, HelpCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FreeZone {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  benefits: Record<string, any>;
  requirements: Record<string, any>;
  industries: Record<string, any>;
  licenseTypes: Record<string, any>;
  setupCost: Record<string, any>;
  website: string | null;
}

interface FreezoneStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function FreezoneStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: FreezoneStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFreeZone, setSelectedFreeZone] = useState<number | null>(
    businessSetupData.selectedFreeZone
  );
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'recommended'>('recommended');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Get the chosen industry from previous step
  const industryFilter = businessSetupData.industrySector || '';

  // Query to fetch all free zones
  const { data: freeZones = [], isLoading } = useQuery<FreeZone[]>({
    queryKey: ['/api/free-zones'],
  });

  // Function to calculate recommendation score (0-100) based on industry match
  const getRecommendationScore = (freeZone: FreeZone): number => {
    if (!industryFilter) return 50; // Neutral score if no industry selected
    
    // Check if this free zone supports the selected industry
    let industriesList: string[] = [];
    
    // Handle different data structures - some may have industries as array, others as object
    if (freeZone.industries) {
      if (Array.isArray(freeZone.industries)) {
        industriesList = freeZone.industries.filter(industry => typeof industry === 'string');
      } else if (typeof freeZone.industries === 'object') {
        // Try to get industries from object keys
        industriesList = Object.keys(freeZone.industries);
        
        // Also check if the object has nested arrays of industries
        Object.values(freeZone.industries).forEach(value => {
          if (Array.isArray(value)) {
            industriesList = [...industriesList, ...value.filter(v => typeof v === 'string')];
          }
        });
      }
    }
    
    if (industriesList.length === 0) {
      // Try to infer from name and description
      const nameMatch = freeZone.name.toLowerCase().includes(industryFilter.toLowerCase());
      const descMatch = freeZone.description?.toLowerCase().includes(industryFilter.toLowerCase()) || false;
      
      if (nameMatch) return 85;
      if (descMatch) return 75;
      
      return 50; // No data available
    }
    
    // Check for direct matches in the industries list
    const matchingIndustries = industriesList.filter(industry => {
      if (typeof industry !== 'string') return false;
      
      return industry.toLowerCase().includes(industryFilter.toLowerCase()) ||
             industryFilter.toLowerCase().includes(industry.toLowerCase());
    });
    
    if (matchingIndustries.length > 0) {
      return 90; // High score for industry match
    }
    
    // Check for specific free zones that are known for certain industries
    // This is a fallback when the data doesn't explicitly list industries
    const knownForIndustry: Record<string, string[]> = {
      'Technology': ['Dubai Internet City', 'Dubai Silicon Oasis', 'Dubai Outsource City'],
      'Media': ['Dubai Media City', 'Sharjah Media City', 'twofour54'],
      'Healthcare': ['Dubai Healthcare City', 'Dubai Biotech Research Park'],
      'Education': ['Dubai Knowledge Park', 'Dubai International Academic City'],
      'Manufacturing': ['Jebel Ali Free Zone', 'Dubai Industrial City', 'KIZAD'],
      'Finance': ['Dubai International Financial Centre', 'Abu Dhabi Global Market'],
      'Logistics': ['Dubai South', 'Dubai Airport Freezone', 'Jebel Ali Free Zone']
    };
    
    // Check if this freezone is known for the selected industry
    for (const [knownIndustry, freeZoneNames] of Object.entries(knownForIndustry)) {
      if (knownIndustry.toLowerCase().includes(industryFilter.toLowerCase()) || 
          industryFilter.toLowerCase().includes(knownIndustry.toLowerCase())) {
        if (freeZoneNames.some(name => freeZone.name.includes(name))) {
          return 85; // Good score for known industry match
        }
      }
    }
    
    // Fallback to general popularity
    return 60;
  };

  // Function to extract cost from freezone data, with fallback values
  const getFreezoneCost = (freeZone: FreeZone): number => {
    // Try to get the cost from different formats
    if (freeZone.setupCost && typeof freeZone.setupCost === 'object') {
      // If it has min property
      if ('min' in freeZone.setupCost && typeof freeZone.setupCost.min === 'number') {
        return freeZone.setupCost.min;
      }
      
      // If it has a starting_from property
      if ('starting_from' in freeZone.setupCost && typeof freeZone.setupCost.starting_from === 'number') {
        return freeZone.setupCost.starting_from;
      }
    }
    
    // Default values based on free zone tiers
    const premiumFreeZones = ['Dubai International Financial Centre', 'Abu Dhabi Global Market', 'Dubai Healthcare City'];
    const budgetFreeZones = ['Ajman Free Zone', 'Fujairah Free Zone', 'RAK Free Zone', 'Umm Al Quwain Free Zone'];
    
    if (premiumFreeZones.some(name => freeZone.name.includes(name))) {
      return 75000; // Premium tier default
    } else if (budgetFreeZones.some(name => freeZone.name.includes(name))) {
      return 15000; // Budget tier default
    }
    
    return 40000; // Mid-range default
  };

  // Filtered and sorted free zones
  const filteredFreeZones = freeZones
    .filter(freeZone => {
      // Filter by search query
      if (searchQuery && !freeZone.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by tab
      if (activeTab !== 'all') {
        const setupCostRange = activeTab === 'budget' ? 'low' : 
                              activeTab === 'midrange' ? 'medium' : 'high';
        
        // Check if the free zone's setup cost matches the selected range
        const costCategory = getCostCategory(freeZone);
        return costCategory === setupCostRange;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by the selected criteria
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'cost') {
        return getFreezoneCost(a) - getFreezoneCost(b);
      } else {
        // Sort by recommendation score
        return getRecommendationScore(b) - getRecommendationScore(a);
      }
    });

  // Helper function to get cost category
  function getCostCategory(freeZone: FreeZone): 'low' | 'medium' | 'high' {
    const setupCost = getFreezoneCost(freeZone);
    if (setupCost < 25000) return 'low';
    if (setupCost < 60000) return 'medium';
    return 'high';
  }

  // Helper function to get numeric cost value for sorting
  function getCostValue(freeZone: FreeZone): number {
    return getFreezoneCost(freeZone);
  }

  const handleSelect = (freezoneId: number) => {
    setSelectedFreeZone(freezoneId);
    updateBusinessSetupData('selectedFreeZone', freezoneId);
    
    // Find the selected freezone to store its name
    const selectedZone = freeZones.find(zone => zone.id === freezoneId);
    if (selectedZone) {
      updateBusinessSetupData('freeZoneName', selectedZone.name);
    }
    
    // Track selection
    trackUserAction(
      'business_setup_selection',
      'FreezoneStep',
      {
        elementId: 'freezoneOption',
        interactionValue: freezoneId.toString()
      }
    );
    
    // Removed auto-progression to give user control
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Track search
    if (e.target.value.length > 2) {
      trackUserAction(
        'search',
        'FreezoneStep',
        {
          elementId: 'freezoneSearch',
          interactionValue: e.target.value
        }
      );
    }
  };

  // Get selected free zone details
  const selectedFreeZoneDetails = freeZones.find(fz => fz.id === selectedFreeZone);

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Select a Free Zone for your business</h1>
        <p className="text-muted-foreground">
          UAE Free Zones offer specific benefits for different business types
        </p>
      </div>

      {selectedFreeZone && (
        <motion.div
          className="flex justify-end mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button 
            size="lg" 
            onClick={onNext}
            className="gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search free zones..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              setSortBy(sortBy === 'name' ? 'recommended' : 
                       sortBy === 'recommended' ? 'cost' : 'name');
            }}
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort by: {sortBy === 'name' ? 'Name' : sortBy === 'cost' ? 'Cost' : 'Recommended'}
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="midrange">Mid-range</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
          {filteredFreeZones.length > 0 ? (
            filteredFreeZones.map((freeZone) => {
              const recommendationScore = getRecommendationScore(freeZone);
              const isRecommended = recommendationScore >= 80;
              const costCategory = getCostCategory(freeZone);
              
              return (
                <Card
                  key={freeZone.id}
                  className={`relative cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    selectedFreeZone === freeZone.id ? 'border-2 border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleSelect(freeZone.id)}
                >
                  {isRecommended && industryFilter && (
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      Recommended for {industryFilter}
                    </Badge>
                  )}
                  
                  <CardContent className="p-4 pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <Label className="text-lg font-medium">{freeZone.name}</Label>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 ml-2" onClick={(e) => e.stopPropagation()}>
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                {freeZone.description || `Information about ${freeZone.name}`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-sm">
                        {freeZone.location && (
                          <Badge variant="outline" className="flex gap-1 items-center">
                            <MapPin className="h-3 w-3" />
                            {freeZone.location}
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="flex gap-1 items-center">
                          <DollarSign className="h-3 w-3" />
                          {costCategory === 'low' ? 'Budget-friendly' : 
                           costCategory === 'medium' ? 'Mid-range' : 'Premium'}
                        </Badge>
                        
                        {Object.keys(freeZone.licenseTypes || {}).length > 0 && (
                          <Badge variant="outline" className="flex gap-1 items-center">
                            <Building className="h-3 w-3" />
                            {Object.keys(freeZone.licenseTypes).length} license types
                          </Badge>
                        )}
                      </div>
                      
                      {freeZone.description && (
                        <CardDescription className="line-clamp-2">
                          {freeZone.description}
                        </CardDescription>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No matching free zones found</p>
              <Button variant="outline" className="mt-2" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}