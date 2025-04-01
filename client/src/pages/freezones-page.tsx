import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FreeZone } from "@shared/schema";
import { 
  MapPin, 
  ArrowRight, 
  Search,
  Building2,
  CheckCircle2
} from "lucide-react";

export default function FreeZonesPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: freeZones, isLoading, error } = useQuery<FreeZone[]>({
    queryKey: ["/api/free-zones"],
  });

  // Filter free zones by search term
  const filteredFreeZones = freeZones?.filter(
    (freeZone) =>
      freeZone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (freeZone.location && freeZone.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (freeZone.description && freeZone.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="container py-6 max-w-7xl">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">UAE Free Zones</h1>
              <p className="text-muted-foreground mt-1">
                Explore the various free zones available for your business setup in the UAE
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search free zones..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 border border-red-300 bg-red-50 text-red-600 rounded">
              Error loading free zones. Please try again later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFreeZones && filteredFreeZones.length > 0 ? (
                filteredFreeZones.map((freeZone) => (
                  <FreeZoneCard key={freeZone.id} freeZone={freeZone} onClick={() => setLocation(`/free-zone/${freeZone.id}`)} />
                ))
              ) : (
                <div className="col-span-full p-8 text-center">
                  <p className="text-muted-foreground">No free zones found matching "{searchTerm}"</p>
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setSearchTerm("")}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

interface FreeZoneCardProps {
  freeZone: FreeZone;
  onClick: () => void;
}

function FreeZoneCard({ freeZone, onClick }: FreeZoneCardProps) {
  const truncateDescription = (text: string, maxLength = 120) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{freeZone.name}</CardTitle>
        {freeZone.location && (
          <CardDescription className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            {freeZone.location}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {truncateDescription(freeZone.description || "No description available")}
        </p>

        {freeZone.industries && freeZone.industries.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-1 flex items-center">
              <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Top Industries
            </p>
            <div className="flex flex-wrap gap-1">
              {freeZone.industries.slice(0, 3).map((industry, i) => (
                <Badge key={i} variant="outline" className="text-xs">{industry}</Badge>
              ))}
              {freeZone.industries.length > 3 && (
                <Badge variant="outline" className="text-xs">+{freeZone.industries.length - 3} more</Badge>
              )}
            </div>
          </div>
        )}

        {freeZone.benefits && freeZone.benefits.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-1 flex items-center">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Key Benefits
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
              {freeZone.benefits.slice(0, 2).map((benefit, i) => (
                <li key={i}>{benefit}</li>
              ))}
              {freeZone.benefits.length > 2 && (
                <li className="text-xs font-medium">And {freeZone.benefits.length - 2} more benefits</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          onClick={onClick} 
          className="w-full"
          variant="outline"
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}