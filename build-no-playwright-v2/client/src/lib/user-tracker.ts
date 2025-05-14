/**
 * User Action Tracker
 * 
 * This module provides functions to track user actions and behaviors
 * throughout the application. It uses the issues-logger to log these
 * actions to the server.
 */

import { issuesLogger } from './issues-logger';

// Define common user actions for consistent tracking
export enum UserAction {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  
  // Navigation actions
  PAGE_VIEW = 'page_view',
  SECTION_VIEW = 'section_view',
  
  // Business setup actions
  START_BUSINESS_SETUP = 'start_business_setup',
  COMPLETE_BUSINESS_STEP = 'complete_business_step',
  SUBMIT_BUSINESS_FORM = 'submit_business_form',
  
  // Document actions
  VIEW_DOCUMENT = 'view_document',
  DOWNLOAD_DOCUMENT = 'download_document',
  UPLOAD_DOCUMENT = 'upload_document',
  
  // Search actions
  SEARCH_QUERY = 'search_query',
  FILTER_APPLIED = 'filter_applied',
  
  // Conversation actions
  START_CONVERSATION = 'start_conversation',
  SEND_MESSAGE = 'send_message',
  RECEIVE_RESPONSE = 'receive_response',
  
  // UI interactions
  BUTTON_CLICK = 'button_click',
  FORM_INPUT = 'form_input',
  FORM_SUBMISSION = 'form_submission',
  DROPDOWN_CHANGE = 'dropdown_change',
  
  // Error encounters
  ENCOUNTER_ERROR = 'encounter_error',
  RECOVER_FROM_ERROR = 'recover_from_error'
}

/**
 * Track a user action
 * 
 * @param action The action being performed
 * @param component The component where the action occurred
 * @param metadata Additional data about the action
 */
export function trackUserAction(
  action: UserAction | string,
  component?: string,
  metadata?: Record<string, any>
): void {
  issuesLogger.logBehavior(action, component, metadata);
}

/**
 * Track a page view
 * 
 * @param path The path being viewed
 * @param title The page title
 * @param referrer The referring page
 */
export function trackPageView(
  path: string = window.location.pathname,
  title: string = document.title,
  referrer: string = document.referrer
): void {
  trackUserAction(
    UserAction.PAGE_VIEW,
    'Navigation',
    { path, title, referrer, timestamp: new Date().toISOString() }
  );
}

/**
 * Track a click event
 * 
 * @param element The element being clicked
 * @param component The component containing the element
 * @param metadata Additional data about the click
 */
export function trackClick(
  element: string,
  component: string,
  metadata?: Record<string, any>
): void {
  trackUserAction(
    UserAction.BUTTON_CLICK,
    component,
    { element, ...metadata }
  );
}

/**
 * Track form submission
 * 
 * @param formName The name of the form
 * @param component The component containing the form
 * @param success Whether the submission was successful
 * @param metadata Additional data about the submission
 */
export function trackFormSubmission(
  formName: string,
  component: string,
  success: boolean,
  metadata?: Record<string, any>
): void {
  trackUserAction(
    UserAction.FORM_SUBMISSION,
    component,
    { formName, success, ...metadata }
  );
}

/**
 * Track a search query
 * 
 * @param query The search query
 * @param component The component where the search was performed
 * @param resultsCount The number of results
 * @param metadata Additional data about the search
 */
export function trackSearch(
  query: string,
  component: string,
  resultsCount?: number,
  metadata?: Record<string, any>
): void {
  trackUserAction(
    UserAction.SEARCH_QUERY,
    component,
    { query, resultsCount, ...metadata }
  );
}

/**
 * Track AI conversation interaction
 * 
 * @param messageType 'user' or 'assistant'
 * @param conversationId The ID of the conversation
 * @param metadata Additional data about the message
 */
export function trackConversation(
  messageType: 'user' | 'assistant',
  conversationId: string | number,
  metadata?: Record<string, any>
): void {
  const action = messageType === 'user' 
    ? UserAction.SEND_MESSAGE 
    : UserAction.RECEIVE_RESPONSE;
  
  trackUserAction(
    action,
    'Conversation',
    { conversationId, messageType, ...metadata }
  );
}

// Setup automatic page view tracking
if (typeof window !== 'undefined') {
  // Track initial page load
  window.addEventListener('load', () => {
    trackPageView();
  });
  
  // For SPA navigation, you would need to integrate with router
  // This is a simplified example that assumes no router
  // In a real app with router, you'd hook into route change events
}