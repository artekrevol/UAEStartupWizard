/**
 * User Interactions Admin Page
 * 
 * This page provides an admin interface for viewing and analyzing
 * user interactions with the application.
 */

import { UserInteractionsDashboard } from "@/components/admin/user-interactions-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUserInteraction } from "@/hooks/use-user-interaction";

export default function UserInteractionsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { trackInteraction } = useUserInteraction();
  
  // Track page view
  useEffect(() => {
    trackInteraction({
      interactionType: 'page_view',
      component: 'admin-page',
      pageUrl: '/admin/user-interactions',
      metadata: {
        page: 'admin-user-interactions'
      }
    });
  }, [trackInteraction]);
  
  // Redirect non-admin users to home
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, isLoading, navigate]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Not authorized
  if (!user || user.role !== 'admin') {
    return null; // Will be redirected
  }
  
  return (
    <div className="min-h-screen bg-background">
      <UserInteractionsDashboard />
    </div>
  );
}