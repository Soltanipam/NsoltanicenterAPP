import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import { googleSheetsService } from '../lib/googleSheets';

export interface Customer {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  canLogin: boolean;
  createdAt: string;
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
            c.code === customerCode && c.phone === mobile
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
            customerId: customerData.code,
            firstName: customerData.name.split(' ')[0] || '',
            lastName: customerData.name.split(' ').slice(1).join(' ') || '',
            phone: customerData.phone,
            email: customerData.email,
            canLogin: customerData.can_login === 'true',
            createdAt: customerData.created_at
          };

          console.log('Customer login successful:', customer.customerId);
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
            error: 'خطا در برقراری ارتباط با Google Sheets' 
          });
          return { 
            success: false, 
            message: 'خطا در برقراری ارتباط با Google Sheets' 
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