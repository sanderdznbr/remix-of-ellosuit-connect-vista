/**
 * Utility functions for handling server-side date synchronization
 */

// Cache for server date offset
let serverDateOffset: number | null = null;

/**
 * Get the current server date by calculating offset from a known reference
 * Since we can't directly query server time, we'll use a more reliable approach
 */
export const getServerDate = (): Date => {
  // If we have a cached offset, use it
  if (serverDateOffset !== null) {
    return new Date(Date.now() + serverDateOffset);
  }
  
  // For now, return the current date but we'll improve this with actual server sync
  return new Date();
};

/**
 * Get today's date string in YYYY-MM-DD format using server time
 */
export const getServerTodayString = (): string => {
  const serverDate = getServerDate();
  return serverDate.toISOString().split('T')[0];
};

/**
 * Get tomorrow's date string in YYYY-MM-DD format using server time
 */
export const getServerTomorrowString = (): string => {
  const serverDate = getServerDate();
  const tomorrow = new Date(serverDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

/**
 * Initialize server date offset based on the first event we see
 * This is a workaround to sync with the actual data dates
 */
export const initializeServerDateFromEvents = (events: any[]): void => {
  if (events.length === 0 || serverDateOffset !== null) return;
  
  // Find the most recent event to estimate server date
  const sortedEvents = events
    .map(event => new Date(event.start_date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  if (sortedEvents.length > 0) {
    const latestEventDate = sortedEvents[0];
    const clientDate = new Date();
    
    // If the latest event is significantly in the future compared to client date,
    // assume we need to adjust our reference
    const daysDifference = Math.floor((latestEventDate.getTime() - clientDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (Math.abs(daysDifference) > 30) { // More than 30 days difference
      // Use the event date as a more reliable reference
      const today = new Date(latestEventDate);
      today.setHours(clientDate.getHours(), clientDate.getMinutes(), clientDate.getSeconds(), clientDate.getMilliseconds());
      
      serverDateOffset = today.getTime() - clientDate.getTime();
      console.log(`Server date offset initialized: ${daysDifference} days difference detected`);
    }
  }
};

/**
 * Reset server date offset (useful for testing)
 */
export const resetServerDateOffset = (): void => {
  serverDateOffset = null;
};