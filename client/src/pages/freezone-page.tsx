import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { FreeZoneDetails } from "@/components/freezone/freezone-details";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

export default function FreeZonePage() {
  const [params] = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [freeZoneId, setFreeZoneId] = useState<number | null>(null);

  useEffect(() => {
    // Parse ID from URL parameters
    const id = params?.id ? parseInt(params.id, 10) : null;
    
    if (!id || isNaN(id)) {
      toast({
        title: "Invalid Free Zone ID",
        description: "Unable to display details for this free zone.",
        variant: "destructive",
      });
      setLocation("/free-zones");
    } else {
      setFreeZoneId(id);
    }
  }, [params, toast, setLocation]);

  return (
    <DashboardLayout>
      <div className="container py-6 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/free-zones")}
          className="mb-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Free Zones
        </Button>

        {freeZoneId ? (
          <FreeZoneDetails freeZoneId={freeZoneId} />
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading free zone details...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}