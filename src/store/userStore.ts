import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bcrypt from 'bcryptjs';

export interface UserPermissions {
  canViewReceptions: boolean;
  canCreateTask: boolean;
  canCreateReception: boolean;
  canCompleteServices: boolean;
  canManageCustomers: boolean;
  canViewHistory: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  jobDescription?: string;
  active: boolean;
  permissions: UserPermissions;
  password?: string;
  auth_user_id?: string;
}

const defaultPermissions: UserPermissions = {
  canViewReceptions: false,
  canCreateTask: false,
  canCreateReception: false,
  canCompleteServices: false,
  canManageCustomers: false,
  canViewHistory: false
};

// کاربران پیش‌فرض سیستم
const DEFAULT_USERS: User[] = [
  {
    id: 'admin-default',
    username: 'admin',
    name: 'مدیر سیستم',
    role: 'admin',
    jobDescription: 'مدیر کل سیستم',
    active: true,
    permissions: {
      canViewReceptions: true,
      canCreateTask: true,
      canCreateReception: true,
      canCompleteServices: true,
      canManageCustomers: true,
      canViewHistory: true
    }
  },
  {
    id: 'receptionist-1',
    username: 'reception',
    name: 'کارشناس پذیرش',
    role: 'receptionist',
    jobDescription: 'مسئول پذیرش خودرو',
    active: true,
    permissions: {
      canViewReceptions: true,
      canCreateTask: true,
      canCreateReception: true,
      canCompleteServices: false,
      canManageCustomers: true,
      canViewHistory: true
    }
  },
  {
    id: 'technician-1',
    username: 'tech1',
    name: 'تکنسین اول',
    role: 'technician',
    jobDescription: 'تکنسین تعمیرات',
    active: true,
    permissions: {
      canViewReceptions: false,
      canCreateTask: false,
      canCreateReception: false,
      canCompleteServices: false,
      canManageCustomers: false,
      canViewHistory: false
    }
  }
];

interface UserStore {
  users: User[];
  isLoading: boolean;
  error: string | null;
  loadUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
  updateUser: (id: string, user: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updatePassword: (id: string, newPassword: string) => Promise<void>;
  getUser: (username: string, password: string) => User | null;
  setUsers: (users: User[]) => void;
  addUserFromDB: (user: User) => void;
  updateUserFromDB: (user: User) => void;
  deleteUserFromDB: (id: string) => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      isLoading: false,
      error: null,

      loadUsers: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // در حال حاضر از کاربران پیش‌فرض استفاده می‌کنیم
          // در آینده می‌توان اتصال به Google Sheets را اضافه کرد
          const storedUsers = localStorage.getItem('users-storage');
          if (storedUsers) {
            const parsed = JSON.parse(storedUsers);
            if (parsed.state?.users && Array.isArray(parsed.state.users)) {
              set({ users: parsed.state.users, isLoading: false });
              return;
            }
          }
          
          set({ users: DEFAULT_USERS, isLoading: false });
        } catch (error: any) {
          console.error('Error loading users:', error);
          set({ 
            users: DEFAULT_USERS,
            isLoading: false, 
            error: 'خطا در بارگذاری کاربران - از کاربران پیش‌فرض استفاده می‌شود' 
          });
        }
      },
      
      addUser: async (user) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Adding user:', user);
          
          // Hash password
          const hashedPassword = await bcrypt.hash(user.password, 10);
          
          const newUser: User = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            username: user.username,
            name: user.name,
            role: user.role,
            jobDescription: user.jobDescription || '',
            active: user.active,
            permissions: user.permissions || defaultPermissions,
            password: hashedPassword
          };
          
          set((state) => ({
            users: [...state.users, newUser],
            isLoading: false
          }));
          
          console.log('User created successfully');
        } catch (error) {
          console.error('Error adding user:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در افزودن کاربر' 
          });
          throw error;
        }
      },
      
      updateUser: async (id, user) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Updating user:', id, user);
          
          set((state) => ({
            users: state.users.map(u => u.id === id ? {
              ...u,
              username: user.username ?? u.username,
              name: user.name ?? u.name,
              role: user.role ?? u.role,
              jobDescription: user.jobDescription ?? u.jobDescription,
              active: user.active ?? u.active,
              permissions: user.permissions ?? u.permissions
            } : u),
            isLoading: false
          }));
          
          console.log('User updated successfully');
        } catch (error) {
          console.error('Error updating user:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی کاربر' 
          });
          throw error;
        }
      },

      updatePassword: async (id, newPassword) => {
        try {
          console.log('Updating user password:', id);
          
          // Hash new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          
          set((state) => ({
            users: state.users.map(u => u.id === id ? {
              ...u,
              password: hashedPassword
            } : u)
          }));
          
          console.log('User password updated successfully');
        } catch (error) {
          console.error('Error updating user password:', error);
          throw error;
        }
      },
      
      deleteUser: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Deleting user:', id);
          
          set((state) => ({
            users: state.users.filter(u => u.id !== id),
            isLoading: false
          }));
          
          console.log('User deleted successfully');
        } catch (error) {
          console.error('Error deleting user:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف کاربر' 
          });
          throw error;
        }
      },
      
      getUser: (username, password) => {
        const user = get().users.find(u => 
          u.username === username && u.active
        );
        return user || null;
      },

      setUsers: (users) => set({ users }),

      addUserFromDB: (user) => set((state) => {
        const existingIndex = state.users.findIndex(u => u.id === user.id);
        if (existingIndex === -1) {
          return { users: [...state.users, user] };
        }
        return state;
      }),

      updateUserFromDB: (user) => set((state) => ({
        users: state.users.map(u => u.id === user.id ? user : u)
      })),

      deleteUserFromDB: (id) => set((state) => ({
        users: state.users.filter(u => u.id !== id)
      })),

      clearError: () => set({ error: null })
    }),
    {
      name: 'users-storage'
    }
  )
);