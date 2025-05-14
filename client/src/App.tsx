import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import FreeZonesPage from "@/pages/freezones-page";
import FreeZonePage from "@/pages/freezone-page";
import AdminPage from "@/pages/admin-page";
import DocumentManagement from "@/pages/DocumentManagement";
import PremiumAssistant from "@/pages/premium-assistant";
import AIProductManager from "@/pages/AIProductManager";
import EnrichmentWorkflowPage from "@/pages/enrichment-workflow";
import UserInteractionsPage from "@/pages/admin/user-interactions";
import { ProtectedRoute } from "./lib/protected-route";
import ErrorBoundary from "@/components/error-boundary";
import { useEffect } from "react";
import { trackPageView } from "@/lib/user-tracker";

function Router() {
  // Track page views when location changes
  const [location] = useLocation();
  
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/free-zones" component={FreeZonesPage} />
      <ProtectedRoute path="/free-zone/:id" component={FreeZonePage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/admin/user-interactions" component={UserInteractionsPage} />
      <ProtectedRoute path="/documents" component={DocumentManagement} />
      <ProtectedRoute path="/premium-assistant" component={PremiumAssistant} />
      <ProtectedRoute path="/ai-product-manager" component={AIProductManager} />
      <ProtectedRoute path="/enrichment-workflow" component={EnrichmentWorkflowPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary componentName="Application Root">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
