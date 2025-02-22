import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ProgressTracker from "@/components/business-setup/progress-tracker";
import RecommendationForm from "@/components/business-setup/recommendation-form";
import { useQuery } from "@tanstack/react-query";
import { BusinessSetup } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: setup, isLoading } = useQuery<BusinessSetup>({
    queryKey: ["/api/business-setup"],
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {user?.companyName || user?.username}
          </h1>
          <p className="text-muted-foreground">
            Let's get your UAE business up and running.
          </p>
        </div>

        <ProgressTracker progress={user?.progress || 0} />

        {!setup ? (
          <RecommendationForm />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Setup Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Business Type</dt>
                    <dd className="text-lg font-medium">{setup.businessType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Free Zone</dt>
                    <dd className="text-lg font-medium">{setup.freeZone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd className="text-lg font-medium capitalize">{setup.status}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(setup.documents as string[]).map((doc, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Upload
                      </Button>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
