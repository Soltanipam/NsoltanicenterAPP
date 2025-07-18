import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';
import { offlineSyncService } from '../services/offlineSync';
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
  settings?: {
    sidebarOpen: boolean;
  };
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

// Helper function to safely parse permissions
const parsePermissions = (permissionsData: any): UserPermissions => {
  // If it's already an object, return it
  if (typeof permissionsData === 'object' && permissionsData !== null) {
    return { ...defaultPermissions, ...permissionsData };
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof permissionsData === 'string') {
    // If it's empty or just whitespace, return default permissions
    if (!permissionsData.trim()) {
      return defaultPermissions;
    }
    
    try {
      const parsed = JSON.parse(permissionsData);
      return { ...defaultPermissions, ...parsed };
    } catch (error) {
      // If JSON parsing fails, check if it's a role-based string
      console.warn('Failed to parse permissions JSON, falling back to role-based permissions:', permissionsData);
      
      // Handle role-based permissions for backward compatibility
      const rolePermissions = getRoleBasedPermissions(permissionsData);
      return rolePermissions;
    }
  }
  
  // Fallback to default permissions
  return defaultPermissions;
};

// Helper function to get permissions based on role
const getRoleBasedPermissions = (role: string): UserPermissions => {
  switch (role.toLowerCase()) {
    case 'admin':
      return {
        canViewReceptions: true,
        canCreateTask: true,
        canCreateReception: true,
        canCompleteServices: true,
        canManageCustomers: true,
        canViewHistory: true
      };
    case 'receptionist':
      return {
        canViewReceptions: true,
        canCreateTask: true,
        canCreateReception: true,
        canCompleteServices: false,
        canManageCustomers: true,
        canViewHistory: true
      };
    case 'technician':
      return {
        canViewReceptions: true,
        canCreateTask: false,
        canCreateReception: false,
        canCompleteServices: true,
        canManageCustomers: false,
        canViewHistory: true
      };
    case 'warehouse':
    case 'detailing':
    case 'accountant':
      return {
        canViewReceptions: true,
        canCreateTask: false,
        canCreateReception: false,
        canCompleteServices: true,
        canManageCustomers: false,
        canViewHistory: true
      };
    default:
      return defaultPermissions;
  }
};

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
      users: [],
      isLoading: false,
      error: null,

      loadUsers: async () => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Loading users from Google Sheets...');
          const usersData = await googleSheetsService.getUsers();
          
          const users: User[] = usersData.map(user => ({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            jobDescription: user.job_description,
            active: user.active === 'true' || user.active === true,
            permissions: parsePermissions(user.permissions),
            settings: typeof user.settings === 'string' ? JSON.parse(user.settings || '{}') : (user.settings || { sidebarOpen: true }),
            auth_user_id: user.id // Use the same ID for compatibility
          }));

          // Cache the users for offline use
          offlineSyncService.cacheData('users', usersData);

          set({ users, isLoading: false });
          console.log('Users loaded successfully from Google Sheets:', users.length);
        } catch (error: any) {
          console.error('Error loading users from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedUsers = offlineSyncService.getCachedData('users');
          if (cachedUsers && Array.isArray(cachedUsers)) {
            const users: User[] = cachedUsers.map(user => ({
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              jobDescription: user.job_description,
              active: user.active === 'true' || user.active === true,
              permissions: parsePermissions(user.permissions),
              settings: typeof user.settings === 'string' ? JSON.parse(user.settings || '{}') : (user.settings || { sidebarOpen: true }),
              auth_user_id: user.id
            }));
            
            set({ 
              users, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('Users loaded from cache after error:', users.length);
            return;
          }
          
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری کاربران از Google Sheets: ' + error.message 
          });
        }
      },
      
      addUser: async (user) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Adding user to Google Sheets:', user);
          
          // Hash password
          const hashedPassword = await bcrypt.hash(user.password, 10);
          
          const userData = {
            username: user.username,
            name: user.name,
            role: user.role,
            job_description: user.jobDescription || '',
            active: user.active ? 'true' : 'false',
            permissions: JSON.stringify(user.permissions || defaultPermissions),
            settings: JSON.stringify(user.settings || { sidebarOpen: true }),
            password: hashedPassword,
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          const newUser = await googleSheetsService.addUser(userData);
          
          const userForStore: User = {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            role: newUser.role,
            jobDescription: newUser.job_description,
            active: newUser.active === 'true',
            permissions: parsePermissions(newUser.permissions),
            settings: typeof newUser.settings === 'string' ? JSON.parse(newUser.settings || '{}') : (newUser.settings || { sidebarOpen: true }),
            auth_user_id: newUser.id
          };
          
          set((state) => ({
            users: [...state.users, userForStore],
            isLoading: false
          }));
          
          console.log('User created successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error adding user to Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در افزودن کاربر به Google Sheets: ' + error.message 
          });
          throw error;
        }
      },
      
      updateUser: async (id, user) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Updating user in Google Sheets:', id, user);
          
          const userData: any = {};
          if (user.username !== undefined) userData.username = user.username;
          if (user.name !== undefined) userData.name = user.name;
          if (user.role !== undefined) userData.role = user.role;
          if (user.jobDescription !== undefined) userData.job_description = user.jobDescription;
          if (user.active !== undefined) userData.active = user.active ? 'true' : 'false';
          if (user.permissions !== undefined) userData.permissions = JSON.stringify(user.permissions);
          if (user.settings !== undefined) userData.settings = JSON.stringify(user.settings);
          userData.updated_at = new Date().toLocaleDateString('fa-IR');
          
          const updatedUser = await googleSheetsService.updateUser(id, userData);
          
          set((state) => ({
            users: state.users.map(u => u.id === id ? {
              id: updatedUser.id,
              username: updatedUser.username,
              name: updatedUser.name,
              role: updatedUser.role,
              jobDescription: updatedUser.job_description,
              active: updatedUser.active === 'true',
              permissions: parsePermissions(updatedUser.permissions),
              settings: typeof updatedUser.settings === 'string' ? JSON.parse(updatedUser.settings || '{}') : (updatedUser.settings || { sidebarOpen: true }),
              auth_user_id: updatedUser.id
            } : u),
            isLoading: false
          }));
          
          console.log('User updated successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error updating user in Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی کاربر در Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      updatePassword: async (id, newPassword) => {
        try {
          console.log('Updating user password in Google Sheets:', id);
          
          // Hash new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          
          await googleSheetsService.updateUser(id, { 
            password: hashedPassword,
            updated_at: new Date().toLocaleDateString('fa-IR')
          });
          
          console.log('User password updated successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error updating user password in Google Sheets:', error);
          throw new Error('خطا در تغییر رمز عبور در Google Sheets: ' + error.message);
        }
      },
      
      deleteUser: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('Deleting user from Google Sheets:', id);
          
          await googleSheetsService.deleteUser(id);
          
          set((state) => ({
            users: state.users.filter(u => u.id !== id),
            isLoading: false
          }));
          
          console.log('User deleted successfully from Google Sheets');
        } catch (error: any) {
          console.error('Error deleting user from Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف کاربر از Google Sheets: ' + error.message 
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