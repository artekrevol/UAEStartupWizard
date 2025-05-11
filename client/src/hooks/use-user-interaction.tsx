/**
 * User Interaction Hook
 * 
 * This hook provides methods for tracking user interactions within the application.
 * It sends interaction data to the backend API for logging and analysis.
 */

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface UserInteractionPayload {
  interactionType: 'page_view' | 'button_click' | 'form_submit' | 'api_call' | 'error' | string;
  component?: string;
  pageUrl?: string;
  metadata?: Record<string, any>;
}

export function useUserInteraction() {
  const { user } = useAuth();

  // Track user interaction with the application
  const { mutate: trackInteractionMutation, isPending } = useMutation({
    mutationFn: async (data: UserInteractionPayload) => {
      const response = await apiRequest('POST', '/api/user-interactions', {
        ...data,
        userId: user?.id,
        username: user?.username,
        timestamp: new Date().toISOString(),
      });
      return await response.json();
    },
    onError: (error) => {
      // Silent failure - we don't want to interrupt user experience
      console.error('Failed to track user interaction:', error);
    },
  });

  // Wrapper function with debouncing for page views
  const trackInteraction = useCallback(
    (data: UserInteractionPayload) => {
      try {
        // Add current URL if not provided
        if (!data.pageUrl) {
          data.pageUrl = window.location.pathname;
        }
        
        trackInteractionMutation(data);
      } catch (error) {
        console.error('Error in trackInteraction:', error);
      }
    },
    [trackInteractionMutation]
  );

  // Event tracking helpers
  const trackPageView = useCallback(
    (path: string, metadata?: Record<string, any>) => {
      trackInteraction({
        interactionType: 'page_view',
        pageUrl: path,
        metadata,
      });
    },
    [trackInteraction]
  );

  const trackButtonClick = useCallback(
    (buttonId: string, metadata?: Record<string, any>) => {
      trackInteraction({
        interactionType: 'button_click',
        component: buttonId,
        metadata,
      });
    },
    [trackInteraction]
  );

  const trackFormSubmit = useCallback(
    (formId: string, metadata?: Record<string, any>) => {
      trackInteraction({
        interactionType: 'form_submit',
        component: formId,
        metadata,
      });
    },
    [trackInteraction]
  );

  const trackError = useCallback(
    (errorSource: string, errorData?: Record<string, any>) => {
      trackInteraction({
        interactionType: 'error',
        component: errorSource,
        metadata: errorData,
      });
    },
    [trackInteraction]
  );

  return {
    trackInteraction,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackError,
    isTracking: isPending,
  };
}