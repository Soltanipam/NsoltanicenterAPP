import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { googleSheetsService } from '../services/googleSheetsService';

export interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  createdAt: string;
  read: boolean;
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

          set({ messages, isLoading: false });
        } catch (error: any) {
          console.error('Error loading messages:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در بارگذاری پیام‌ها' 
          });
        }
      },

      addMessage: async (message) => {
        set({ isLoading: true, error: null });

        try {
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

        } catch (error: any) {
          console.error('Error sending message:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در ارسال پیام' 
          });
          throw error;
        }
      },

      markAsRead: async (id) => {
        try {
          await googleSheetsService.updateMessage(id, { read: 'true' });

          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === id ? { ...msg, read: true } : msg
            )
          }));

        } catch (error: any) {
          console.error('Error marking message as read:', error);
          set({ error: 'خطا در علامت‌گذاری پیام' });
        }
      },

      deleteMessage: async (id) => {
        set({ isLoading: true, error: null });

        try {
          await googleSheetsService.deleteMessage(id);

          set(state => ({
            messages: state.messages.filter(msg => msg.id !== id),
            isLoading: false
          }));

        } catch (error: any) {
          console.error('Error deleting message:', error);
          set({ 
            isLoading: false, 
            error: 'خطا در حذف پیام' 
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