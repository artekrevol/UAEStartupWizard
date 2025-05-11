import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusinessSetupData } from '@/pages/business-setup-wizard';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackUserAction } from '@/lib/user-tracker';
import { Loader2, Search, Tag, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BusinessActivity {
  id: number;
  categoryId?: number;
  name: string;
  code?: string;
  description?: string;
  requirements?: string;
  feeStructure?: Record<string, any>;
  applicableIn?: any[];
  restrictions?: string;
  approvalTime?: string;
  approvalRequirements?: string;
}

interface BusinessActivityStepProps {
  businessSetupData: BusinessSetupData;
  updateBusinessSetupData: (key: keyof BusinessSetupData, value: any) => void;
  onNext: () => void;
}

export default function BusinessActivityStep({
  businessSetupData,
  updateBusinessSetupData,
  onNext
}: BusinessActivityStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(
    businessSetupData.businessActivity
  );

  // Get values from previous steps
  const industryFilter = businessSetupData.industrySector || '';
  const selectedFreeZoneId = businessSetupData.selectedFreeZone;

  // Query to fetch business activities
  const { data: activitiesResponse, isLoading } = useQuery<{
    activities: BusinessActivity[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>({
    queryKey: ['/api/isic-activities', { 
      industry: industryFilter, 
      freeZoneId: selectedFreeZoneId,
      q: searchQuery,
      limit: 100 
    }],
    // Only fetch if industry is selected or if there's a search query
    enabled: !!industryFilter || !!searchQuery,
  });
  
  // Extract activities from the response
  const activities = activitiesResponse?.activities || [];
  const totalActivities = activitiesResponse?.pagination?.total || 0;

  // Check if an activity is applicable in the selected free zone
  const isApplicableInFreeZone = (activity: BusinessActivity): boolean => {
    if (!selectedFreeZoneId) return true;
    
    if (!activity.applicableIn || activity.applicableIn.length === 0) {
      return true; // If no data, assume applicable
    }
    
    return activity.applicableIn.some(item => 
      typeof item === 'number' 
        ? item === selectedFreeZoneId
        : item.freeZoneId === selectedFreeZoneId
    );
  };

  // Filter activities that are applicable in the selected free zone
  const applicableActivities = activities.filter(isApplicableInFreeZone);

  const handleSelect = (activity: BusinessActivity) => {
    setSelectedActivity(activity.name);
    updateBusinessSetupData('businessActivity', activity.name);
    
    // Track selection
    trackUserAction(
      'business_setup_selection',
      'BusinessActivityStep',
      {
        elementId: 'businessActivityOption',
        interactionValue: activity.name
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
        'BusinessActivityStep',
        {
          elementId: 'businessActivitySearch',
          interactionValue: e.target.value
        }
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Select your Business Activity</h1>
        <p className="text-muted-foreground">
          Choose a specific business activity for your license
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10"
          placeholder="Search for business activities..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
          {applicableActivities.length > 0 ? (
            applicableActivities.map((activity) => (
              <Card
                key={activity.id}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                  selectedActivity === activity.name ? 'border-2 border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleSelect(activity)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Label className="text-base font-medium">{activity.name}</Label>
                        {activity.code && (
                          <Badge variant="outline" className="ml-2">
                            {activity.code}
                          </Badge>
                        )}
                      </div>
                      
                      {activity.requirements && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Requirements</h4>
                              <p className="text-sm text-muted-foreground">
                                {activity.requirements}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    
                    {activity.description && (
                      <CardDescription className="line-clamp-2">
                        {activity.description}
                      </CardDescription>
                    )}
                    
                    <div className="flex flex-wrap gap-2 text-sm">
                      {activity.approvalTime && (
                        <Badge variant="outline" className="flex gap-1 items-center">
                          <CheckCircle2 className="h-3 w-3" />
                          Approval: {activity.approvalTime}
                        </Badge>
                      )}
                      
                      {activity.categoryId && (
                        <Badge variant="outline" className="flex gap-1 items-center">
                          <Tag className="h-3 w-3" />
                          Category ID: {activity.categoryId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No matching business activities found" 
                  : "Enter search terms to find business activities"}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    // Create a custom activity with the search query
                    const customActivity: BusinessActivity = {
                      id: -1, // Temporary ID
                      name: searchQuery,
                      description: "Custom business activity"
                    };
                    handleSelect(customActivity);
                  }}
                >
                  Use "{searchQuery}" as my business activity
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}