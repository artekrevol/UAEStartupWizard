import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { LEGAL_FORMS } from "@shared/schema";

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
  categoryId: number;
  name: string;
  description: string;
  minimumCapital: number;
}

export default function RecommendationForm() {
  const { toast } = useToast();

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

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<BusinessCategory[]>({
    queryKey: ["/api/business-categories"],
  });

  const selectedIndustry = form.watch("industry");
  const selectedCategory = categories.find(cat => cat.name === selectedIndustry);

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery<BusinessActivity[]>({
    queryKey: [`/api/business-activities/${selectedCategory?.id}`],
    enabled: !!selectedCategory?.id,
    onError: (error) => {
      console.error("Failed to fetch activities:", error);
      toast({
        title: "Error",
        description: "Failed to load business activities",
        variant: "destructive",
      });
    },
  });

  console.log("Debug:", {
    selectedIndustry,
    selectedCategoryId: selectedCategory?.id,
    activities,
    isActivitiesLoading
  });

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

  if (isCategoriesLoading) {
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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
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
                name="businessActivity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Activity</FormLabel>
                    <Select
                      disabled={!selectedCategory || isActivitiesLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isActivitiesLoading
                                ? "Loading activities..."
                                : !selectedCategory
                                  ? "Select an industry first"
                                  : "Select business activity"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activities.map((activity) => (
                          <SelectItem key={activity.id} value={activity.name}>
                            {activity.name}
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