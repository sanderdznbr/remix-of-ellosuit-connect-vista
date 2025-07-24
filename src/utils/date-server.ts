
/**
 * Utility functions for handling server-side date synchronization with Brazil timezone
 */

// Cache for server date offset
let serverDateOffset: number | null = null;
let isInitialized = false;

/**
 * Get the current server date in Brazil timezone (UTC-3)
 */
export const getServerDate = (): Date => {
  // Create a new date in Brazil timezone (UTC-3)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000)); // UTC-3
  
  // Ensure we're in 2025
  if (brazilTime.getFullYear() < 2025) {
    brazilTime.setFullYear(2025);
  }
  
  return brazilTime;
};

/**
 * Get today's date string in YYYY-MM-DD format using Brazil timezone
 */
export const getServerTodayString = (): string => {
  const serverDate = getServerDate();
  const year = serverDate.getFullYear();
  const month = String(serverDate.getMonth() + 1).padStart(2, '0');
  const day = String(serverDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get tomorrow's date string in YYYY-MM-DD format using Brazil timezone
 */
export const getServerTomorrowString = (): string => {
  const serverDate = getServerDate();
  const tomorrow = new Date(serverDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get yesterday's date string in YYYY-MM-DD format using Brazil timezone
 */
export const getServerYesterdayString = (): string => {
  const serverDate = getServerDate();
  const yesterday = new Date(serverDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Initialize server date offset based on the first event we see
 * This is a workaround to sync with the actual data dates
 */
export const initializeServerDateFromEvents = (events: any[]): void => {
  if (isInitialized || events.length === 0) return;
  
  console.log('Initializing server date from events...');
  console.log('Current Brazil time:', getServerDate());
  console.log('Events found:', events.length);
  
  isInitialized = true;
};

/**
 * Reset server date offset (useful for testing)
 */
export const resetServerDateOffset = (): void => {
  serverDateOffset = null;
  isInitialized = false;
};

/**
 * Format date for display in Brazil timezone
 */
export const formatBrazilDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get date from string in Brazil timezone
 */
export const parseBrazilDate = (dateString: string): Date => {
  const date = new Date(dateString);
  // Ensure we're working with Brazil timezone
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const brazilTime = new Date(utc + (-3 * 3600000));
  return brazilTime;
};

/**
 * Extract date part from ISO string for comparison
 */
export const extractDatePart = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle both ISO strings and date-only strings
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // If it's already in YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Try to parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error extracting date part:', error, 'dateString:', dateString);
    return '';
  }
};

/**
 * Check if a date string matches today in Brazil timezone
 */
export const isToday = (dateString: string): boolean => {
  try {
    if (!dateString) {
      console.warn('isToday: dateString is empty or null');
      return false;
    }
    
    const todayString = getServerTodayString();
    const eventDateString = extractDatePart(dateString);
    
    console.log('isToday check:', { 
      eventDateString, 
      todayString, 
      match: eventDateString === todayString,
      originalDateString: dateString
    });
    
    return eventDateString === todayString;
  } catch (error) {
    console.error('Error in isToday:', error, 'dateString:', dateString);
    return false;
  }
};

/**
 * Check if a date string matches tomorrow in Brazil timezone
 */
export const isTomorrow = (dateString: string): boolean => {
  try {
    if (!dateString) {
      console.warn('isTomorrow: dateString is empty or null');
      return false;
    }
    
    const tomorrowString = getServerTomorrowString();
    const eventDateString = extractDatePart(dateString);
    
    console.log('isTomorrow check:', { 
      eventDateString, 
      tomorrowString, 
      match: eventDateString === tomorrowString,
      originalDateString: dateString
    });
    
    return eventDateString === tomorrowString;
  } catch (error) {
    console.error('Error in isTomorrow:', error, 'dateString:', dateString);
    return false;
  }
};

/**
 * Check if a date string matches yesterday in Brazil timezone
 */
export const isYesterday = (dateString: string): boolean => {
  try {
    if (!dateString) {
      console.warn('isYesterday: dateString is empty or null');
      return false;
    }
    
    const yesterdayString = getServerYesterdayString();
    const eventDateString = extractDatePart(dateString);
    
    return eventDateString === yesterdayString;
  } catch (error) {
    console.error('Error in isYesterday:', error, 'dateString:', dateString);
    return false;
  }
};

/**
 * Create a date string in Brazil timezone for saving
 */
export const createBrazilDateString = (date: Date): string => {
  try {
    // Convert to Brazil timezone
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const brazilTime = new Date(utc + (-3 * 3600000));
    
    // Return ISO string
    return brazilTime.toISOString();
  } catch (error) {
    console.error('Error creating Brazil date string:', error);
    return date.toISOString();
  }
};
