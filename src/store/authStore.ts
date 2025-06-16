import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';

export type UserRole = 'admin' | 'receptionist' | 'technician' | 'warehouse' | 'detailing' | 'accountant';

export interface UserPermissions {
  canViewReceptions?: boolean;
  canCreateTask?: boolean;
  canCreateReception?: boolean;
  canCompleteServices?: boolean;
  canManageCustomers?: boolean;
  canViewHistory?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  jobDescription?: string;
  active: boolean;
  permissions?: UserPermissions;
  settings?: {
    sidebarOpen?: boolean;
  };
  auth_user_id?: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
  updateUserSettings: (settings: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      connectionStatus: 'checking',

      initialize: async () => {
        set({ connectionStatus: 'checking' });
        
        try {
          await googleSheetsService.initialize();
          set({ 
            connectionStatus: 'connected',
            isInitialized: true 
          });
          console.log('Auth store initialized successfully');
        } catch (error) {
          console.error('Failed to initialize auth store:', error);
          set({ 
            connectionStatus: 'disconnected',
            isInitialized: true 
          });
        }
      },

      checkConnection: async () => {
        try {
          await googleSheetsService.getUsers();
          set({ connectionStatus: 'connected' });
          return true;
        } catch (error) {
          console.error('Connection check failed:', error);
          set({ connectionStatus: 'disconnected' });
          return false;
        }
      },

      login: async (username: string, password: string) => {
        set({ connectionStatus: 'checking' });
        
        try {
          console.log('Attempting login for username:', username);
          
          const user = await googleSheetsService.getUserByCredentials(username, password);
          
          if (!user) {
            console.log('Invalid credentials for username:', username);
            set({ connectionStatus: 'connected' });
            return { 
              success: false, 
              message: 'نام کاربری یا رمز عبور اشتباه است' 
            };
          }

          if (user.active !== 'true' && user.active !== true) {
            console.log('User account is inactive:', username);
            set({ connectionStatus: 'connected' });
            return { 
              success: false, 
              message: 'حساب کاربری شما غیرفعال است' 
            };
          }

          // Parse permissions if they're stored as JSON string
          let permissions = {};
          try {
            permissions = typeof user.permissions === 'string' 
              ? JSON.parse(user.permissions) 
              : (user.permissions || {});
          } catch (e) {
            console.warn('Failed to parse user permissions:', e);
            permissions = {};
          }

          // Parse settings if they're stored as JSON string
          let settings = { sidebarOpen: true };
          try {
            settings = typeof user.settings === 'string' 
              ? JSON.parse(user.settings) 
              : (user.settings || { sidebarOpen: true });
          } catch (e) {
            console.warn('Failed to parse user settings:', e);
            settings = { sidebarOpen: true };
          }

          const authenticatedUser: User = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role as UserRole,
            jobDescription: user.job_description,
            active: user.active === 'true' || user.active === true,
            permissions,
            settings,
            auth_user_id: user.auth_user_id || user.id,
            email: user.email
          };

          console.log('Login successful for user:', authenticatedUser.username);
          set({
            user: authenticatedUser,
            isAuthenticated: true,
            connectionStatus: 'connected'
          });

          return { success: true };

        } catch (error) {
          console.error('Login error:', error);
          set({ connectionStatus: 'disconnected' });
          return { 
            success: false, 
            message: 'خطا در برقراری ارتباط با Google Sheets' 
          };
        }
      },

      logout: () => {
        console.log('User logging out');
        set({
          user: null,
          isAuthenticated: false
        });
      },

      updateUserSettings: (newSettings: any) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            settings: { ...currentUser.settings, ...newSettings }
          };
          set({ user: updatedUser });
          
          // Optionally save to Google Sheets
          googleSheetsService.updateUser(currentUser.id, {
            settings: JSON.stringify(updatedUser.settings)
          }).catch(error => {
            console.error('Failed to save user settings:', error);
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);