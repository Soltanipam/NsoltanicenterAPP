import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // Variables like {customerName}, {vehicleModel}, etc.
}

export interface SMSSettings {
  id?: string;
  username: string;
  password: string;
  fromNumber: string;
  enabled: boolean;
  templates: SMSTemplate[];
}

export interface SMSLog {
  id: string;
  toNumber: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  templateUsed?: string;
  cost?: number;
  sentAt: string;
}

interface SMSStore {
  settings: SMSSettings;
  logs: SMSLog[];
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

const defaultSettings: SMSSettings = {
  username: '',
  password: '',
  fromNumber: '',
  enabled: false,
  templates: defaultTemplates
};

export const useSMSStore = create<SMSStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      logs: [],
      isLoading: false,
      error: null,

      loadSettings: async () => {
        set({ isLoading: true, error: null });

        try {
          console.log('Loading SMS settings from Google Sheets...');
          const settingsData = await googleSheetsService.getSMSSettings();
          
          if (settingsData.length > 0) {
            const settings = settingsData[0];
            const parsedSettings: SMSSettings = {
              id: settings.id,
              username: settings.username || '',
              password: settings.password_hash || '',
              fromNumber: settings.from_number || '',
              enabled: settings.enabled === 'true',
              templates: settings.templates ? JSON.parse(settings.templates) : defaultTemplates
            };

            // Cache the settings for offline use
            offlineSyncService.cacheData('sms_settings', settingsData);

            set({ settings: parsedSettings, isLoading: false });
            console.log('SMS settings loaded successfully from Google Sheets');
          } else {
            set({ settings: defaultSettings, isLoading: false });
            console.log('No SMS settings found, using defaults');
          }
        } catch (error: any) {
          console.error('Error loading SMS settings from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedSettings = offlineSyncService.getCachedData('sms_settings');
          if (cachedSettings && Array.isArray(cachedSettings) && cachedSettings.length > 0) {
            const settings = cachedSettings[0];
            const parsedSettings: SMSSettings = {
              id: settings.id,
              username: settings.username || '',
              password: settings.password_hash || '',
              fromNumber: settings.from_number || '',
              enabled: settings.enabled === 'true',
              templates: settings.templates ? JSON.parse(settings.templates) : defaultTemplates
            };
            
            set({ 
              settings: parsedSettings, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('SMS settings loaded from cache after error');
            return;
          }
          
          set({ 
            settings: defaultSettings,
            isLoading: false, 
            error: 'خطا در بارگذاری تنظیمات پیامک از Google Sheets: ' + error.message 
          });
        }
      },

      loadLogs: async () => {
        set({ isLoading: true, error: null });

        try {
          console.log('Loading SMS logs from Google Sheets...');
          const logsData = await googleSheetsService.getSMSLogs();
          
          const logs: SMSLog[] = logsData.map(log => ({
            id: log.id,
            toNumber: log.to_number,
            message: log.message,
            status: log.status as 'sent' | 'failed' | 'pending',
            templateUsed: log.template_used,
            cost: log.cost ? parseInt(log.cost) : 0,
            sentAt: log.sent_at
          }));

          // Cache the logs for offline use
          offlineSyncService.cacheData('sms_logs', logsData);

          set({ logs, isLoading: false });
          console.log('SMS logs loaded successfully from Google Sheets:', logs.length);
        } catch (error: any) {
          console.error('Error loading SMS logs from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedLogs = offlineSyncService.getCachedData('sms_logs');
          if (cachedLogs && Array.isArray(cachedLogs)) {
            const logs: SMSLog[] = cachedLogs.map(log => ({
              id: log.id,
              toNumber: log.to_number,
              message: log.message,
              status: log.status as 'sent' | 'failed' | 'pending',
              templateUsed: log.template_used,
              cost: log.cost ? parseInt(log.cost) : 0,
              sentAt: log.sent_at
            }));
            
            set({ 
              logs, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('SMS logs loaded from cache after error:', logs.length);
            return;
          }
          
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری لاگ پیامک‌ها از Google Sheets: ' + error.message 
          });
        }
      },

      updateSettings: async (newSettings) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Updating SMS settings in Google Sheets:', newSettings);
          const currentSettings = get().settings;
          const updatedSettings = { ...currentSettings, ...newSettings };

          const settingsData = {
            username: updatedSettings.username,
            password_hash: updatedSettings.password,
            from_number: updatedSettings.fromNumber,
            enabled: updatedSettings.enabled ? 'true' : 'false',
            templates: JSON.stringify(updatedSettings.templates)
          };

          if (currentSettings.id) {
            await googleSheetsService.updateSMSSettings(currentSettings.id, settingsData);
          } else {
            const newSettingsData = await googleSheetsService.addSMSSettings(settingsData);
            updatedSettings.id = newSettingsData.id;
          }

          set({ settings: updatedSettings, isLoading: false });
          console.log('SMS settings updated successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error updating SMS settings in Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در به‌روزرسانی تنظیمات پیامک در Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      addTemplate: (template) => set((state) => {
        const newTemplate = { ...template, id: Date.now().toString() };
        const updatedTemplates = [...state.settings.templates, newTemplate];
        const updatedSettings = { ...state.settings, templates: updatedTemplates };
        
        // Save to Google Sheets
        get().updateSettings({ templates: updatedTemplates });
        
        return { settings: updatedSettings };
      }),

      updateTemplate: (id, template) => set((state) => {
        const updatedTemplates = state.settings.templates.map(t =>
          t.id === id ? { ...t, ...template } : t
        );
        const updatedSettings = { ...state.settings, templates: updatedTemplates };
        
        // Save to Google Sheets
        get().updateSettings({ templates: updatedTemplates });
        
        return { settings: updatedSettings };
      }),

      deleteTemplate: (id) => set((state) => {
        const updatedTemplates = state.settings.templates.filter(t => t.id !== id);
        const updatedSettings = { ...state.settings, templates: updatedTemplates };
        
        // Save to Google Sheets
        get().updateSettings({ templates: updatedTemplates });
        
        return { settings: updatedSettings };
      }),

      sendSMS: async (to, message, templateId) => {
        const { settings } = get();
        
        if (!settings.enabled || !settings.username || !settings.password) {
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
              password: settings.password,
              to: to,
              from: settings.fromNumber,
              text: message,
              isflash: false
            })
          });

          const result = await response.json();
          const success = result.RetStatus === 1;

          // Add to logs
          await get().addLog({
            toNumber: to,
            message,
            status: success ? 'sent' : 'failed',
            sentAt: new Date().toLocaleDateString('fa-IR'),
            templateUsed: templateId,
            cost: success ? 50 : 0 // Estimated cost in Toman
          });

          return success;
        } catch (error) {
          console.error('SMS sending failed:', error);
          
          // Add failed log
          await get().addLog({
            toNumber: to,
            message,
            status: 'failed',
            sentAt: new Date().toLocaleDateString('fa-IR'),
            templateUsed: templateId
          });

          return false;
        }
      },

      addLog: async (log) => {
        try {
          console.log('Adding SMS log to Google Sheets:', log);

          const newLog = await googleSheetsService.addSMSLog({
            to_number: log.toNumber,
            message: log.message,
            status: log.status,
            template_used: log.templateUsed || '',
            cost: log.cost || 0,
            sent_at: log.sentAt
          });

          const logForStore: SMSLog = {
            id: newLog.id,
            toNumber: newLog.to_number,
            message: newLog.message,
            status: newLog.status as 'sent' | 'failed' | 'pending',
            templateUsed: newLog.template_used,
            cost: newLog.cost ? parseInt(newLog.cost) : 0,
            sentAt: newLog.sent_at
          };

          set(state => ({
            logs: [logForStore, ...state.logs]
          }));

          console.log('SMS log added successfully to Google Sheets');
        } catch (error: any) {
          console.error('Error adding SMS log to Google Sheets:', error);
        }
      },

      getBalance: async () => {
        const { settings } = get();
        
        if (!settings.enabled || !settings.username || !settings.password) {
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
              password: settings.password
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