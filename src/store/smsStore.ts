import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheets';

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // Variables like {customerName}, {vehicleModel}, etc.
}

export interface SMSSettings {
  id?: string;
  username: string;
  password_hash: string;
  from_number: string;
  enabled: boolean;
  templates: string;
}

export interface SMSLog {
  id: string;
  to_number: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  template_used?: string;
  cost?: number;
  sent_at: string;
}

interface SMSStore {
  settings: SMSSettings | null;
  logs: SMSLog[];
  templates: SMSTemplate[];
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  loadLogs: () => Promise<void>;
  updateSettings: (settings: Partial<SMSSettings>) => Promise<void>;
  addTemplate: (template: Omit<SMSTemplate, 'id'>) => void;
  updateTemplate: (id: string, template: Partial<SMSTemplate>) => void;
  deleteTemplate: (id: string) => void;
  sendSMS: (to: string, message: string, templateId?: string) => Promise<boolean>;
  addLog: (log: Omit<SMSLog, 'id'>) => Promise<void>;
  getBalance: () => Promise<number>;
  clearError: () => void;
}

const defaultTemplates: SMSTemplate[] = [
  {
    id: '1',
    name: 'پذیرش خودرو',
    content: 'سلام {customerName} عزیز، خودروی {vehicleModel} شما با شماره پلاک {plateNumber} در سلطانی سنتر پذیرش شد. کد پیگیری: {trackingCode}',
    variables: ['customerName', 'vehicleModel', 'plateNumber', 'trackingCode']
  },
  {
    id: '2',
    name: 'تکمیل تعمیرات',
    content: 'سلام {customerName} عزیز، تعمیرات خودروی {vehicleModel} شما تکمیل شد. لطفاً برای تحویل با ما تماس بگیرید. سلطانی سنتر',
    variables: ['customerName', 'vehicleModel']
  },
  {
    id: '3',
    name: 'یادآوری تحویل',
    content: 'سلام {customerName} عزیز، خودروی شما آماده تحویل است. لطفاً در اسرع وقت جهت تحویل مراجعه فرمایید. سلطانی سنتر',
    variables: ['customerName']
  }
];

