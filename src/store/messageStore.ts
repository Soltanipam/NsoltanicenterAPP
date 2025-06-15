import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../lib/googleSheets';
import { offlineSyncService } from '../services/offlineSync';

export interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface MessageStore {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  setMessages: (messages: Message[]) => void;
  loadMessages: () => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  getUnreadCount: (userId: string) => number;
  getUserMessages: (userId: string) => Message[];
  clearError: () => void;
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,

      setMessages: (messages) => set({ messages }),

      loadMessages: async () => {
        set({ isLoading: true, error: null });

        try {
          console.log('Loading messages from Google Sheets...');
          const messagesData = await googleSheetsService.getMessages();
          
          const messages: Message[] = messagesData.map(msg => ({
            id: msg.id,
            from: msg.from_user_id,
            to: msg.to_user_id,
            subject: msg.subject,
            content: msg.content,
            read: msg.read === 'true',
            createdAt: msg.created_at
          }));

          // Cache the messages for offline use
          offlineSyncService.cacheData('messages', messagesData);

          set({ messages, isLoading: false });
          console.log('Messages loaded successfully from Google Sheets:', messages.length);
        } catch (error: any) {
          console.error('Error loading messages from Google Sheets:', error);
          
          // Try to load from cache as fallback
          const cachedMessages = offlineSyncService.getCachedData('messages');
          if (cachedMessages && Array.isArray(cachedMessages)) {
            const messages: Message[] = cachedMessages.map(msg => ({
              id: msg.id,
              from: msg.from_user_id,
              to: msg.to_user_id,
              subject: msg.subject,
              content: msg.content,
              read: msg.read === 'true',
              createdAt: msg.created_at
            }));
            
            set({ 
              messages, 
              isLoading: false, 
              error: 'اتصال به Google Sheets برقرار نیست. داده‌های کش شده نمایش داده می‌شود.'
            });
            console.log('Messages loaded from cache after error:', messages.length);
            return;
          }
          
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری پیام‌ها از Google Sheets: ' + error.message 
          });
        }
      },

      addMessage: async (message) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Adding message to Google Sheets:', message);

          const newMessage = await googleSheetsService.addMessage({
            from_user_id: message.from,
            to_user_id: message.to,
            subject: message.subject,
            content: message.content,
            read: 'false',
            created_at: new Date().toLocaleDateString('fa-IR')
          });

          const messageForStore: Message = {
            id: newMessage.id,
            from: newMessage.from_user_id,
            to: newMessage.to_user_id,
            subject: newMessage.subject,
            content: newMessage.content,
            read: false,
            createdAt: newMessage.created_at
          };

          set(state => ({
            messages: [messageForStore, ...state.messages],
            isLoading: false
          }));

          console.log('Message added successfully to Google Sheets');
        } catch (error: any) {
          console.error('Error sending message to Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در ارسال پیام به Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      markAsRead: async (id) => {
        try {
          console.log('Marking message as read in Google Sheets:', id);

          await googleSheetsService.updateMessage(id, { read: 'true' });

          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === id ? { ...msg, read: true } : msg
            )
          }));

          console.log('Message marked as read successfully in Google Sheets');
        } catch (error: any) {
          console.error('Error marking message as read in Google Sheets:', error);
          set({ error: 'خطا در علامت‌گذاری پیام در Google Sheets: ' + error.message });
        }
      },

      deleteMessage: async (id) => {
        set({ isLoading: true, error: null });

        try {
          console.log('Deleting message from Google Sheets:', id);

          await googleSheetsService.deleteMessage(id);

          set(state => ({
            messages: state.messages.filter(msg => msg.id !== id),
            isLoading: false
          }));

          console.log('Message deleted successfully from Google Sheets');
        } catch (error: any) {
          console.error('Error deleting message from Google Sheets:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف پیام از Google Sheets: ' + error.message 
          });
          throw error;
        }
      },

      getUnreadCount: (userId) => {
        return get().messages.filter(msg => 
          msg.to === userId && !msg.read
        ).length;
      },

      getUserMessages: (userId) => {
        return get().messages.filter(msg => 
          msg.to === userId || msg.from === userId
        ).sort((a, b) => b.id.localeCompare(a.id));
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'message-storage',
      partialize: (state) => ({
        messages: state.messages
      })
    }
  )
);