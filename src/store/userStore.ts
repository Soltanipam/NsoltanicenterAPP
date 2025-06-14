import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheetsService';

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
  email: string;
  role: string;
  jobDescription?: string;
  active: boolean;
  permissions: UserPermissions;
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

interface UserStore {
  users: User[];
  addUser: (user: Omit<User, 'id'> & { password: string }) => Promise<void>;
  updateUser: (id: string, user: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updatePassword: (id: string, newPassword: string) => Promise<void>;
  getUser: (username: string, password: string) => User | null;
  setUsers: (users: User[]) => void;
  addUserFromDB: (user: User) => void;
  updateUserFromDB: (user: User) => void;
  deleteUserFromDB: (id: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],
      
      addUser: async (user) => {
        try {
          console.log('Adding user via Google Sheets:', user);
          
          const userData = {
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            job_description: user.jobDescription || '',
            active: user.active ? 'true' : 'false',
            permissions: JSON.stringify(user.permissions || defaultPermissions),
            password: user.password,
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          const newUser = await googleSheetsService.addUser(userData);
          
          const userForStore: User = {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            jobDescription: newUser.job_description,
            active: newUser.active === 'true',
            permissions: JSON.parse(newUser.permissions || '{}'),
            auth_user_id: newUser.auth_user_id
          };
          
          set((state) => ({
            users: [...state.users, userForStore]
          }));
          
          console.log('User created successfully via Google Sheets');
        } catch (error) {
          console.error('Error adding user via Google Sheets:', error);
          throw error;
        }
      },
      
      updateUser: async (id, user) => {
        try {
          console.log('Updating user via Google Sheets:', id, user);
          
          const userData: any = {};
          if (user.username !== undefined) userData.username = user.username;
          if (user.name !== undefined) userData.name = user.name;
          if (user.email !== undefined) userData.email = user.email;
          if (user.role !== undefined) userData.role = user.role;
          if (user.jobDescription !== undefined) userData.job_description = user.jobDescription;
          if (user.active !== undefined) userData.active = user.active ? 'true' : 'false';
          if (user.permissions !== undefined) userData.permissions = JSON.stringify(user.permissions);
          userData.updated_at = new Date().toLocaleDateString('fa-IR');
          
          const updatedUser = await googleSheetsService.updateUser(id, userData);
          
          set((state) => ({
            users: state.users.map(u => u.id === id ? {
              id: updatedUser.id,
              username: updatedUser.username,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              jobDescription: updatedUser.job_description,
              active: updatedUser.active === 'true',
              permissions: JSON.parse(updatedUser.permissions || '{}'),
              auth_user_id: updatedUser.auth_user_id
            } : u)
          }));
          
          console.log('User updated successfully via Google Sheets');
        } catch (error) {
          console.error('Error updating user via Google Sheets:', error);
          throw error;
        }
      },

      updatePassword: async (id, newPassword) => {
        try {
          console.log('Updating user password via Google Sheets:', id);
          
          await googleSheetsService.updateUser(id, { 
            password: newPassword,
            updated_at: new Date().toLocaleDateString('fa-IR')
          });
          
          console.log('User password updated successfully via Google Sheets');
        } catch (error) {
          console.error('Error updating user password via Google Sheets:', error);
          throw error;
        }
      },
      
      deleteUser: async (id) => {
        try {
          console.log('Deleting user via Google Sheets:', id);
          
          await googleSheetsService.deleteUser(id);
          
          set((state) => ({
            users: state.users.filter(u => u.id !== id)
          }));
          
          console.log('User deleted successfully via Google Sheets');
        } catch (error) {
          console.error('Error deleting user via Google Sheets:', error);
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
      }))
    }),
    {
      name: 'user-storage'
    }
  )
);