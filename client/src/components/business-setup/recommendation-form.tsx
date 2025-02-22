import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  budget: z.coerce.number().min(5000, "Budget must be at least 5,000 AED"),
  industry: z.string().min(1, "Please select an industry"),
  employees: z.coerce.number().min(1, "Must have at least 1 employee"),
  businessActivity: z.string().min(1, "Please select a business activity"),
});

type FormData = z.infer<typeof formSchema>;

const industriesWithActivities = {
  "Technology": [
    "Software Development",
    "IT Consulting",
    "Digital Marketing",
    "Cloud Services",
    "Cybersecurity",
    "Mobile App Development"
  ],
  "Trading": [
    "Import/Export General Trading",
    "E-commerce Trading",
    "Consumer Electronics",
    "Textiles & Garments",
    "Building Materials",
    "Auto Parts"
  ],
  "Consulting": [
    "Business Strategy",
    "Management Consulting",
    "HR Consulting",
    "Financial Advisory",
    "Legal Consulting",
    "Project Management"
  ],
  "Manufacturing": [
    "Food & Beverages",
    "Cosmetics & Personal Care",
    "Electronics Assembly",
    "Packaging Solutions",
    "Metal Fabrication",
    "Textile Manufacturing"
  ],
  "E-commerce": [
    "Online Retail",
    "Dropshipping",
    "Marketplace Platform",
    "Digital Products",
    "Subscription Services",
    "Online Food Delivery"
  ],
  "Media": [
    "Digital Content Creation",
    "Advertising Agency",
    "Video Production",
    "Social Media Management",
    "Publishing",
    "Gaming & Entertainment"
  ]
};

export default function RecommendationForm() {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budget: 50000,
      industry: "",
      employees: 1,
      businessActivity: "",
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Submitting form data:", data);
      const payload = {
        ...data,
        activities: [data.businessActivity],
      };
      console.log("Sending payload:", payload);
      const res = await apiRequest("POST", "/api/recommendations", payload);
      const jsonResponse = await res.json();
      console.log("Received response:", jsonResponse);
      return jsonResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-setup"] });
      toast({
        title: "Success",
        description: "Business setup recommendations generated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Recommendation form error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      console.log("Form data:", data);
      console.log("Form errors:", form.formState.errors);

      if (Object.keys(form.formState.errors).length > 0) {
        console.log("Form has validation errors");
        return;
      }

      console.log("Form validation passed, submitting...");
      await recommendationMutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
      if (error instanceof Error) {
        toast({
          title: "Submission Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const selectedIndustry = form.watch("industry");
  const availableActivities = selectedIndustry ? industriesWithActivities[selectedIndustry as keyof typeof industriesWithActivities] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Budget (AED)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        console.log("Budget changed:", e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      console.log("Industry selected:", value);
                      // Reset business activity when industry changes
                      form.setValue("businessActivity", "");
                      field.onChange(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(industriesWithActivities).map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
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
              name="employees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Employees</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        console.log("Employees changed:", e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
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
                    disabled={!selectedIndustry}
                    onValueChange={(value) => {
                      console.log("Business activity selected:", value);
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedIndustry ? "Select business activity" : "Select an industry first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableActivities.map((activity) => (
                        <SelectItem key={activity} value={activity}>
                          {activity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  Getting Recommendations...
                </>
              ) : (
                "Get Recommendations"
              )}
            </Button>

            {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
              <div className="text-sm text-destructive">
                Please fix the form errors before submitting.
                <pre className="mt-2 text-xs">
                  {JSON.stringify(form.formState.errors, null, 2)}
                </pre>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}