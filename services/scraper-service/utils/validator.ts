/**
 * Utility functions for validating input
 */

/**
 * Validates a cron schedule format
 * @param schedule The cron schedule string to validate
 * @returns True if the schedule is valid, false otherwise
 */
export const validateSchedule = (schedule: string): boolean => {
  try {
    // Regular expression to validate cron schedule format
    // This pattern matches the standard cron format: * * * * *
    // (minute, hour, day of month, month, day of week)
    const cronPattern = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])-([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(,([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]))*)(\s+(\*|([0-9]|1[0-9]|2[0-3])|([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])|([0-9]|1[0-9]|2[0-3])(,([0-9]|1[0-9]|2[0-3])))*)(\s+(\*|([1-9]|[12][0-9]|3[01])|([1-9]|[12][0-9]|3[01])-([1-9]|[12][0-9]|3[01])|([1-9]|[12][0-9]|3[01])(,([1-9]|[12][0-9]|3[01])))*)(\s+(\*|([1-9]|1[0-2])|([1-9]|1[0-2])-([1-9]|1[0-2])|([1-9]|1[0-2])(,([1-9]|1[0-2])))*)(\s+(\*|([0-6])|([0-6])-([0-6])|([0-6])(,([0-6]))*))*$/;
    
    // Check if the schedule matches the pattern
    if (!cronPattern.test(schedule)) {
      console.error(`[Validator] Invalid cron schedule format: ${schedule}`);
      return false;
    }
    
    // Additional validation for each part of the cron expression
    const parts = schedule.trim().split(/\s+/);
    
    // Basic cron expression must have exactly 5 parts
    if (parts.length !== 5) {
      console.error(`[Validator] Cron schedule must have 5 parts: ${schedule}`);
      return false;
    }
    
    // Validate minutes (0-59)
    const validateMinutes = (minutePart: string): boolean => {
      if (minutePart === '*') return true;
      
      const minutes = minutePart.split(',');
      for (const minute of minutes) {
        const range = minute.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0], 10);
          const end = parseInt(range[1], 10);
          if (isNaN(start) || isNaN(end) || start < 0 || start > 59 || end < 0 || end > 59 || start > end) {
            return false;
          }
        } else {
          const value = parseInt(minute, 10);
          if (isNaN(value) || value < 0 || value > 59) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Validate hours (0-23)
    const validateHours = (hourPart: string): boolean => {
      if (hourPart === '*') return true;
      
      const hours = hourPart.split(',');
      for (const hour of hours) {
        const range = hour.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0], 10);
          const end = parseInt(range[1], 10);
          if (isNaN(start) || isNaN(end) || start < 0 || start > 23 || end < 0 || end > 23 || start > end) {
            return false;
          }
        } else {
          const value = parseInt(hour, 10);
          if (isNaN(value) || value < 0 || value > 23) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Validate days of month (1-31)
    const validateDaysOfMonth = (dayPart: string): boolean => {
      if (dayPart === '*') return true;
      
      const days = dayPart.split(',');
      for (const day of days) {
        const range = day.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0], 10);
          const end = parseInt(range[1], 10);
          if (isNaN(start) || isNaN(end) || start < 1 || start > 31 || end < 1 || end > 31 || start > end) {
            return false;
          }
        } else {
          const value = parseInt(day, 10);
          if (isNaN(value) || value < 1 || value > 31) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Validate months (1-12)
    const validateMonths = (monthPart: string): boolean => {
      if (monthPart === '*') return true;
      
      const months = monthPart.split(',');
      for (const month of months) {
        const range = month.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0], 10);
          const end = parseInt(range[1], 10);
          if (isNaN(start) || isNaN(end) || start < 1 || start > 12 || end < 1 || end > 12 || start > end) {
            return false;
          }
        } else {
          const value = parseInt(month, 10);
          if (isNaN(value) || value < 1 || value > 12) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Validate days of week (0-6, where 0 is Sunday)
    const validateDaysOfWeek = (dayOfWeekPart: string): boolean => {
      if (dayOfWeekPart === '*') return true;
      
      const daysOfWeek = dayOfWeekPart.split(',');
      for (const dayOfWeek of daysOfWeek) {
        const range = dayOfWeek.split('-');
        if (range.length === 2) {
          const start = parseInt(range[0], 10);
          const end = parseInt(range[1], 10);
          if (isNaN(start) || isNaN(end) || start < 0 || start > 6 || end < 0 || end > 6 || start > end) {
            return false;
          }
        } else {
          const value = parseInt(dayOfWeek, 10);
          if (isNaN(value) || value < 0 || value > 6) {
            return false;
          }
        }
      }
      return true;
    };
    
    // Check all parts of the cron expression
    if (!validateMinutes(parts[0]) ||
        !validateHours(parts[1]) ||
        !validateDaysOfMonth(parts[2]) ||
        !validateMonths(parts[3]) ||
        !validateDaysOfWeek(parts[4])) {
      console.error(`[Validator] Cron schedule has invalid values: ${schedule}`);
      return false;
    }
    
    // All checks passed
    return true;
  } catch (error) {
    console.error(`[Validator] Error validating cron schedule: ${error}`);
    return false;
  }
};

/**
 * Validates a URL format
 * @param url The URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
export const validateURL = (url: string): boolean => {
  try {
    // Use built-in URL object to validate
    new URL(url);
    return true;
  } catch (error) {
    console.error(`[Validator] Invalid URL: ${url}`);
    return false;
  }
};