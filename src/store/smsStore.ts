import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // Variables like {customerName}, {vehicleModel}, etc.
}

export interface SMSSettings {
  username: string;
  password: string;
  from: string;
  enabled: boolean;
  templates: SMSTemplate[];
}

export interface SMSLog {
  id: string;
  to: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  templateUsed?: string;
  cost?: number;
}

interface SMSStore {
  settings: SMSSettings;
  logs: SMSLog[];
  updateSettings: (settings: Partial<SMSSettings>) => void;
  setSettings: (settings: SMSSettings) => void;
  setLogs: (logs: SMSLog[]) => void;
  addLogFromDB: (log: SMSLog) => void;
  addTemplate: (template: Omit<SMSTemplate, 'id'>) => void;
  updateTemplate: (id: string, template: Partial<SMSTemplate>) => void;
  deleteTemplate: (id: string) => void;
  sendSMS: (to: string, message: string, templateId?: string) => Promise<boolean>;
  addLog: (log: Omit<SMSLog, 'id'>) => void;
  getBalance: () => Promise<number>;
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
      settings: {
        username: '',
        password: '',
        from: '',
        enabled: false,
        templates: defaultTemplates
      },
      logs: [],

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setSettings: (settings) => set({ settings }),

      setLogs: (logs) => set({ logs }),

      addLogFromDB: (log) => set((state) => ({
        logs: [log, ...state.logs.filter(l => l.id !== log.id)]
      })),

      addTemplate: (template) => set((state) => ({
        settings: {
          ...state.settings,
          templates: [
            ...state.settings.templates,
            { ...template, id: Date.now().toString() }
          ]
        }
      })),

      updateTemplate: (id, template) => set((state) => ({
        settings: {
          ...state.settings,
          templates: state.settings.templates.map(t =>
            t.id === id ? { ...t, ...template } : t
          )
        }
      })),

      deleteTemplate: (id) => set((state) => ({
        settings: {
          ...state.settings,
          templates: state.settings.templates.filter(t => t.id !== id)
        }
      })),

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
              from: settings.from,
              text: message,
              isflash: false
            })
          });

          const result = await response.json();
          const success = result.RetStatus === 1;

          // Add to logs
          get().addLog({
            to,
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
          get().addLog({
            to,
            message,
            status: 'failed',
            sentAt: new Date().toLocaleDateString('fa-IR'),
            templateUsed: templateId
          });

          return false;
        }
      },

      addLog: (log) => set((state) => ({
        logs: [{ ...log, id: Date.now().toString() }, ...state.logs]
      })),

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
      }
    }),
    {
      name: 'sms-storage'
    }
  )
);