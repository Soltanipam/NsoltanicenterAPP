export const GOOGLE_CONFIG = {
  // شناسه Google Sheets شما
  SPREADSHEET_ID: '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w',
  
  // API Key برای دسترسی به Google Sheets و Drive
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  
  // Client ID برای OAuth
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  
  // Client Secret برای OAuth
  CLIENT_SECRET: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  
  // Redirect URI برای OAuth
  REDIRECT_URI: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback',
  
  // دسترسی‌های مورد نیاز
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],

  // بررسی اینکه آیا OAuth تنظیم شده است یا نه
  isConfigured(): boolean {
    return !!(this.CLIENT_ID && this.CLIENT_SECRET && this.API_KEY);
  }
};