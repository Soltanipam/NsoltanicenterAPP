import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';

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

// Generate a unique customer ID
const generateCustomerId = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: [],
      isLoading: false,
      error: null,

      loadCustomers: async () => {
        set({ isLoading: true, error: null });

        try {
          const customersData = await googleSheetsService.getCustomers();
          const customers: Customer[] = customersData.map(customer => ({
            id: customer.id,
            customerId: customer.code,
            firstName: customer.name.split(' ')[0] || '',
            lastName: customer.name.split(' ').slice(1).join(' ') || '',
            phone: customer.phone,
            email: customer.email || '',
            canLogin: customer.online_access === 'true',
            createdAt: customer.created_at || new Date().toLocaleDateString('fa-IR'),
            updatedAt: customer.updated_at || new Date().toLocaleDateString('fa-IR')
          }));

          set({ customers, isLoading: false });
        } catch (error: any) {
          console.error('Error loading customers:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری مشتریان' 
          });
        }
      },

      setCustomers: (customers) => {
        set({ customers });
      },

      addCustomer: async (customer) => {
        set({ isLoading: true, error: null });

        try {
          const customerId = generateCustomerId();
          
          const newCustomerData = {
            code: customerId,
            name: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phone,
            email: customer.email || '',
            online_access: customer.canLogin ? 'true' : 'false',
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
            canLogin: newCustomer.online_access === 'true',
            createdAt: newCustomer.created_at,
            updatedAt: newCustomer.updated_at
          };

          set(state => ({
            customers: [customerForStore, ...state.customers],
            isLoading: false
          }));

          return customerForStore;

        } catch (error: any) {
          console.error('Error adding customer:', error);
          set({ 
            isLoading: false, 
            error: error.message || 'خطا در افزودن مشتری' 
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
          const updateData: any = {};
          
          if (updates.firstName !== undefined || updates.lastName !== undefined) {
            const currentCustomer = get().customers.find(c => c.id === id);
            const firstName = updates.firstName ?? currentCustomer?.firstName ?? '';
            const lastName = updates.lastName ?? currentCustomer?.lastName ?? '';
            updateData.name = `${firstName} ${lastName}`;
          }
          if (updates.phone !== undefined) updateData.phone = updates.phone;
          if (updates.email !== undefined) updateData.email = updates.email;
          if (updates.canLogin !== undefined) updateData.online_access = updates.canLogin ? 'true' : 'false';
          updateData.updated_at = new Date().toLocaleDateString('fa-IR');

          const updatedCustomer = await googleSheetsService.updateCustomer(id, updateData);

          const customerForStore: Customer = {
            id: updatedCustomer.id,
            customerId: updatedCustomer.code,
            firstName: updates.firstName ?? get().customers.find(c => c.id === id)?.firstName ?? '',
            lastName: updates.lastName ?? get().customers.find(c => c.id === id)?.lastName ?? '',
            phone: updatedCustomer.phone,
            email: updatedCustomer.email,
            canLogin: updatedCustomer.online_access === 'true',
            createdAt: updatedCustomer.created_at,
            updatedAt: updatedCustomer.updated_at
          };

          set(state => ({
            customers: state.customers.map(c => c.id === id ? customerForStore : c),
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error updating customer:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی مشتری' 
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
          await googleSheetsService.deleteCustomer(id);

          set(state => ({
            customers: state.customers.filter(c => c.id !== id),
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error deleting customer:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف مشتری' 
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
      name: 'customer-storage',
      partialize: (state) => ({
        customers: state.customers
      })
    }
  )
);