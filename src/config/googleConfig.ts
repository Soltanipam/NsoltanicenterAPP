export const GOOGLE_CONFIG = {
  // شناسه Google Sheets شما
  SPREADSHEET_ID: '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w',
  
  // اطلاعات OAuth که باید از Google Cloud Console دریافت کنید
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  CLIENT_SECRET: 'YOUR_GOOGLE_CLIENT_SECRET',
  
  // URL های مجاز برای redirect
  REDIRECT_URI: window.location.origin + '/auth/callback',
  
  // دسترسی‌های مورد نیاز
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
};