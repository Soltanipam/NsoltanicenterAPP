import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { googleSheetsService } from '../lib/googleSheets';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'receptionist' | 'technician' | 'warehouse' | 'detailing' | 'accountant';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  jobDescription?: string;
  permissions?: {
    canViewReceptions?: boolean;
    canCreateTask?: boolean;
    canCreateReception?: boolean;
    canCompleteServices?: boolean;
    canManageCustomers?: boolean;
    canViewHistory?: boolean;
  };
  settings?: {
    sidebarOpen: boolean;
  };
  active?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateUserSettings: (settings: Partial<User['settings']>) => void;
  initialize: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

// Default admin user for initial setup
const DEFAULT_ADMIN_USER: User = {
  id: 'admin-default',
  username: 'admin',
  name: 'مدیر سیستم',
  role: 'admin',
  jobDescription: 'مدیر کل سیستم',
  permissions: {
    canViewReceptions: true,
    canCreateTask: true,
    canCreateReception: true,
    canCompleteServices: true,
    canManageCustomers: true,
    canViewHistory: true
  },
  settings: { sidebarOpen: true },
  active: true
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      connectionStatus: 'checking',
      
      checkConnection: async () => {
        try {
          set({ connectionStatus: 'checking' });
          
          // بررسی اتصال اینترنت
          if (!navigator.onLine) {
            set({ connectionStatus: 'disconnected' });
            return false;
          }

          // تست اتصال به Google Sheets
          try {
            await googleSheetsService.getUsers();
            set({ connectionStatus: 'connected' });
            return true;
          } catch (error) {
            console.error('Connection to Google Sheets failed:', error);
            set({ connectionStatus: 'disconnected' });
            return false;
          }
        } catch (error) {
          console.error('Connection check failed:', error);
          set({ connectionStatus: 'disconnected' });
          return false;
        }
      },
      
      initialize: async () => {
        try {
          console.log('Initializing auth store...');
          
          // بررسی اتصال
          await get().checkConnection();
          
          set({ isInitialized: true });
          console.log('Auth store initialized');
        } catch (error) {
          console.error('Error initializing auth store:', error);
          set({ isInitialized: true, connectionStatus: 'disconnected' });
        }
      },
      
      login: async (username: string, password: string) => {
        try {
          console.log('Starting login process for:', username);
          
          // بررسی کاربر پیش‌فرض admin
          if (username === 'admin' && password === 'admin123') {
            console.log('Default admin login successful');
            set({ user: DEFAULT_ADMIN_USER, isAuthenticated: true });
            return { success: true };
          }
          
          // بررسی اتصال
          const isConnected = await get().checkConnection();
          
          if (!isConnected) {
            return { 
              success: false, 
              message: 'خطا در ارتباط با Google Sheets. لطفاً فایل credentials.json را بررسی کنید.' 
            };
          }

          // حالت آنلاین - بررسی Google Sheets
          try {
            const users = await googleSheetsService.getUsers();
            const userData = users.find((u: any) => 
              u.username === username && u.active === 'true'
            );

            if (!userData) {
              return { 
                success: false, 
                message: 'نام کاربری یافت نشد یا حساب کاربری غیرفعال است' 
              };
            }

            // بررسی رمز عبور - اگر رمز عبور hash شده باشد
            let isPasswordValid = false;
            if (userData.password) {
              try {
                // تلاش برای بررسی hash
                isPasswordValid = await bcrypt.compare(password, userData.password);
              } catch (error) {
                // اگر hash نبود، مقایسه مستقیم
                isPasswordValid = userData.password === password;
              }
            }

            if (!isPasswordValid) {
              return { 
                success: false, 
                message: 'رمز عبور اشتباه است' 
              };
            }

            // ایجاد شیء کاربر
            const user: User = {
              id: userData.id,
              username: userData.username,
              name: userData.name,
              role: userData.role as UserRole || 'technician',
              jobDescription: userData.job_description,
              permissions: typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : (userData.permissions || {}),
              settings: typeof userData.settings === 'string' ? JSON.parse(userData.settings) : (userData.settings || { sidebarOpen: true }),
              active: userData.active === 'true'
            };

            set({ user, isAuthenticated: true });
            console.log('User login successful:', user.username);

            return { success: true };

          } catch (error) {
            console.error('Google Sheets error:', error);
            return { 
              success: false, 
              message: 'خطا در برقراری ارتباط با Google Sheets. لطفاً فایل credentials.json را بررسی کنید.' 
            };
          }

        } catch (error) {
          console.error('Login error:', error);
          return { 
            success: false, 
            message: 'خطا در برقراری ارتباط با سرور' 
          };
        }
      },
      
      logout: async () => {
        try {
          console.log('User logging out');
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout even if there's an error
          set({ user: null, isAuthenticated: false });
        }
      },
      
      updateUser: (updatedUser: User) => {
        set({ user: updatedUser });
      },

      updateUserSettings: async (settings: Partial<User['settings']>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            settings: {
              ...currentUser.settings,
              ...settings
            }
          };
          
          set({ user: updatedUser });
          
          // به‌روزرسانی در Google Sheets
          if (get().connectionStatus === 'connected') {
            try {
              await googleSheetsService.updateUser(currentUser.id, {
                settings: JSON.stringify(updatedUser.settings)
              });
            } catch (error) {
              console.error('Error updating user settings:', error);
            }
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await localforage.getItem(name);
            return value || null;
          } catch (error) {
            console.error('Error getting item from storage:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await localforage.setItem(name, value);
          } catch (error) {
            console.error('Error setting item in storage:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await localforage.removeItem(name);
          } catch (error) {
            console.error('Error removing item from storage:', error);
          }
        },
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);