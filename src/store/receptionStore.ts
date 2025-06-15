import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';

interface Reception {
  id: string;
  customer_info: string;
  vehicle_info: string;
  service_info: string;
  status: 'pending' | 'in-progress' | 'completed';
  images?: string;
  documents?: string;
  billing?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

interface ReceptionStore {
  receptions: Reception[];
  addReception: (reception: Omit<Reception, 'id' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateReception: (id: string, reception: Partial<Reception>) => Promise<void>;
  deleteReception: (id: string) => Promise<void>;
  completeReception: (id: string, billing: any, completedBy: string) => Promise<void>;
  setReceptions: (receptions: Reception[]) => void;
  getCompletedReceptions: () => Reception[];
  getActiveReceptions: () => Reception[];
  addReceptionFromDB: (reception: Reception) => void;
  updateReceptionFromDB: (reception: Reception) => void;
  deleteReceptionFromDB: (id: string) => void;
}

export const useReceptionStore = create<ReceptionStore>()(
  persist(
    (set, get) => ({
      receptions: [],
      
      addReception: async (reception) => {
        try {
          console.log('Adding reception via Google Sheets:', reception);
          
          const receptionData = {
            customer_info: reception.customer_info,
            vehicle_info: reception.vehicle_info,
            service_info: reception.service_info,
            status: 'pending',
            images: reception.images || '',
            documents: reception.documents || '',
            created_at: new Date().toLocaleDateString('fa-IR'),
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          const newReception = await googleSheetsService.addReception(receptionData);
          
          const receptionForStore: Reception = {
            id: newReception.id,
            customer_info: newReception.customer_info,
            vehicle_info: newReception.vehicle_info,
            service_info: newReception.service_info,
            status: 'pending',
            images: newReception.images,
            documents: newReception.documents,
            created_at: newReception.created_at,
            updated_at: newReception.updated_at
          };
          
          set((state) => ({
            receptions: [receptionForStore, ...state.receptions]
          }));
          
          console.log('Reception added successfully via Google Sheets:', receptionForStore);
        } catch (error) {
          console.error('Error adding reception via Google Sheets:', error);
          throw error;
        }
      },
      
      updateReception: async (id, reception) => {
        try {
          console.log('Updating reception via Google Sheets:', id, reception);
          
          const updateData: any = {
            updated_at: new Date().toLocaleDateString('fa-IR')
          };
          
          if (reception.status) updateData.status = reception.status;
          if (reception.customer_info) updateData.customer_info = reception.customer_info;
          if (reception.vehicle_info) updateData.vehicle_info = reception.vehicle_info;
          if (reception.service_info) updateData.service_info = reception.service_info;
          if (reception.images) updateData.images = reception.images;
          if (reception.documents) updateData.documents = reception.documents;
          if (reception.billing) updateData.billing = reception.billing;
          if (reception.completed_at) updateData.completed_at = reception.completed_at;
          if (reception.completed_by) updateData.completed_by = reception.completed_by;
          
          await googleSheetsService.updateReception(id, updateData);
          
          set((state) => ({
            receptions: state.receptions.map(r => 
              r.id === id ? { ...r, ...reception } : r
            )
          }));
          
          console.log('Reception updated successfully via Google Sheets');
        } catch (error) {
          console.error('Error updating reception via Google Sheets:', error);
          throw error;
        }
      },
      
      deleteReception: async (id) => {
        try {
          console.log('Deleting reception via Google Sheets:', id);
          
          await googleSheetsService.deleteReception(id);
          
          set((state) => ({
            receptions: state.receptions.filter(r => r.id !== id)
          }));
          
          console.log('Reception deleted successfully via Google Sheets');
        } catch (error) {
          console.error('Error deleting reception via Google Sheets:', error);
          throw error;
        }
      },
      
      completeReception: async (id, billing, completedBy) => {
        try {
          console.log('Completing reception via Google Sheets:', id, billing, completedBy);
          
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
                billing: JSON.stringify(billing),
                completed_at: new Date().toLocaleDateString('fa-IR'),
                completed_by: completedBy,
                updated_at: new Date().toLocaleDateString('fa-IR')
              } : r
            )
          }));
          
          console.log('Reception completed successfully via Google Sheets');
        } catch (error) {
          console.error('Error completing reception via Google Sheets:', error);
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
      }
    }),
    {
      name: 'reception-storage',
      partialize: (state) => ({
        receptions: state.receptions
      })
    }
  )
);