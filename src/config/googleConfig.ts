export const GOOGLE_CONFIG = {
  SPREADSHEET_ID: '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w',
  DRIVE_FOLDER_ID: 'your-drive-folder-id', // فولدر اصلی برای ذخیره فایل‌ها
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  SHEETS: {
    USERS: 'users',
    CUSTOMERS: 'customers', 
    RECEPTIONS: 'receptions',
    TASKS: 'tasks',
    MESSAGES: 'messages',
    SMS_SETTINGS: 'sms_settings',
    SMS_LOGS: 'sms_logs'
  }
};

export const GOOGLE_CLIENT_CONFIG = {
  client_id: 'your-google-oauth-client-id.apps.googleusercontent.com',
  redirect_uri: window.location.origin + '/auth/callback'
};