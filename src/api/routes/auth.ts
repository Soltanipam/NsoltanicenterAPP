// Authentication API routes
import { googleSheetsAPI } from '../googleSheets';

export async function loginUser(username: string, password: string) {
  try {
    const users = await googleSheetsAPI.readSheet('users');
    
    // Find user with matching credentials
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return {
        success: false,
        message: 'نام کاربری یا رمز عبور اشتباه است'
      };
    }

    if (user.active !== 'true' && user.active !== true) {
      return {
        success: false,
        message: 'حساب کاربری شما غیرفعال است'
      };
    }

    // Parse permissions and settings
    let permissions = {};
    let settings = { sidebarOpen: true };

    try {
      permissions = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : (user.permissions || {});
    } catch (e) {
      console.warn('Failed to parse user permissions:', e);
    }

    try {
      settings = typeof user.settings === 'string' 
        ? JSON.parse(user.settings) 
        : (user.settings || { sidebarOpen: true });
    } catch (e) {
      console.warn('Failed to parse user settings:', e);
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        jobDescription: user.job_description,
        active: user.active === 'true' || user.active === true,
        permissions,
        settings,
        auth_user_id: user.auth_user_id || user.id,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'خطا در برقراری ارتباط با Google Sheets'
    };
  }
}

export async function checkConnection() {
  try {
    await googleSheetsAPI.readSheet('users');
    return { success: true, connected: true };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { success: false, connected: false, error: error.message };
  }
}