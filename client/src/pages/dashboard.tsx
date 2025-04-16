import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ProgressTracker from "@/components/business-setup/progress-tracker";
import RecommendationForm from "@/components/business-setup/recommendation-form";
import { useQuery } from "@tanstack/react-query";
import { BusinessSetup, FreeZone } from "../../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Building2, ArrowRight } from "lucide-react";

interface BusinessSetupWithScore extends BusinessSetup {
  score?: {
    total: number;
    components: Array<{
      score: number;
      maxScore: number;
      label: string;
      description: string;
    }>;
    progress: number;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: setup, isLoading: setupLoading } = useQuery<BusinessSetupWithScore>({
    queryKey: ["/api/business-setup"],
  });
  
  const { data: freeZones, isLoading: freeZonesLoading } = useQuery<FreeZone[]>({
    queryKey: ["/api/free-zones"],
  });

  const isLoading = setupLoading || freeZonesLoading;
  
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

        <ProgressTracker 
          progress={user?.progress || 0} 
          score={setup?.score}
        />

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
        
        {/* Featured Free Zones Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Featured Free Zones</h2>
            <Button 
              variant="outline"
              onClick={() => setLocation("/free-zones")}
              className="flex items-center gap-1"
            >
              View All 
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {freeZones?.slice(0, 3).map((freeZone) => (
              <Card key={freeZone.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">{freeZone.name}</CardTitle>
                  {freeZone.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {freeZone.location}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm line-clamp-3">
                    {freeZone.description || 'No description available'}
                  </p>
                  
                  {freeZone.industries && Array.isArray(freeZone.industries) && freeZone.industries.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Key Industries:</p>
                      <div className="flex flex-wrap gap-1">
                        {freeZone.industries.slice(0, 2).map((industry, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {industry}
                          </Badge>
                        ))}
                        {freeZone.industries.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{freeZone.industries.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary" 
                    onClick={() => setLocation(`/free-zone/${freeZone.id}`)}
                  >
                    View Details
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}