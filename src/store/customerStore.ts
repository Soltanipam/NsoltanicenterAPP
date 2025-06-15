import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile: string;
  email?: string;
  can_login: boolean;
  created_at: string;
  updated_at: string;
}

// Generate a unique customer code
const generateCustomerCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

interface CustomerStore {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  loadCustomers: () => Promise<void>;
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'customer_code' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  addCustomerFromDB: (customer: Customer) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  updateCustomerFromDB: (customer: Customer) => void;
  deleteCustomer: (id: string) => Promise<void>;
  deleteCustomerFromDB: (id: string) => void;
  getCustomerByMobile: (mobile: string) => Customer | undefined;
  clearError: () => void;
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: [],
      isLoading: false,
      error: null,

      loadCustomers: async () => {
        set({ isLoading: true, error: null });

        try {
          console.log('Loading customers from Google Sheets...');
          const customersData = await googleSheetsService.getCustomers();
          
          const customers: Customer[] = customersData.map(customer => ({
            id: customer.id,
            customer_code: customer.customer_code,
            name: customer.name,
            mobile: customer.mobile,
            email: customer.email || '',
            can_login: customer.can_login === 'true',
            created_at: customer.created_at || new Date().toLocaleDateString('fa-IR'),
            updated_at: customer.updated_at || new Date().toLocaleDateString('fa-IR')
          }));

          // Cache the customers for offline use
          offlineSyncService.cacheData('customers', customersData);

          set({ customers, isLoading: false });
          console.log('Customers loaded successfully from Google Sheets:', customers.length);
        } catch (error: any) {
          console.error('Error loading customers from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedCustomers = offlineSyncService.getCachedData('customers');
          if (cachedCustomers && Array.isArray(cachedCustomers)) {
            const customers: Customer[] = cachedCustomers.map(customer => ({
              id: customer.id,
              customer_code: customer.customer_code,
              name: customer.name,
              mobile: customer.mobile,
              email: customer.email || '',
              can_login: customer.can_login === 'true',
              created_at: customer.created_at || new Date().toLocaleDateString('fa-IR'),
              updated_at: customer.updated_at || new Date().toLocaleDateString('fa-IR')
            }));
            
            set({ 
              customers, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('Customers loaded from cache after error:', customers.length);
            return;
          }
          
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری مشتریان از Google Sheets: ' + error.message 
          });
        }
      },

      setCustomers: (customers) => {
        set({ customers });
      },

      addCustomer: async (customer) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Adding customer to Google Sheets:', customer);
          const customerCode = generateCustomerCode();
          
          const newCustomerData = {
            customer_code: customerCode,
            name: customer.name,
            mobile: customer.mobile,
            email: customer.email || '',
            can_login: customer.can_login ? 'true' : 'false',
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };

          const newCustomer = await googleSheetsService.addCustomer(newCustomerData);

          const customerForStore: Customer = {
            id: newCustomer.id,
            customer_code: newCustomer.customer_code,
            name: newCustomer.name,
            mobile: newCustomer.mobile,
            email: newCustomer.email,
            can_login: newCustomer.can_login === 'true',
            created_at: newCustomer.created_at,
            updated_at: newCustomer.updated_at
          };

          set(state => ({
            customers: [customerForStore, ...state.customers],
            isLoading: false
          }));

          console.log('Customer added successfully to Google Sheets');
          return customerForStore;

        } catch (error: any) {
          console.error('Error adding customer to Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در افزودن مشتری به Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      addCustomerFromDB: (customer) => {
        set(state => ({
          customers: [customer, ...state.customers.filter(c => c.id !== customer.id)]
        }));
      },

      updateCustomer: async (id, updates) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Updating customer in Google Sheets:', id, updates);
          
          const updateData: any = {};
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.mobile !== undefined) updateData.mobile = updates.mobile;
          if (updates.email !== undefined) updateData.email = updates.email;
          if (updates.can_login !== undefined) updateData.can_login = updates.can_login ? 'true' : 'false';
          updateData.updated_at = new Date().toLocaleDateString('fa-IR');

          const updatedCustomer = await googleSheetsService.updateCustomer(id, updateData);

          const customerForStore: Customer = {
            id: updatedCustomer.id,
            customer_code: updatedCustomer.customer_code,
            name: updatedCustomer.name,
            mobile: updatedCustomer.mobile,
            email: updatedCustomer.email,
            can_login: updatedCustomer.can_login === 'true',
            created_at: updatedCustomer.created_at,
            updated_at: updatedCustomer.updated_at
          };

          set(state => ({
            customers: state.customers.map(c => c.id === id ? customerForStore : c),
            isLoading: false
          }));

          console.log('Customer updated successfully in Google Sheets');

        } catch (error: any) {
          console.error('Error updating customer in Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی مشتری در Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      updateCustomerFromDB: (customer) => {
        set(state => ({
          customers: state.customers.map(c => c.id === customer.id ? customer : c)
        }));
      },

      deleteCustomer: async (id) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Deleting customer from Google Sheets:', id);
          
          await googleSheetsService.deleteCustomer(id);

          set(state => ({
            customers: state.customers.filter(c => c.id !== id),
            isLoading: false
          }));

          console.log('Customer deleted successfully from Google Sheets');

        } catch (error: any) {
          console.error('Error deleting customer from Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف مشتری از Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      deleteCustomerFromDB: (id) => {
        set(state => ({
          customers: state.customers.filter(c => c.id !== id)
        }));
      },

      getCustomerByMobile: (mobile: string) => {
        return get().customers.find(customer => customer.mobile === mobile);
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'customers-storage',
      partialize: (state) => ({
        customers: state.customers
      })
    }
  )
);