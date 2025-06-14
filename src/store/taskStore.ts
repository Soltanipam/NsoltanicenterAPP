import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheetsService';
import { googleDriveService } from '../services/googleDriveService';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: {
    id: string;
    name: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    plateNumber: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  images?: string[];
  history: {
    date: string;
    status: string;
    description: string;
    updatedBy: string;
  }[];
}

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  setTasks: (tasks: Task[]) => void;
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>, updatedBy: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  addTaskImages: (taskId: string, images: File[], updatedBy: string) => Promise<void>;
  addTaskFromDB: (task: Task) => void;
  updateTaskFromDB: (task: Task) => void;
  deleteTaskFromDB: (id: string) => void;
  completeVehicleTasks: (vehicleId: string) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,

      setTasks: (tasks) => set({ tasks }),

      loadTasks: async () => {
        set({ isLoading: true, error: null });

        try {
          const tasksData = await googleSheetsService.getTasks();
          const tasks: Task[] = tasksData.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status as 'pending' | 'in-progress' | 'completed',
            priority: task.priority as 'low' | 'medium' | 'high',
            assignedTo: {
              id: task.assigned_to_id,
              name: task.assigned_to_name
            },
            vehicle: JSON.parse(task.vehicle_info || '{}'),
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            dueDate: task.due_date || '',
            images: task.images ? task.images.split(',') : [],
            history: JSON.parse(task.history || '[]')
          }));

          set({ tasks, isLoading: false });
        } catch (error: any) {
          console.error('Error loading tasks:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری وظایف' 
          });
        }
      },

      addTask: async (task) => {
        set({ isLoading: true, error: null });

        try {
          const newTaskData = {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigned_to_id: task.assignedTo.id,
            assigned_to_name: task.assignedTo.name,
            vehicle_info: JSON.stringify(task.vehicle),
            due_date: task.dueDate,
            images: '',
            history: JSON.stringify([{
              date: new Date().toLocaleDateString('fa-IR'),
              status: 'pending',
              description: 'وظیفه ایجاد شد',
              updatedBy: task.assignedTo.name
            }]),
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };

          const newTask = await googleSheetsService.addTask(newTaskData);

          const taskForStore: Task = {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description || '',
            status: newTask.status as 'pending' | 'in-progress' | 'completed',
            priority: newTask.priority as 'low' | 'medium' | 'high',
            assignedTo: {
              id: newTask.assigned_to_id,
              name: newTask.assigned_to_name
            },
            vehicle: JSON.parse(newTask.vehicle_info || '{}'),
            createdAt: newTask.created_at,
            updatedAt: newTask.updated_at,
            dueDate: newTask.due_date || '',
            images: newTask.images ? newTask.images.split(',') : [],
            history: JSON.parse(newTask.history || '[]')
          };

          set(state => ({
            tasks: [taskForStore, ...state.tasks],
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error adding task:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در ایجاد وظیفه' 
          });
          throw error;
        }
      },

      updateTask: async (id, updates, updatedBy) => {
        set({ isLoading: true, error: null });

        try {
          const currentTask = get().tasks.find(t => t.id === id);
          if (!currentTask) {
            set({ isLoading: false });
            return false;
          }

          const history = [...currentTask.history];
          
          if (updates.status && updates.status !== currentTask.status) {
            history.push({
              date: new Date().toLocaleDateString('fa-IR'),
              status: updates.status,
              description: `وضعیت به ${
                updates.status === 'pending' ? 'در انتظار' :
                updates.status === 'in-progress' ? 'در حال انجام' :
                'تکمیل شده'
              } تغییر کرد`,
              updatedBy
            });
          }

          const updateData: any = {
            history: JSON.stringify(history),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };

          if (updates.title !== undefined) updateData.title = updates.title;
          if (updates.description !== undefined) updateData.description = updates.description;
          if (updates.status !== undefined) updateData.status = updates.status;
          if (updates.priority !== undefined) updateData.priority = updates.priority;
          if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
          if (updates.vehicle !== undefined) updateData.vehicle_info = JSON.stringify(updates.vehicle);
          if (updates.images !== undefined) updateData.images = updates.images.join(',');
          
          if (updates.assignedTo !== undefined) {
            updateData.assigned_to_id = updates.assignedTo.id;
            updateData.assigned_to_name = updates.assignedTo.name;
          }

          const updatedTask = await googleSheetsService.updateTask(id, updateData);

          const taskForStore: Task = {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description || '',
            status: updatedTask.status as 'pending' | 'in-progress' | 'completed',
            priority: updatedTask.priority as 'low' | 'medium' | 'high',
            assignedTo: {
              id: updatedTask.assigned_to_id,
              name: updatedTask.assigned_to_name
            },
            vehicle: JSON.parse(updatedTask.vehicle_info || '{}'),
            createdAt: updatedTask.created_at,
            updatedAt: updatedTask.updated_at,
            dueDate: updatedTask.due_date || '',
            images: updatedTask.images ? updatedTask.images.split(',') : [],
            history: JSON.parse(updatedTask.history || '[]')
          };

          set(state => ({
            tasks: state.tasks.map(t => t.id === id ? taskForStore : t),
            isLoading: false
          }));

          return true;

        } catch (error: any) {
          console.error('Error updating task:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی وظیفه' 
          });
          return false;
        }
      },

      deleteTask: async (id) => {
        set({ isLoading: true, error: null });

        try {
          await googleSheetsService.deleteTask(id);

          set(state => ({
            tasks: state.tasks.filter(t => t.id !== id),
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error deleting task:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف وظیفه' 
          });
          throw error;
        }
      },

      addTaskImages: async (taskId, images, updatedBy) => {
        set({ isLoading: true, error: null });

        try {
          const currentTask = get().tasks.find(t => t.id === taskId);
          if (!currentTask) throw new Error('Task not found');

          // Upload images to Google Drive
          const uploadPromises = images.map(file => googleDriveService.uploadFile(file, 'task-images'));
          const uploadResults = await Promise.all(uploadPromises);
          
          const imageUrls = uploadResults.filter(url => url !== null) as string[];
          
          if (imageUrls.length === 0) {
            throw new Error('Failed to upload images');
          }

          const existingImages = currentTask.images || [];
          const history = [...currentTask.history];
          
          history.push({
            date: new Date().toLocaleDateString('fa-IR'),
            status: currentTask.status,
            description: `${imageUrls.length} تصویر به گزارش کار اضافه شد`,
            updatedBy
          });

          const updatedTask = await googleSheetsService.updateTask(taskId, {
            images: [...existingImages, ...imageUrls].join(','),
            history: JSON.stringify(history),
            updated_at: new Date().toLocaleDateString('fa-IR')
          });

          const taskForStore: Task = {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description || '',
            status: updatedTask.status as 'pending' | 'in-progress' | 'completed',
            priority: updatedTask.priority as 'low' | 'medium' | 'high',
            assignedTo: {
              id: updatedTask.assigned_to_id,
              name: updatedTask.assigned_to_name
            },
            vehicle: JSON.parse(updatedTask.vehicle_info || '{}'),
            createdAt: updatedTask.created_at,
            updatedAt: updatedTask.updated_at,
            dueDate: updatedTask.due_date || '',
            images: updatedTask.images ? updatedTask.images.split(',') : [],
            history: JSON.parse(updatedTask.history || '[]')
          };

          set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? taskForStore : t),
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error adding task images:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در افزودن تصاویر' 
          });
          throw error;
        }
      },

      addTaskFromDB: (task) => {
        set(state => ({
          tasks: [task, ...state.tasks.filter(t => t.id !== task.id)]
        }));
      },

      updateTaskFromDB: (task) => {
        set(state => ({
          tasks: state.tasks.map(t => t.id === task.id ? task : t)
        }));
      },

      deleteTaskFromDB: (id) => {
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }));
      },

      completeVehicleTasks: (vehicleId) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.vehicle.id === vehicleId 
              ? { ...task, status: 'completed' as const }
              : task
          )
        }));
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'task-storage',
      partialize: (state) => ({
        tasks: state.tasks
      })
    }
  )
);