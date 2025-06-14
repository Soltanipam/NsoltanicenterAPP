import { googleSheetsService } from './googleSheets';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

class OfflineSyncService {
  private readonly STORAGE_KEY = 'offline_actions';
  private readonly CACHE_KEY = 'cached_data';
  private isOnline = navigator.onLine;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  // ذخیره عمل برای sync بعدی
  async queueAction(type: 'create' | 'update' | 'delete', table: string, data: any): Promise<void> {
    const action: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      table,
      data,
      timestamp: Date.now()
    };

    const actions = this.getPendingActions();
    actions.push(action);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actions));
  }

  // دریافت اعمال در انتظار sync
  private getPendingActions(): OfflineAction[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // sync کردن اعمال در انتظار
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    const actions = this.getPendingActions();
    if (actions.length === 0) {
      return;
    }

    console.log(`Syncing ${actions.length} pending actions...`);

    const successfulActions: string[] = [];

    for (const action of actions) {
      try {
        await this.executeAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.error('Error syncing action:', action, error);
        // در صورت خطا، عمل در لیست باقی می‌ماند
      }
    }

    // حذف اعمال موفق از لیست
    const remainingActions = actions.filter(action => !successfulActions.includes(action.id));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(remainingActions));

    console.log(`Synced ${successfulActions.length} actions successfully`);
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'create':
        if (action.table === 'users') {
          await googleSheetsService.addUser(action.data);
        } else if (action.table === 'customers') {
          await googleSheetsService.addCustomer(action.data);
        } else if (action.table === 'receptions') {
          await googleSheetsService.addReception(action.data);
        } else if (action.table === 'tasks') {
          await googleSheetsService.addTask(action.data);
        } else if (action.table === 'messages') {
          await googleSheetsService.addMessage(action.data);
        }
        break;

      case 'update':
        if (action.table === 'users') {
          await googleSheetsService.updateUser(action.data.id, action.data);
        } else if (action.table === 'tasks') {
          await googleSheetsService.updateTask(action.data.id, action.data);
        }
        break;

      case 'delete':
        if (action.table === 'users') {
          await googleSheetsService.deleteUser(action.data.id);
        }
        break;
    }
  }

  // کش کردن داده‌ها برای استفاده آفلاین
  cacheData(key: string, data: any): void {
    const cache = this.getCachedData();
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  // دریافت داده‌های کش شده
  getCachedData(key?: string): any {
    const stored = localStorage.getItem(this.CACHE_KEY);
    const cache = stored ? JSON.parse(stored) : {};
    
    if (key) {
      return cache[key]?.data || null;
    }
    
    return cache;
  }

  // پاک کردن کش
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // بررسی اینکه آیا داده‌های کش شده قدیمی هستند
  isCacheExpired(key: string, maxAge: number = 5 * 60 * 1000): boolean { // 5 دقیقه
    const cache = this.getCachedData();
    const item = cache[key];
    
    if (!item) {
      return true;
    }
    
    return Date.now() - item.timestamp > maxAge;
  }
}

export const offlineSyncService = new OfflineSyncService();