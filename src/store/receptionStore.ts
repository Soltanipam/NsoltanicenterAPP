import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

export interface Reception {
  id: string;
  customerInfo: {
    name: string;
    phone: string;
    nationalId?: string;
    address?: string;
  };
  vehicleInfo: {
    make: string;
    model: string;
    year: string;
    color: string;
    plateNumber: string;
    vin: string;
    mileage: string;
  };
  serviceInfo: {
    description: string;
    customerRequests?: string[];
    signature?: string;
  };
  status: 'pending' | 'in-progress' | 'completed';
  images?: string[];
  documents?: string[];
  billing?: {
    services: { name: string; price: number; quantity: number }[];
    parts: { name: string; price: number; quantity: number }[];
    discount: number;
    tax: number;
    total: number;
  };
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceptionStore {
  receptions: Reception[];
  isLoading: boolean;
  error: string | null;
  loadReceptions: () => Promise<void>;
  addReception: (reception: Omit<Reception, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReception: (id: string, reception: Partial<Reception>) => Promise<void>;
  deleteReception: (id: string) => Promise<void>;
  completeReception: (id: string, billing: any, completedBy: string) => Promise<void>;
  setReceptions: (receptions: Reception[]) => void;
  getCompletedReceptions: () => Reception[];
  getActiveReceptions: () => Reception[];
  addReceptionFromDB: (reception: Reception) => void;
  updateReceptionFromDB: (reception: Reception) => void;
  deleteReceptionFromDB: (id: string) => void;
  clearError: () => void;
}

export const useReceptionStore = create<ReceptionStore>()(
  persist(
    (set, get) => ({
      receptions: [],
      isLoading: false,
      error: null,

      loadReceptions: async () => {
        set({ isLoading: true, error: null });

        try {
          console.log('Loading receptions from Google Sheets...');
          const receptionsData = await googleSheetsService.getReceptions();
          
          const receptions: Reception[] = receptionsData.map(reception => ({
            id: reception.id,
            customerInfo: typeof reception.customer_info === 'string' ? JSON.parse(reception.customer_info) : reception.customer_info,
            vehicleInfo: typeof reception.vehicle_info === 'string' ? JSON.parse(reception.vehicle_info) : reception.vehicle_info,
            serviceInfo: typeof reception.service_info === 'string' ? JSON.parse(reception.service_info) : reception.service_info,
            status: reception.status as 'pending' | 'in-progress' | 'completed',
            images: reception.images ? reception.images.split(',') : [],
            documents: reception.documents ? reception.documents.split(',') : [],
            billing: reception.billing ? (typeof reception.billing === 'string' ? JSON.parse(reception.billing) : reception.billing) : undefined,
            completedAt: reception.completed_at,
            completedBy: reception.completed_by,
            createdAt: reception.created_at || new Date().toLocaleDateString('fa-IR'),
            updatedAt: reception.updated_at || new Date().toLocaleDateString('fa-IR')
          }));

          // Cache the receptions for offline use
          offlineSyncService.cacheData('receptions', receptionsData);

          set({ receptions, isLoading: false });
          console.log('Receptions loaded successfully from Google Sheets:', receptions.length);
        } catch (error: any) {
          console.error('Error loading receptions from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedReceptions = offlineSyncService.getCachedData('receptions');
          if (cachedReceptions && Array.isArray(cachedReceptions)) {
            const receptions: Reception[] = cachedReceptions.map(reception => ({
              id: reception.id,
              customerInfo: typeof reception.customer_info === 'string' ? JSON.parse(reception.customer_info) : reception.customer_info,
              vehicleInfo: typeof reception.vehicle_info === 'string' ? JSON.parse(reception.vehicle_info) : reception.vehicle_info,
              serviceInfo: typeof reception.service_info === 'string' ? JSON.parse(reception.service_info) : reception.service_info,
              status: reception.status as 'pending' | 'in-progress' | 'completed',
              images: reception.images ? reception.images.split(',') : [],
              documents: reception.documents ? reception.documents.split(',') : [],
              billing: reception.billing ? (typeof reception.billing === 'string' ? JSON.parse(reception.billing) : reception.billing) : undefined,
              completedAt: reception.completed_at,
              completedBy: reception.completed_by,
              createdAt: reception.created_at || new Date().toLocaleDateString('fa-IR'),
              updatedAt: reception.updated_at || new Date().toLocaleDateString('fa-IR')
            }));
            
            set({ 
              receptions, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('Receptions loaded from cache after error:', receptions.length);
            return;
          }
          
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری پذیرش‌ها از Google Sheets: ' + error.message 
          });
        }
      },
      
      addReception: async (reception) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Adding reception to Google Sheets:', reception);
          
          const receptionData = {
            customer_info: JSON.stringify(reception.customerInfo),
            vehicle_info: JSON.stringify(reception.vehicleInfo),
            service_info: JSON.stringify(reception.serviceInfo),
            status: 'pending',
            images: reception.images?.join(',') || '',
            documents: reception.documents?.join(',') || '',
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          const newReception = await googleSheetsService.addReception(receptionData);
          
          const receptionForStore: Reception = {
            id: newReception.id,
            customerInfo: reception.customerInfo,
            vehicleInfo: reception.vehicleInfo,
            serviceInfo: reception.serviceInfo,
            status: 'pending',
            images: reception.images,
            documents: reception.documents,
            createdAt: newReception.created_at,
            updatedAt: newReception.updated_at
          };
          
          set((state) => ({
            receptions: [receptionForStore, ...state.receptions],
            isLoading: false
          }));
          
          console.log('Reception added successfully to Google Sheets:', receptionForStore);
        } catch (error: any) {
          console.error('Error adding reception to Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در افزودن پذیرش به Google Sheets: ' + error.message 
          });
          throw error;
        }
      },
      
      updateReception: async (id, reception) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Updating reception in Google Sheets:', id, reception);
          
          const updateData: any = {
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          if (reception.status) updateData.status = reception.status;
          if (reception.customerInfo) updateData.customer_info = JSON.stringify(reception.customerInfo);
          if (reception.vehicleInfo) updateData.vehicle_info = JSON.stringify(reception.vehicleInfo);
          if (reception.serviceInfo) updateData.service_info = JSON.stringify(reception.serviceInfo);
          if (reception.images) updateData.images = reception.images.join(',');
          if (reception.documents) updateData.documents = reception.documents.join(',');
          if (reception.billing) updateData.billing = JSON.stringify(reception.billing);
          if (reception.completedAt) updateData.completed_at = reception.completedAt;
          if (reception.completedBy) updateData.completed_by = reception.completedBy;
          
          const updatedReception = await googleSheetsService.updateReception(id, updateData);
          
          set((state) => ({
            receptions: state.receptions.map(r => 
              r.id === id ? { ...r, ...reception, updatedAt: updatedReception.updated_at } : r
            ),
            isLoading: false
          }));
          
          console.log('Reception updated successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error updating reception in Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی پذیرش در Google Sheets: ' + error.message 
          });
          throw error;
        }
      },
      
      deleteReception: async (id) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Deleting reception from Google Sheets:', id);
          
          await googleSheetsService.deleteReception(id);
          
          set((state) => ({
            receptions: state.receptions.filter(r => r.id !== id),
            isLoading: false
          }));
          
          console.log('Reception deleted successfully from Google Sheets');
        } catch (error: any) {
          console.error('Error deleting reception from Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف پذیرش از Google Sheets: ' + error.message 
          });
          throw error;
        }
      },
      
      completeReception: async (id, billing, completedBy) => {
        try {
          console.log('Completing reception in Google Sheets:', id, billing, completedBy);
          
          const updateData = {
            status: 'completed',
            billing: JSON.stringify(billing),
            completed_by: completedBy,
            completed_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          await googleSheetsService.updateReception(id, updateData);
          
          set((state) => ({
            receptions: state.receptions.map(r => 
              r.id === id ? {
                ...r,
                status: 'completed' as const,
                billing,
                completedAt: new Date().toLocaleDateString('fa-IR'),
                completedBy,
                updatedAt: new Date().toLocaleDateString('fa-IR')
              } : r
            )
          }));
          
          console.log('Reception completed successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error completing reception in Google Sheets:', error);
          throw error;
        }
      },
      
      setReceptions: (receptions) => set({ receptions }),
      
      getCompletedReceptions: () => {
        return get().receptions.filter(r => r.status === 'completed');
      },
      
      getActiveReceptions: () => {
        return get().receptions.filter(r => r.status !== 'completed');
      },

      addReceptionFromDB: (reception) => {
        set((state) => ({
          receptions: [reception, ...state.receptions.filter(r => r.id !== reception.id)]
        }));
      },

      updateReceptionFromDB: (reception) => {
        set((state) => ({
          receptions: state.receptions.map(r => r.id === reception.id ? reception : r)
        }));
      },

      deleteReceptionFromDB: (id) => {
        set((state) => ({
          receptions: state.receptions.filter(r => r.id !== id)
        }));
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'reception-storage',
      partialize: (state) => ({
        receptions: state.receptions
      })
    }
  )
);