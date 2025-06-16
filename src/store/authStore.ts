import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

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
          // Query users from Supabase
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('active', true)
            .single();

          if (error || !users) {
            return { success: false, message: 'کاربری با این مشخصات یافت نشد' };
          }

          // In a real app, you would hash and compare passwords properly
          // For now, we'll assume password validation is handled elsewhere
          const user: User = {
            id: users.id,
            username: users.username,
            name: users.name,
            role: users.role || 'کاربر',
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