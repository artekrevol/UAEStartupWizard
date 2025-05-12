import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { FreeZoneDetails } from "@/components/freezone/freezone-details";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

export default function FreeZonePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [freeZoneId, setFreeZoneId] = useState<number | null>(null);
  
  // Extract and validate the ID from the URL using useEffect instead of during render
  useEffect(() => {
    try {
      const matches = location.match(/\/free-zone\/(\d+)/);
      if (matches && matches[1]) {
        const id = parseInt(matches[1], 10);
        if (!isNaN(id)) {
          setFreeZoneId(id);
          return;
        }
      }
      
      // Show error toast only if we're on the freezone page
      if (location.startsWith('/free-zone/')) {
        toast({
          title: "Invalid Free Zone ID",
          description: "Unable to display details for this free zone.",
          variant: "destructive",
        });
        setLocation("/free-zones");
      }
      
      setFreeZoneId(null);
    } catch (e) {
      console.error("Error parsing free zone ID:", e);
      setFreeZoneId(null);
    }
  }, [location, setLocation, toast]);

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