import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { googleAuthService, GoogleUser } from '../services/googleAuth';
import { googleSheetsService } from '../services/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

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
  googleUser?: GoogleUser;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  login: () => Promise<{ success: boolean; message?: string }>;
  handleAuthCallback: (code: string) => Promise<{ success: boolean; message?: string }>;
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

          // تست اتصال به Google Sheets
          if (googleAuthService.isAuthenticated()) {
            await googleSheetsService.getUsers();
          }
          
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
          
          // بررسی وجود کاربر احراز هویت شده
          if (googleAuthService.isAuthenticated()) {
            const googleUser = googleAuthService.getCurrentUser();
            
            if (googleUser && isConnected) {
              try {
                // جستجوی کاربر در Google Sheets
                const users = await googleSheetsService.getUsers();
                const existingUser = users.find(u => u.email === googleUser.email);
                
                if (existingUser) {
                  const user: User = {
                    id: existingUser.id as string,
                    email: existingUser.email as string,
                    username: existingUser.username as string,
                    name: existingUser.name as string,
                    role: (existingUser.role as UserRole) || 'technician',
                    jobDescription: existingUser.job_description as string,
                    permissions: existingUser.permissions ? JSON.parse(existingUser.permissions as string) : {},
                    settings: existingUser.settings ? JSON.parse(existingUser.settings as string) : { sidebarOpen: true },
                    googleUser
                  };
                  
                  set({ user, isAuthenticated: true });
                  console.log('User session restored:', user.username);
                } else {
                  // کاربر جدید - ایجاد پروفایل
                  await get().createUserProfile(googleUser);
                }
              } catch (error) {
                console.error('Error loading user profile:', error);
                // در صورت خطا، از کش استفاده کنیم
                const cachedUser = offlineSyncService.getCachedData('current_user');
                if (cachedUser) {
                  set({ user: cachedUser, isAuthenticated: true });
                }
              }
            }
          }
          
          set({ isInitialized: true });
          console.log('Auth store initialized');
        } catch (error) {
          console.error('Error initializing auth store:', error);
          set({ isInitialized: true, connectionStatus: 'disconnected' });
        }
      },

      createUserProfile: async (googleUser: GoogleUser) => {
        try {
          // بررسی اینکه آیا این اولین کاربر است
          const users = await googleSheetsService.getUsers();
          const isFirstUser = users.length === 0;
          
          const userData = {
            email: googleUser.email,
            username: googleUser.email.split('@')[0],
            name: googleUser.name,
            role: isFirstUser ? 'admin' : 'technician',
            job_description: isFirstUser ? 'مدیر کل سیستم' : '',
            permissions: JSON.stringify(isFirstUser ? {
              canViewReceptions: true,
              canCreateTask: true,
              canCreateReception: true,
              canCompleteServices: true,
              canManageCustomers: true,
              canViewHistory: true
            } : {}),
            settings: JSON.stringify({ sidebarOpen: true })
          };

          if (offlineSyncService.isConnected()) {
            await googleSheetsService.addUser(userData);
          } else {
            await offlineSyncService.queueAction('create', 'users', userData);
          }

          const user: User = {
            id: userData.id || Date.now().toString(),
            email: userData.email,
            username: userData.username,
            name: userData.name,
            role: userData.role as UserRole,
            jobDescription: userData.job_description,
            permissions: JSON.parse(userData.permissions),
            settings: JSON.parse(userData.settings),
            googleUser
          };

          // کش کردن اطلاعات کاربر
          offlineSyncService.cacheData('current_user', user);
          
          set({ user, isAuthenticated: true });
          console.log('User profile created:', user.username);
        } catch (error) {
          console.error('Error creating user profile:', error);
          throw error;
        }
      },
      
      login: async () => {
        try {
          console.log('Starting Google authentication...');
          return await googleAuthService.signIn();
        } catch (error) {
          console.error('Login error:', error);
          return { 
            success: false, 
            message: 'خطا در ورود به سیستم' 
          };
        }
      },

      handleAuthCallback: async (code: string) => {
        try {
          console.log('Handling auth callback...');
          
          const result = await googleAuthService.handleCallback(code);
          if (!result.success || !result.user) {
            return result;
          }

          // بررسی اتصال
          const isConnected = await get().checkConnection();
          
          if (isConnected) {
            // جستجوی کاربر در Google Sheets
            const users = await googleSheetsService.getUsers();
            const existingUser = users.find(u => u.email === result.user!.email);
            
            if (existingUser) {
              const user: User = {
                id: existingUser.id as string,
                email: existingUser.email as string,
                username: existingUser.username as string,
                name: existingUser.name as string,
                role: (existingUser.role as UserRole) || 'technician',
                jobDescription: existingUser.job_description as string,
                permissions: existingUser.permissions ? JSON.parse(existingUser.permissions as string) : {},
                settings: existingUser.settings ? JSON.parse(existingUser.settings as string) : { sidebarOpen: true },
                googleUser: result.user
              };
              
              offlineSyncService.cacheData('current_user', user);
              set({ user, isAuthenticated: true });
            } else {
              // کاربر جدید
              await get().createUserProfile(result.user);
            }
          } else {
            // حالت آفلاین - از کش استفاده کنیم
            const cachedUser = offlineSyncService.getCachedData('current_user');
            if (cachedUser && cachedUser.email === result.user.email) {
              set({ user: cachedUser, isAuthenticated: true });
            } else {
              return { success: false, message: 'اتصال اینترنت برای ورود اولیه ضروری است' };
            }
          }

          return { success: true };
        } catch (error) {
          console.error('Auth callback error:', error);
          return { 
            success: false, 
            message: 'خطا در تکمیل احراز هویت' 
          };
        }
      },
      
      logout: async () => {
        try {
          console.log('User logging out');
          googleAuthService.signOut();
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