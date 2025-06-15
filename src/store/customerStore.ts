import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// مشتریان نمونه برای تست
const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'customer-1',
    customerId: '100001',
    firstName: 'احمد',
    lastName: 'محمدی',
    phone: '09123456789',
    email: 'ahmad@example.com',
    canLogin: true,
    createdAt: '1403/10/01',
    updatedAt: '1403/10/01'
  },
  {
    id: 'customer-2',
    customerId: '100002',
    firstName: 'علی',
    lastName: 'رضایی',
    phone: '09123456788',
    email: 'ali@example.com',
    canLogin: true,
    createdAt: '1403/10/02',
    updatedAt: '1403/10/02'
  },
  {
    id: 'customer-3',
    customerId: '100003',
    firstName: 'مریم',
    lastName: 'احمدی',
    phone: '09123456787',
    email: 'maryam@example.com',
    canLogin: false,
    createdAt: '1403/10/03',
    updatedAt: '1403/10/03'
  }
];

// Generate a unique customer ID
const generateCustomerId = (): string => {
  const existingIds = JSON.parse(localStorage.getItem('customers-storage') || '{"state":{"customers":[]}}')
    .state.customers.map((c: Customer) => parseInt(c.customerId));
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 100000;
  return (maxId + 1).toString();
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
      customers: SAMPLE_CUSTOMERS,
      isLoading: false,
      error: null,

      loadCustomers: async () => {
        set({ isLoading: true, error: null });

        try {
          // در حال حاضر از مشتریان نمونه استفاده می‌کنیم
          // در آینده می‌توان اتصال به Google Sheets را اضافه کرد
          const storedCustomers = localStorage.getItem('customers-storage');
          if (storedCustomers) {
            const parsed = JSON.parse(storedCustomers);
            if (parsed.state?.customers && Array.isArray(parsed.state.customers)) {
              set({ customers: parsed.state.customers, isLoading: false });
              return;
            }
          }

          set({ customers: SAMPLE_CUSTOMERS, isLoading: false });
        } catch (error: any) {
          console.error('Error loading customers:', error);
          set({ 
            customers: SAMPLE_CUSTOMERS,
            isLoading: false, 
            error: 'خطا در بارگذاری مشتریان - از مشتریان نمونه استفاده می‌شود' 
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
          
          const customerForStore: Customer = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            customerId: customerId,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
            canLogin: customer.canLogin,
            createdAt: new Date().toLocaleDateString('fa-IR'),
            updatedAt: new Date().toLocaleDateString('fa-IR')
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
          set(state => ({
            customers: state.customers.map(c => c.id === id ? {
              ...c,
              ...updates,
              updatedAt: new Date().toLocaleDateString('fa-IR')
            } : c),
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
      name: 'customers-storage',
      partialize: (state) => ({
        customers: state.customers
      })
    }
  )
);