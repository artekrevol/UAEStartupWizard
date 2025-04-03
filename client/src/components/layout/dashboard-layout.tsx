import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Building2,
  Map,
  ShieldAlert
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Check if user is admin
  const isAdmin = (user as any)?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span 
                className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent cursor-pointer"
                onClick={() => setLocation("/")}
              >
                UAE Business Setup
              </span>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-sidebar border-r min-h-screen p-4">
          <nav className="space-y-2">
            <Button 
              variant={location === "/" ? "default" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setLocation("/")}
            >
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Dashboard
            </Button>
            
            <Button 
              variant={location.includes("/free-zone") ? "default" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setLocation("/free-zones")}
            >
              <Building2 className="mr-2 h-5 w-5" />
              Free Zones
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
            >
              <Map className="mr-2 h-5 w-5" />
              Business Maps
            </Button>
            
            <Button 
              variant={location === "/documents" ? "default" : "ghost"} 
              className="w-full justify-start"
              onClick={() => setLocation("/documents")}
            >
              <FileText className="mr-2 h-5 w-5" />
              Documents
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
            >
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
            
            {isAdmin && (
              <Button 
                variant={location === "/admin" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setLocation("/admin")}
              >
                <ShieldAlert className="mr-2 h-5 w-5" />
                Admin Panel
              </Button>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
