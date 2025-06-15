export const GOOGLE_CONFIG = {
  // شناسه Google Sheets شما
  SPREADSHEET_ID: '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w',
  
  // API Key برای دسترسی به Google Sheets و Drive
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  
  // بررسی اینکه آیا API Key تنظیم شده است یا نه
  isConfigured(): boolean {
    return !!(this.API_KEY && this.API_KEY !== 'your_google_api_key_here');
  }
};