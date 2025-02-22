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
  budget: z.number().min(5000, "Budget must be at least 5,000 AED"),
  industry: z.string().min(1, "Please select an industry"),
  employees: z.number().min(1, "Must have at least 1 employee"),
  activities: z.array(z.string()).min(1, "At least one business activity is required"),
  businessActivity: z.string().min(3, "Business activity description is required"),
});

type FormData = z.infer<typeof formSchema>;

const industries = [
  "Technology",
  "Trading",
  "Consulting",
  "Manufacturing",
  "E-commerce",
  "Media",
];

export default function RecommendationForm() {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budget: 50000,
      industry: "",
      employees: 1,
      activities: [],
      businessActivity: "",
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Transform the data to include the business activity in the activities array
      const payload = {
        ...data,
        activities: [data.businessActivity],
      };
      const res = await apiRequest("POST", "/api/recommendations", payload);
      return res.json();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => recommendationMutation.mutate(data))}
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
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industries.map((industry) => (
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
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  <FormLabel>Business Activity Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Software development services, Import/Export of electronics"
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
                  Getting Recommendations...
                </>
              ) : (
                "Get Recommendations"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}