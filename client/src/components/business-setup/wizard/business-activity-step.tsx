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
  category_id?: number | null;
  name: string;
  description: string | null;
  required_docs?: string | null;
  minimum_capital?: string | null;
  fees?: string | null;
  approval_requirements?: string | null;
  activity_code?: string | null;
  name_arabic?: string | null;
  description_arabic?: string | null;
  industry_group?: string | null;
  isic_activity?: boolean;
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
  const industryName = businessSetupData.industrySector || '';
  const selectedFreeZoneId = businessSetupData.selectedFreeZone;
  
  // Map common industry names to industry IDs
  // This is a temporary solution until we have a proper mapping in the database
  const industryNameToId: Record<string, number> = {
    'Manufacturing': 1,
    'Technology & IT': 2,
    'Financial Services': 3,
    'Retail & E-commerce': 4,
    'Professional Services': 5,
    'Healthcare': 6,
    'Real Estate': 7,
    'Hospitality & Tourism': 8,
    'Education': 9,
    'Media & Entertainment': 10
  };
  
  // Get industry ID from the name, default to 1 (Manufacturing) if not found
  const industryId = industryNameToId[industryName] || 1;
  
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
      industry: industryId, 
      freeZoneId: selectedFreeZoneId,
      q: searchQuery,
      limit: 100 
    }],
    // Only fetch if industry is selected or if there's a search query
    enabled: !!industryName || !!searchQuery,
  });
  
  // Extract activities from the response
  const activities = activitiesResponse?.activities || [];
  const totalActivities = activitiesResponse?.pagination?.total || 0;

  // Since our current data doesn't have direct applicability info, 
  // we'll assume all activities from the filtered list are applicable
  const applicableActivities = activities;

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
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {applicableActivities.length} activities for{" "}
                  <Badge variant="secondary" className="font-normal">
                    {industryName || "All Industries"}
                  </Badge>
                </p>
              </div>
              
              {applicableActivities.map((activity) => (
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
                        
                        {activity.required_docs && (
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
                                  {activity.required_docs}
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
                        {activity.approvalRequirements && (
                          <Badge variant="outline" className="flex gap-1 items-center">
                            <CheckCircle2 className="h-3 w-3" />
                            Approval: {activity.approvalRequirements}
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
              ))}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No matching business activities found" 
                  : industryName 
                    ? `No activities found for industry "${industryName}". Try searching instead.`
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