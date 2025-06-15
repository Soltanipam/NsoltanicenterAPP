import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { googleSheetsService } from '../services/googleSheets';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile: string;
  email?: string;
  can_login: boolean;
  created_at: string;
}

interface CustomerAuthState {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (customerCode: string, mobile: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  clearError: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (customerCode: string, mobile: string) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Customer login attempt:', customerCode);

          // Query customers from Google Sheets
          const customers = await googleSheetsService.getCustomers();
          const customerData = customers.find(c => 
            c.customer_code === customerCode && c.mobile === mobile
          );

          if (!customerData) {
            console.log('Customer not found or invalid credentials:', customerCode);
            set({ isLoading: false, error: 'کد مشتری یا شماره موبایل اشتباه است' });
            return { success: false, message: 'کد مشتری یا شماره موبایل اشتباه است' };
          }

          // Check if customer can login
          if (customerData.can_login !== 'true') {
            console.log('Customer login disabled:', customerCode);
            set({ isLoading: false, error: 'دسترسی شما به سیستم آنلاین غیرفعال است' });
            return { success: false, message: 'دسترسی شما به سیستم آنلاین غیرفعال است' };
          }

          // Create customer object for state
          const customer: Customer = {
            id: customerData.id,
            customer_code: customerData.customer_code,
            name: customerData.name,
            mobile: customerData.mobile,
            email: customerData.email,
            can_login: customerData.can_login === 'true',
            created_at: customerData.created_at
          };

          console.log('Customer login successful:', customer.customer_code);
          set({ 
            customer, 
            isAuthenticated: true, 
            isLoading: false, 
            error: null 
          });

          return { success: true };

        } catch (error) {
          console.error('Customer login error:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در برقراری ارتباط با سرور' 
          });
          return { 
            success: false, 
            message: 'خطا در برقراری ارتباط با سرور' 
          };
        }
      },

      logout: () => {
        console.log('Customer logging out');
        set({ 
          customer: null, 
          isAuthenticated: false, 
          error: null 
        });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'customer-auth-storage',
      storage: {
        getItem: async (name) => {
          try {
            const value = await localforage.getItem(name);
            return value || null;
          } catch (error) {
            console.error('Error getting customer auth item from storage:', error);
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await localforage.setItem(name, value);
          } catch (error) {
            console.error('Error setting customer auth item in storage:', error);
          }
        },
        removeItem: async (name) => {
          try {
            await localforage.removeItem(name);
          } catch (error) {
            console.error('Error removing customer auth item from storage:', error);
          }
        },
      },
      partialize: (state) => ({
        customer: state.customer,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);