export const useSMSStore = create<SMSStore>()(
  persist(
    (set, get) => ({
      settings: null,
      logs: [],
      templates: defaultTemplates,
      isLoading: false,
      error: null,

      loadSettings: async () => {
        set({ isLoading: true, error: null });

        try {
          const settingsData = await googleSheetsService.getSMSSettings();
          if (settingsData.length > 0) {
            const settings = settingsData[0];
            const parsedSettings: SMSSettings = {
              id: settings.id,
              username: settings.username || '',
              password_hash: settings.password_hash || '',
              from_number: settings.from_number || '',
              enabled: settings.enabled === 'true',
              templates: settings.templates || JSON.stringify(defaultTemplates)
            };

            // Parse templates
            try {
              const templates = JSON.parse(parsedSettings.templates);
              set({ settings: parsedSettings, templates, isLoading: false });
            } catch {
              set({ settings: parsedSettings, templates: defaultTemplates, isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error: any) {
          console.error('Error loading SMS settings:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری تنظیمات پیامک' 
          });
        }
      },

      loadLogs: async () => {
        set({ isLoading: true, error: null });

        try {
          const logsData = await googleSheetsService.getSMSLogs();
          const logs: SMSLog[] = logsData.map(log => ({
            id: log.id,
            to_number: log.to_number,
            message: log.message,
            status: log.status as 'sent' | 'failed' | 'pending',
            template_used: log.template_used,
            cost: log.cost ? parseInt(log.cost) : 0,
            sent_at: log.sent_at
          }));

          set({ logs, isLoading: false });
        } catch (error: any) {
          console.error('Error loading SMS logs:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری لاگ پیامک‌ها' 
          });
        }
      },

      updateSettings: async (newSettings) => {
        set({ isLoading: true, error: null });

        try {
          const currentSettings = get().settings;
          const updatedSettings = { ...currentSettings, ...newSettings };

          if (currentSettings?.id) {
            await googleSheetsService.updateSMSSettings(currentSettings.id, {
              username: updatedSettings.username,
              password_hash: updatedSettings.password_hash,
              from_number: updatedSettings.from_number,
              enabled: updatedSettings.enabled ? 'true' : 'false',
              templates: updatedSettings.templates
            });
          } else {
            const newSettingsData = await googleSheetsService.addSMSSettings({
              username: updatedSettings.username,
              password_hash: updatedSettings.password_hash,
              from_number: updatedSettings.from_number,
              enabled: updatedSettings.enabled ? 'true' : 'false',
              templates: updatedSettings.templates
            });
            updatedSettings.id = newSettingsData.id;
          }

          set({ settings: updatedSettings, isLoading: false });
        } catch (error: any) {
          console.error('Error updating SMS settings:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی تنظیمات پیامک' 
          });
          throw error;
        }
      },

      addTemplate: (template) => set((state) => {
        const newTemplate = { ...template, id: Date.now().toString() };
        const updatedTemplates = [...state.templates, newTemplate];
        
        // Update settings with new templates
        if (state.settings) {
          const updatedSettings = {
            ...state.settings,
            templates: JSON.stringify(updatedTemplates)
          };
          
          // Save to Google Sheets
          get().updateSettings(updatedSettings);
        }
        
        return { templates: updatedTemplates };
      }),

      updateTemplate: (id, template) => set((state) => {
        const updatedTemplates = state.templates.map(t =>
          t.id === id ? { ...t, ...template } : t
        );
        
        // Update settings with modified templates
        if (state.settings) {
          const updatedSettings = {
            ...state.settings,
            templates: JSON.stringify(updatedTemplates)
          };
          
          // Save to Google Sheets
          get().updateSettings(updatedSettings);
        }
        
        return { templates: updatedTemplates };
      }),

      deleteTemplate: (id) => set((state) => {
        const updatedTemplates = state.templates.filter(t => t.id !== id);
        
        // Update settings with remaining templates
        if (state.settings) {
          const updatedSettings = {
            ...state.settings,
            templates: JSON.stringify(updatedTemplates)
          };
          
          // Save to Google Sheets
          get().updateSettings(updatedSettings);
        }
        
        return { templates: updatedTemplates };
      }),

      sendSMS: async (to, message, templateId) => {
        const { settings } = get();
        
        if (!settings?.enabled || !settings.username || !settings.password_hash) {
          console.error('SMS service not configured');
          return false;
        }

        try {
          // Simulate API call to Melipayamak
          // In real implementation, you would call the actual API
          const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: settings.username,
              password: settings.password_hash,
              to: to,
              from: settings.from_number,
              text: message,
              isflash: false
            })
          });

          const result = await response.json();
          const success = result.RetStatus === 1;

          // Add to logs
          await get().addLog({
            to_number: to,
            message,
            status: success ? 'sent' : 'failed',
            sent_at: new Date().toLocaleDateString('fa-IR'),
            template_used: templateId,
            cost: success ? 50 : 0 // Estimated cost in Toman
          });

          return success;
        } catch (error) {
          console.error('SMS sending failed:', error);
          
          // Add failed log
          await get().addLog({
            to_number: to,
            message,
            status: 'failed',
            sent_at: new Date().toLocaleDateString('fa-IR'),
            template_used: templateId
          });

          return false;
        }
      },

      addLog: async (log) => {
        try {
          const newLog = await googleSheetsService.addSMSLog({
            to_number: log.to_number,
            message: log.message,
            status: log.status,
            template_used: log.template_used || '',
            cost: log.cost || 0,
            sent_at: log.sent_at
          });

          const logForStore: SMSLog = {
            id: newLog.id,
            to_number: newLog.to_number,
            message: newLog.message,
            status: newLog.status as 'sent' | 'failed' | 'pending',
            template_used: newLog.template_used,
            cost: newLog.cost ? parseInt(newLog.cost) : 0,
            sent_at: newLog.sent_at
          };

          set(state => ({
            logs: [logForStore, ...state.logs]
          }));
        } catch (error) {
          console.error('Error adding SMS log:', error);
        }
      },

      getBalance: async () => {
        const { settings } = get();
        
        if (!settings?.enabled || !settings.username || !settings.password_hash) {
          return 0;
        }

        try {
          // Simulate API call to get balance
          const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/GetCredit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: settings.username,
              password: settings.password_hash
            })
          });

          const result = await response.json();
          return result.Value || 0;
        } catch (error) {
          console.error('Failed to get SMS balance:', error);
          return 0;
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'sms-storage'
    }
  )
);