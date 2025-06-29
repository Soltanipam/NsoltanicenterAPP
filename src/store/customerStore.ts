import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

export interface Customer {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  canLogin: boolean;
  createdAt: string;
  updatedAt: string;
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
  addCustomer: (customer: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  addCustomerFromDB: (customer: Customer) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  updateCustomerFromDB: (customer: Customer) => void;
  deleteCustomer: (id: string) => Promise<void>;
  deleteCustomerFromDB: (id: string) => void;
  getCustomerByPhone: (phone: string) => Customer | undefined;
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
            customerId: customer.code,
            firstName: customer.name.split(' ')[0] || '',
            lastName: customer.name.split(' ').slice(1).join(' ') || '',
            phone: customer.phone,
            email: customer.email || '',
            canLogin: customer.can_login === 'true',
            createdAt: customer.created_at || new Date().toLocaleDateString('fa-IR'),
            updatedAt: customer.updated_at || new Date().toLocaleDateString('fa-IR')
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
              customerId: customer.code,
              firstName: customer.name.split(' ')[0] || '',
              lastName: customer.name.split(' ').slice(1).join(' ') || '',
              phone: customer.phone,
              email: customer.email || '',
              canLogin: customer.can_login === 'true',
              createdAt: customer.created_at || new Date().toLocaleDateString('fa-IR'),
              updatedAt: customer.updated_at || new Date().toLocaleDateString('fa-IR')
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
            code: customerCode,
            name: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phone,
            email: customer.email || '',
            can_login: customer.canLogin ? 'true' : 'false',
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };

          const newCustomer = await googleSheetsService.addCustomer(newCustomerData);

          const customerForStore: Customer = {
            id: newCustomer.id,
            customerId: newCustomer.code,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: newCustomer.phone,
            email: newCustomer.email,
            canLogin: newCustomer.can_login === 'true',
            createdAt: newCustomer.created_at,
            updatedAt: newCustomer.updated_at
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
          if (updates.firstName !== undefined || updates.lastName !== undefined) {
            const currentCustomer = get().customers.find(c => c.id === id);
            const firstName = updates.firstName !== undefined ? updates.firstName : currentCustomer?.firstName || '';
            const lastName = updates.lastName !== undefined ? updates.lastName : currentCustomer?.lastName || '';
            updateData.name = `${firstName} ${lastName}`;
          }
          if (updates.phone !== undefined) updateData.phone = updates.phone;
          if (updates.email !== undefined) updateData.email = updates.email;
          if (updates.canLogin !== undefined) updateData.can_login = updates.canLogin ? 'true' : 'false';
          updateData.updated_at = new Date().toLocaleDateString('fa-IR');

          const updatedCustomer = await googleSheetsService.updateCustomer(id, updateData);

          const customerForStore: Customer = {
            id: updatedCustomer.id,
            customerId: updatedCustomer.code,
            firstName: updatedCustomer.name.split(' ')[0] || '',
            lastName: updatedCustomer.name.split(' ').slice(1).join(' ') || '',
            phone: updatedCustomer.phone,
            email: updatedCustomer.email,
            canLogin: updatedCustomer.can_login === 'true',
            createdAt: updatedCustomer.created_at,
            updatedAt: updatedCustomer.updated_at
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

      getCustomerByPhone: (phone: string) => {
        return get().customers.find(customer => customer.phone === phone);
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