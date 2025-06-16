import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  connectionStatus: 'connected' | 'disconnected';
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      connectionStatus: 'disconnected',

      login: async (username, password) => {
        try {
          const rows = await googleSheetsService.readSheet('users');

          if (!rows || rows.length === 0) {
            return { success: false, message: 'اطلاعات کاربران یافت نشد' };
          }

          const headers = rows[0];
          const dataRows = rows.slice(1);

          const users = dataRows.map(row => {
            const user: any = {};
            headers.forEach((header, index) => {
              user[header] = row[index];
            });
            return user;
          });

          const foundUser = users.find((u: any) => u.username === username);

          if (!foundUser) {
            return { success: false, message: 'کاربری با این مشخصات یافت نشد' };
          }

          if (foundUser.password !== password) {
            return { success: false, message: 'رمز عبور اشتباه است' };
          }

          const user: User = {
            id: foundUser.id,
            username: foundUser.username,
            name: foundUser.name,
            role: foundUser.role || 'کاربر',
          };

          set({
            user,
            isAuthenticated: true,
            isInitialized: true,
            connectionStatus: 'connected'
          });

          return { success: true };

        } catch (error) {
          console.error('Login error:', error);
          return { success: false, message: 'خطا در ورود به سیستم' };
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          connectionStatus: 'disconnected'
        });
      },

      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
          connectionStatus: 'connected'
        });
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
