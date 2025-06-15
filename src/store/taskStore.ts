import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';
import { googleDriveService } from '../services/googleDrive';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to_id: string;
  assigned_to_name: string;
  vehicle_id: string;
  vehicle_info: string;
  due_date: string;
  images?: string[];
  history: string;
  created_at: string;
  updated_at: string;
}

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  setTasks: (tasks: Task[]) => void;
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'history'>) => Promise<void>;
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
            assigned_to_id: task.assigned_to_id,
            assigned_to_name: task.assigned_to_name,
            vehicle_id: task.vehicle_id,
            vehicle_info: task.vehicle_info,
            due_date: task.due_date || '',
            images: task.images ? task.images.split(',') : [],
            history: task.history || '[]',
            created_at: task.created_at,
            updated_at: task.updated_at
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
            assigned_to_id: task.assigned_to_id,
            assigned_to_name: task.assigned_to_name,
            vehicle_id: task.vehicle_id,
            vehicle_info: task.vehicle_info,
            due_date: task.due_date,
            images: '',
            history: JSON.stringify([{
              date: new Date().toLocaleDateString('fa-IR'),
              status: 'pending',
              description: 'وظیفه ایجاد شد',
              updatedBy: task.assigned_to_name
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
            assigned_to_id: newTask.assigned_to_id,
            assigned_to_name: newTask.assigned_to_name,
            vehicle_id: newTask.vehicle_id,
            vehicle_info: newTask.vehicle_info,
            due_date: newTask.due_date || '',
            images: newTask.images ? newTask.images.split(',') : [],
            history: newTask.history || '[]',
            created_at: newTask.created_at,
            updated_at: newTask.updated_at
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

          let history = [];
          try {
            history = JSON.parse(currentTask.history);
          } catch {
            history = [];
          }
          
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
          if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
          if (updates.vehicle_info !== undefined) updateData.vehicle_info = updates.vehicle_info;
          if (updates.images !== undefined) updateData.images = updates.images.join(',');
          
          if (updates.assigned_to_id !== undefined) {
            updateData.assigned_to_id = updates.assigned_to_id;
          }
          if (updates.assigned_to_name !== undefined) {
            updateData.assigned_to_name = updates.assigned_to_name;
          }

          const updatedTask = await googleSheetsService.updateTask(id, updateData);

          const taskForStore: Task = {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description || '',
            status: updatedTask.status as 'pending' | 'in-progress' | 'completed',
            priority: updatedTask.priority as 'low' | 'medium' | 'high',
            assigned_to_id: updatedTask.assigned_to_id,
            assigned_to_name: updatedTask.assigned_to_name,
            vehicle_id: updatedTask.vehicle_id,
            vehicle_info: updatedTask.vehicle_info,
            due_date: updatedTask.due_date || '',
            images: updatedTask.images ? updatedTask.images.split(',') : [],
            history: updatedTask.history || '[]',
            created_at: updatedTask.created_at,
            updated_at: updatedTask.updated_at
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
          let history = [];
          try {
            history = JSON.parse(currentTask.history);
          } catch {
            history = [];
          }
          
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
            assigned_to_id: updatedTask.assigned_to_id,
            assigned_to_name: updatedTask.assigned_to_name,
            vehicle_id: updatedTask.vehicle_id,
            vehicle_info: updatedTask.vehicle_info,
            due_date: updatedTask.due_date || '',
            images: updatedTask.images ? updatedTask.images.split(',') : [],
            history: updatedTask.history || '[]',
            created_at: updatedTask.created_at,
            updated_at: updatedTask.updated_at
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
            task.vehicle_id === vehicleId 
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