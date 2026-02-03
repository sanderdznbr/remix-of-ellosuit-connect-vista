// App configuration constants
export const APP_CONFIG = {
  // Production domain for meeting links and public URLs
  PRODUCTION_URL: 'https://www.ellosuit.online',
  
  // Get the base URL for meetings
  getMeetingUrl: (roomCode: string) => `https://www.ellosuit.online/meet/${roomCode}`,
  
  // Get the base URL for booking/scheduling
  getBookingUrl: (slug: string) => `https://www.ellosuit.online/agendamentos/${slug}`,
  
  // Get dashboard URL for OAuth redirects
  getDashboardUrl: () => 'https://www.ellosuit.online/dashboard',
};

export default APP_CONFIG;
