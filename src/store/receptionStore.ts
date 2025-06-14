import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';

interface Reception {
  id: string;
  customerInfo: {
    name: string;
    phone: string;
    nationalId: string;
    address: string;
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
    estimatedCompletion?: string;
    customerComplaints: string[];
    customerRequests?: string[];
    signature?: string | null;
  };
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  images?: string[];
  documents?: string[];
  billing?: {
    services: { name: string; price: number; quantity: number }[];
    parts: { name: string; price: number; quantity: number }[];
    discount: number;
    tax: number;
    total: number;
  };
}

interface ReceptionStore {
  receptions: Reception[];
  addReception: (reception: Omit<Reception, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateReception: (id: string, reception: Partial<Reception>) => Promise<void>;
  deleteReception: (id: string) => Promise<void>;
  completeReception: (id: string, billing: Reception['billing'], completedBy: string) => Promise<void>;
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
            customer_id: reception.customerInfo.name,
            date: new Date().toLocaleDateString('fa-IR'),
            vehicle_info: JSON.stringify(reception.vehicleInfo),
            status: 'pending'
          };
          
          const newReception = await googleSheetsService.addRow('receptions', receptionData);
          
          const receptionForStore: Reception = {
            id: newReception.id,
            customerInfo: reception.customerInfo,
            vehicleInfo: reception.vehicleInfo,
            serviceInfo: reception.serviceInfo,
            status: 'pending',
            images: reception.images,
            documents: reception.documents,
            createdAt: new Date().toLocaleDateString('fa-IR')
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
          
          const updateData: any = {};
          if (reception.status) updateData.status = reception.status;
          if (reception.vehicleInfo) updateData.vehicle_info = JSON.stringify(reception.vehicleInfo);
          if (reception.billing) updateData.billing = JSON.stringify(reception.billing);
          if (reception.completedAt) updateData.completed_at = reception.completedAt;
          if (reception.completedBy) updateData.completed_by = reception.completedBy;
          
          await googleSheetsService.updateRow('receptions', id, updateData);
          
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
          
          await googleSheetsService.deleteRow('receptions', id);
          
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
            completed_at: new Date().toLocaleDateString('fa-IR')
          };
          
          await googleSheetsService.updateRow('receptions', id, updateData);
          
          set((state) => ({
            receptions: state.receptions.map(r => 
              r.id === id ? {
                ...r,
                status: 'completed' as const,
                billing,
                completedAt: new Date().toLocaleDateString('fa-IR'),
                completedBy
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
        receptions: state.receptions.map(reception => ({
          ...reception,
          // Exclude large data fields from local storage to prevent quota exceeded
          images: undefined,
          documents: undefined,
          serviceInfo: {
            ...reception.serviceInfo,
            // Remove base64 signature data from local storage to prevent quota exceeded
            signature: reception.serviceInfo.signature?.startsWith('data:image') 
              ? null 
              : reception.serviceInfo.signature
          }
        }))
      })
    }
  )
);