import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
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

// Updated industry categories based on MOEC classification
const industriesWithActivities = {
  "Manufacturing": [
    "Food Manufacturing",
    "Textile Manufacturing",
    "Chemical Manufacturing",
    "Electronics Manufacturing",
    "Machinery Manufacturing",
    "Pharmaceutical Manufacturing"
  ],
  "Trading": [
    "General Trading",
    "Import/Export",
    "Wholesale Trading",
    "Retail Trading",
    "E-commerce Trading",
    "Specialized Trading"
  ],
  "Professional Services": [
    "Legal Services",
    "Accounting Services",
    "Engineering Services",
    "Architectural Services",
    "Management Consulting",
    "Healthcare Services"
  ],
  "Technology": [
    "Software Development",
    "IT Services",
    "Digital Solutions",
    "AI and Data Analytics",
    "Cybersecurity Services",
    "Cloud Computing Services"
  ],
  "Construction": [
    "Building Construction",
    "Infrastructure Development",
    "Interior Design",
    "Specialized Contracting",
    "Project Management",
    "Real Estate Development"
  ],
  "Tourism & Hospitality": [
    "Hotel Services",
    "Restaurant Services",
    "Travel Agency",
    "Tourism Management",
    "Event Management",
    "Entertainment Services"
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
      legalForm: "Limited Liability Company (LLC)",
      initialCapital: 0,
      sharePercentage: 100,
      activityDescription: "",
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

  const selectedIndustry = form.watch("industry");
  const availableActivities = selectedIndustry ? industriesWithActivities[selectedIndustry as keyof typeof industriesWithActivities] : [];

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
                name="businessActivity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Activity</FormLabel>
                    <Select
                      disabled={!selectedIndustry}
                      onValueChange={field.onChange}
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