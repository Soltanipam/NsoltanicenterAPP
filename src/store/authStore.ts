import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { googleSheetsService } from '../services/googleSheets';
import { googleAuthService } from '../services/googleAuth';
import { offlineSyncService } from '../services/offlineSync';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'receptionist' | 'technician' | 'warehouse' | 'detailing' | 'accountant';

export interface User {
  id: string;
  email: string;
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
  auth_user_id?: string;
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

          // بررسی وجود Google access token
          const accessToken = googleAuthService.getAccessToken();
          if (!accessToken) {
            set({ connectionStatus: 'disconnected' });
            return false;
          }

          // تست اتصال به Google Sheets
          await googleSheetsService.getUsers();
          
          set({ connectionStatus: 'connected' });
          return true;
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
          const isConnected = await get().checkConnection();
          
          // بررسی وجود کاربر احراز هویت شده در localStorage
          const savedUser = offlineSyncService.getCachedData('current_user');
          if (savedUser) {
            set({ user: savedUser, isAuthenticated: true });
            console.log('User session restored:', savedUser.username);
          }
          
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
          
          // بررسی اتصال
          const isConnected = await get().checkConnection();
          
          if (!isConnected) {
            // حالت آفلاین - بررسی کش
            const cachedUsers = offlineSyncService.getCachedData('users');
            if (cachedUsers) {
              const user = cachedUsers.find((u: any) => 
                (u.username === username || u.email === username) && u.active
              );
              
              if (user && user.password && await bcrypt.compare(password, user.password)) {
                const userForAuth: User = {
                  id: user.id,
                  email: user.email,
                  username: user.username,
                  name: user.name,
                  role: user.role,
                  jobDescription: user.jobDescription,
                  permissions: user.permissions || {},
                  settings: user.settings || { sidebarOpen: true },
                  auth_user_id: user.auth_user_id
                };
                
                offlineSyncService.cacheData('current_user', userForAuth);
                set({ user: userForAuth, isAuthenticated: true });
                return { success: true };
              }
            }
            
            return { 
              success: false, 
              message: 'نام کاربری یا رمز عبور اشتباه است (حالت آفلاین)' 
            };
          }

          // حالت آنلاین - بررسی Google Sheets
          const users = await googleSheetsService.getUsers();
          const userData = users.find((u: any) => 
            (u.username === username || u.email === username) && u.active === 'true'
          );

          if (!userData) {
            return { 
              success: false, 
              message: 'نام کاربری یا ایمیل یافت نشد' 
            };
          }

          // بررسی رمز عبور
          if (!userData.password) {
            return { 
              success: false, 
              message: 'رمز عبور برای این کاربر تنظیم نشده است' 
            };
          }

          const isPasswordValid = await bcrypt.compare(password, userData.password);
          if (!isPasswordValid) {
            return { 
              success: false, 
              message: 'رمز عبور اشتباه است' 
            };
          }

          // ایجاد شیء کاربر
          const user: User = {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            name: userData.name,
            role: userData.role as UserRole,
            jobDescription: userData.job_description,
            permissions: userData.permissions ? JSON.parse(userData.permissions) : {},
            settings: userData.settings ? JSON.parse(userData.settings) : { sidebarOpen: true },
            auth_user_id: userData.auth_user_id
          };

          // کش کردن اطلاعات کاربر و لیست کاربران
          offlineSyncService.cacheData('current_user', user);
          offlineSyncService.cacheData('users', users);
          
          set({ user, isAuthenticated: true });
          console.log('User login successful:', user.username);

          return { success: true };

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
          offlineSyncService.clearCache();
          set({ user: null, isAuthenticated: false });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout even if there's an error
          set({ user: null, isAuthenticated: false });
        }
      },
      
      updateUser: (updatedUser: User) => {
        set({ user: updatedUser });
        offlineSyncService.cacheData('current_user', updatedUser);
      },

      updateUserSettings: (settings: Partial<User['settings']>) => {
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
          offlineSyncService.cacheData('current_user', updatedUser);
          
          // به‌روزرسانی در Google Sheets
          if (offlineSyncService.isConnected()) {
            googleSheetsService.updateUser(currentUser.id, {
              settings: JSON.stringify(updatedUser.settings)
            }).catch(error => {
              console.error('Error updating user settings:', error);
              // در صورت خطا، برای sync بعدی ذخیره کنیم
              offlineSyncService.queueAction('update', 'users', {
                id: currentUser.id,
                settings: JSON.stringify(updatedUser.settings)
              });
            });
          } else {
            offlineSyncService.queueAction('update', 'users', {
              id: currentUser.id,
              settings: JSON.stringify(updatedUser.settings)
            });
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