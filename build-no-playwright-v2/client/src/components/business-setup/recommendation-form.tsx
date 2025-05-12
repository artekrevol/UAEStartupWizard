import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import { LEGAL_FORMS } from "@shared/schema";
import { useState } from "react";

const formSchema = z.object({
  budget: z.coerce.number().min(5000, "Budget must be at least 5,000 AED"),
  industry: z.string().min(1, "Please select an industry"),
  employees: z.coerce.number().min(1, "Must have at least 1 employee"),
  businessActivity: z.string().min(1, "Please select a business activity"),
  legalForm: z.enum(LEGAL_FORMS, {
    required_error: "Please select a legal form",
  }),
  initialCapital: z.coerce.number().min(0, "Initial capital cannot be negative"),
  sharePercentage: z.coerce.number().min(0).max(100, "Share percentage must be between 0 and 100"),
  activityDescription: z.string().min(10, "Please provide a detailed description of your business activity"),
});

type FormData = z.infer<typeof formSchema>;

interface BusinessCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

interface BusinessActivity {
  id: number;
  categoryId?: number;
  name: string;
  description?: string;
  minimumCapital?: number;
  activityCode?: string;
  nameArabic?: string;
  descriptionArabic?: string;
  industryGroup?: string;
  isicActivity?: boolean;
}

export default function RecommendationForm() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budget: 50000,
      industry: "",
      employees: 1,
      businessActivity: "",
      legalForm: "Limited Liability Company (LLC)",
      initialCapital: 0,
      sharePercentage: 100,
      activityDescription: "",
    },
  });

  // Query all available industry groups
  const { data: industryGroups = [], isLoading: isIndustryGroupsLoading } = useQuery<string[]>({
    queryKey: ["/api/industry-groups"],
  });

  const selectedIndustry = form.watch("industry");

  // Get ISIC activities for the selected industry
  const { data: activitiesResponse, isLoading: isActivitiesLoading } = useQuery<{
    activities: BusinessActivity[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/isic-activities", { 
      industry: selectedIndustry, 
      q: searchQuery,
      limit: 100 
    }],
    // Only fetch if industry is selected or if there's a search query
    enabled: !!selectedIndustry || !!searchQuery
  });
  
  // Extract activities from the response
  const activities = activitiesResponse?.activities || [];
  const totalActivities = activitiesResponse?.pagination?.total || 0;

  const recommendationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/recommendations", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-setup"] });
      toast({
        title: "Success",
        description: "Business setup recommendations generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
    }
  };

  if (isIndustryGroupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Establishment Application</CardTitle>
        <CardDescription>Fill in the details to get AI-powered business setup recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => recommendationMutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Sector</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // Reset business activity selection when industry changes
                        form.setValue("businessActivity", "");
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry sector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industryGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label htmlFor="activity-search" className="text-sm font-medium">
                  Search Business Activities
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="activity-search"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-8 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search by activity name or code..."
                    value={searchQuery}
                    onChange={handleSearchQueryChange}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                {isActivitiesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? `Found ${totalActivities} matching activities` : 
                     selectedIndustry ? `${totalActivities} activities available` : 
                     "Select an industry or search by activity name/code"}
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="businessActivity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Activity</FormLabel>
                    <Select
                      disabled={(!selectedIndustry && !searchQuery) || isActivitiesLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isActivitiesLoading
                                ? "Loading activities..."
                                : (!selectedIndustry && !searchQuery)
                                  ? "Select an industry or search first"
                                  : "Select business activity"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {activities.length > 0 ? (
                          activities.map((activity) => (
                            <SelectItem 
                              key={activity.id || activity.activityCode} 
                              value={activity.name}
                              title={activity.description || ""}
                            >
                              <div className="flex flex-col">
                                <span>
                                  {activity.activityCode && `[${activity.activityCode}] `}{activity.name}
                                </span>
                                {activity.industryGroup && (
                                  <span className="text-xs text-muted-foreground">{activity.industryGroup}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem disabled value="no-results">
                            No activities found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalForm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Form</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select legal form" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEGAL_FORMS.map((form) => (
                          <SelectItem key={form} value={form}>
                            {form}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Budget (AED)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialCapital"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Capital (AED)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sharePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="0" max="100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Employees</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min="1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="activityDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of your business activities..."
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={recommendationMutation.isPending}
            >
              {recommendationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Application...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}