/**
 * Issues Logger
 * 
 * This utility provides functionality to track issues and user behavior
 * throughout the application. It automatically logs client-side errors,
 * including React errors, fetch errors, and unhandled promise rejections.
 * 
 * Features:
 * - Automatic error tracking (global errors, unhandled rejections)
 * - Manual error logging
 * - User behavior tracking
 * - Performance monitoring
 */

import { apiRequest } from '@/lib/queryClient';

// Issue types
export type IssueType = 'error' | 'crash' | 'behavior' | 'performance';

// Issue severity levels
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

// Interface for issue data
export interface IssueData {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  stackTrace?: string;
  component?: string;
  action?: string;
  url?: string;
  metadata?: Record<string, any>;
}

class IssuesLogger {
  private initialized = false;

  /**
   * Initialize the issues logger and set up global error handlers
   */
  public init(): void {
    if (this.initialized) return;

    // Set up global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

    this.initialized = true;
    console.log('[IssuesLogger] Initialized');
  }

  /**
   * Log an issue to the server
   */
  public async logIssue(issueData: IssueData): Promise<void> {
    try {
      // Add current URL if not provided
      if (!issueData.url) {
        issueData.url = window.location.href;
      }

      // Send issue to server
      await apiRequest('/api/issues', {
        method: 'POST',
        body: JSON.stringify(issueData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`[IssuesLogger] Logged ${issueData.type} issue: ${issueData.message}`);
    } catch (error) {
      // Log to console if we can't send to server (don't create infinite loop)
      console.error('[IssuesLogger] Failed to log issue:', error);
      console.error('Original issue:', issueData);
    }
  }

  /**
   * Log an error
   */
  public logError(error: Error, component?: string, metadata?: Record<string, any>): void {
    this.logIssue({
      type: 'error',
      severity: 'high',
      message: error.message,
      stackTrace: error.stack,
      component,
      metadata
    });
  }

  /**
   * Log a crash
   */
  public logCrash(error: Error, component?: string, metadata?: Record<string, any>): void {
    this.logIssue({
      type: 'crash',
      severity: 'critical',
      message: error.message,
      stackTrace: error.stack,
      component,
      metadata
    });
  }

  /**
   * Log user behavior
   */
  public logBehavior(
    action: string, 
    component?: string, 
    metadata?: Record<string, any>,
    severity: IssueSeverity = 'low'
  ): void {
    this.logIssue({
      type: 'behavior',
      severity,
      message: `User action: ${action}`,
      action,
      component,
      metadata
    });
  }

  /**
   * Log performance issue
   */
  public logPerformance(
    message: string, 
    metrics: Record<string, number>,
    component?: string,
    severity: IssueSeverity = 'medium'
  ): void {
    this.logIssue({
      type: 'performance',
      severity,
      message,
      component,
      metadata: metrics
    });
  }

  /**
   * Handle global window errors
   */
  private handleGlobalError(event: ErrorEvent): void {
    if (!event || !event.error) return;

    this.logIssue({
      type: 'error',
      severity: 'high',
      message: event.message || 'Unknown error',
      stackTrace: event.error.stack,
      url: window.location.href
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    if (!event || !event.reason) return;

    const reason = event.reason;
    const message = reason.message || String(reason);
    const stack = reason.stack || new Error().stack;

    this.logIssue({
      type: 'error',
      severity: 'high',
      message: `Unhandled Promise Rejection: ${message}`,
      stackTrace: stack,
      url: window.location.href
    });
  }
}

// Create singleton instance
export const issuesLogger = new IssuesLogger();

// Initialize logger immediately
if (typeof window !== 'undefined') {
  setTimeout(() => {
    issuesLogger.init();
  }, 0);
}

// Utility function to use in React components for error boundaries
export function logComponentError(error: Error, componentInfo: { componentStack: string }): void {
  issuesLogger.logCrash(error, 'React Error Boundary', { componentStack: componentInfo.componentStack });
}