/**
 * User Interaction Tracking Hook
 * 
 * This hook provides client-side tracking for user interactions.
 * It automatically captures key interactions (page views, clicks, etc.)
 * and sends them to the server.
 */

import { useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// List of standard interaction types
export type InteractionType = 
  | 'page_view'
  | 'button_click'
  | 'link_click'
  | 'form_submit'
  | 'form_error'
  | 'filter_apply'
  | 'sort_apply'
  | 'document_view'
  | 'document_download'
  | 'search_query'
  | 'suggestion_click'
  | 'tab_change'
  | 'modal_open'
  | 'modal_close'
  | 'tooltip_view'
  | 'dropdown_select'
  | 'navigation'
  | 'user_feedback'
  | 'error_encounter'
  | 'api_request'
  | 'custom';

// Interface for tracking parameters
interface TrackingParams {
  interactionType: InteractionType;
  pageUrl?: string;
  component?: string;
  elementId?: string;
  elementText?: string;
  interactionValue?: string;
  metadata?: Record<string, any>;
  success?: boolean;
}

// Options for initializing the hook
export interface UserInteractionOptions {
  // Whether to track page views automatically
  trackPageViews?: boolean;
  // Whether to track clicks automatically
  trackClicks?: boolean;
  // Whether to track forms automatically
  trackForms?: boolean;
  // Whether to disable tracking completely
  disabled?: boolean;
  // Success callback
  onSuccess?: () => void;
  // Error callback
  onError?: (error: Error) => void;
}

/**
 * Hook for tracking user interactions
 */
export function useUserInteraction(options: UserInteractionOptions = {}) {
  const { 
    trackPageViews = true,
    trackClicks = true,
    trackForms = true,
    disabled = false,
    onSuccess,
    onError
  } = options;
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use a ref to store the last tracked page
  const lastPageRef = useRef<string>('');
  
  // Keep a log of recent interactions to prevent duplicates
  const recentInteractionsRef = useRef<Record<string, number>>({});
  
  // Calculate device type based on screen width
  const getDeviceType = useCallback(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }
    return null;
  }, []);
  
  /**
   * Track a user interaction
   */
  const trackInteraction = useCallback(async ({
    interactionType,
    pageUrl = typeof window !== 'undefined' ? window.location.pathname : null,
    component,
    elementId,
    elementText,
    interactionValue,
    metadata = {},
    success = true
  }: TrackingParams) => {
    if (disabled) return;
    
    try {
      // Create a key for this interaction to prevent duplicates
      const interactionKey = `${interactionType}-${pageUrl}-${component}-${elementId}-${interactionValue}`;
      const now = Date.now();
      
      // Prevent duplicate interactions within 1 second
      if (interactionType !== 'page_view' && recentInteractionsRef.current[interactionKey] && 
          now - recentInteractionsRef.current[interactionKey] < 1000) {
        return;
      }
      
      // Store this interaction time
      recentInteractionsRef.current[interactionKey] = now;
      
      // Add standard metadata
      const enrichedMetadata = {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        deviceType: getDeviceType(),
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
        timestamp: new Date().toISOString()
      };
      
      // Send the interaction to the server
      await apiRequest('POST', '/api/user-interactions', {
        interactionType,
        pageUrl,
        component,
        elementId,
        elementText,
        interactionValue,
        metadata: enrichedMetadata,
        deviceType: getDeviceType(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        success
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error tracking interaction:', error);
      if (onError) onError(error as Error);
    }
  }, [disabled, getDeviceType, onSuccess, onError]);
  
  /**
   * Track page view
   */
  const trackPageView = useCallback(() => {
    if (!trackPageViews || disabled) return;
    
    const currentPage = window.location.pathname;
    
    // Only track if the page has changed
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      
      trackInteraction({
        interactionType: 'page_view',
        pageUrl: currentPage,
        component: 'page',
        metadata: {
          title: document.title,
          fullUrl: window.location.href
        }
      });
    }
  }, [trackPageViews, disabled, trackInteraction]);
  
  /**
   * Click handler for tracking clicks
   */
  const handleClick = useCallback((event: MouseEvent) => {
    if (!trackClicks || disabled) return;
    
    const target = event.target as HTMLElement;
    
    // Track button clicks
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      const button = target.tagName === 'BUTTON' ? target : target.closest('button');
      if (button) {
        trackInteraction({
          interactionType: 'button_click',
          elementId: button.id || null,
          elementText: button.textContent || null,
          component: getComponentName(button)
        });
      }
    }
    
    // Track link clicks
    if (target.tagName === 'A' || target.closest('a')) {
      const link = target.tagName === 'A' ? target : target.closest('a');
      if (link) {
        trackInteraction({
          interactionType: 'link_click',
          elementId: link.id || null,
          elementText: link.textContent || null,
          interactionValue: (link as HTMLAnchorElement).href || null,
          component: getComponentName(link)
        });
      }
    }
  }, [trackClicks, disabled, trackInteraction]);
  
  /**
   * Form submit handler for tracking form submissions
   */
  const handleFormSubmit = useCallback((event: Event) => {
    if (!trackForms || disabled) return;
    
    const form = event.target as HTMLFormElement;
    
    trackInteraction({
      interactionType: 'form_submit',
      elementId: form.id || null,
      component: getComponentName(form),
      metadata: {
        formAction: form.action || null,
        formMethod: form.method || null,
        formElements: form.elements.length
      }
    });
  }, [trackForms, disabled, trackInteraction]);
  
  /**
   * Helper to get component name from element
   */
  const getComponentName = (element: HTMLElement | null): string | null => {
    if (!element) return null;
    
    // Try to find a data-component attribute
    if (element.dataset.component) {
      return element.dataset.component;
    }
    
    // Look for component name in class names (like "Button" in shadcn components)
    const componentClasses = Array.from(element.classList).filter(cls => 
      cls.startsWith('Button') || 
      cls.startsWith('Card') || 
      cls.startsWith('Dialog') ||
      cls.startsWith('Form') ||
      cls.startsWith('Input') ||
      cls.startsWith('Select') ||
      cls.startsWith('Table')
    );
    
    if (componentClasses.length > 0) {
      return componentClasses[0];
    }
    
    // Return the element tag name as fallback
    return element.tagName.toLowerCase();
  };
  
  // Set up event listeners
  useEffect(() => {
    if (disabled) return;
    
    // Track initial page view
    trackPageView();
    
    // Add event listeners for automatic tracking
    if (trackClicks) {
      document.addEventListener('click', handleClick);
    }
    
    if (trackForms) {
      document.addEventListener('submit', handleFormSubmit);
    }
    
    // Listen for route changes
    const handleRouteChange = () => {
      trackPageView();
    };
    
    // Use a MutationObserver to detect SPA navigation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'childList' &&
          mutation.target.nodeName === 'TITLE'
        ) {
          handleRouteChange();
        }
      });
    });
    
    // Start observing title changes (common in SPA navigation)
    if (document.querySelector('title')) {
      observer.observe(document.querySelector('title')!, { 
        childList: true 
      });
    }
    
    // Clean up event listeners
    return () => {
      if (trackClicks) {
        document.removeEventListener('click', handleClick);
      }
      
      if (trackForms) {
        document.removeEventListener('submit', handleFormSubmit);
      }
      
      observer.disconnect();
    };
  }, [
    disabled, 
    trackPageViews, 
    trackClicks, 
    trackForms, 
    handleClick, 
    handleFormSubmit, 
    trackPageView
  ]);
  
  return { trackInteraction };
}