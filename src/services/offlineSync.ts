interface CachedData {
  [key: string]: any;
}

interface PendingAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

class OfflineSyncService {
  private cache: CachedData = {};
  private pendingActions: PendingAction[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Load cached data from localStorage
    this.loadFromStorage();
    
    // Listen for online/offline events
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

  cacheData(key: string, data: any): void {
    this.cache[key] = data;
    this.saveToStorage();
  }

  getCachedData(key: string): any {
    return this.cache[key];
  }

  addPendingAction(type: string, data: any): void {
    const action: PendingAction = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: Date.now()
    };
    
    this.pendingActions.push(action);
    this.saveToStorage();
  }

  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.pendingActions.length === 0) {
      return;
    }

    console.log('Syncing pending actions:', this.pendingActions.length);
    
    // Process pending actions
    const actionsToProcess = [...this.pendingActions];
    this.pendingActions = [];
    
    for (const action of actionsToProcess) {
      try {
        // Here you would implement the actual sync logic
        // For now, we'll just log the action
        console.log('Processing pending action:', action);
        
        // Remove processed action
        // In a real implementation, you'd call the appropriate service methods
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Re-add failed action to pending list
        this.pendingActions.push(action);
      }
    }
    
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const cachedData = localStorage.getItem('offline-cache');
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
      }
      
      const pendingActions = localStorage.getItem('pending-actions');
      if (pendingActions) {
        this.pendingActions = JSON.parse(pendingActions);
      }
    } catch (error) {
      console.error('Failed to load offline data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('offline-cache', JSON.stringify(this.cache));
      localStorage.setItem('pending-actions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('Failed to save offline data to storage:', error);
    }
  }

  clearCache(): void {
    this.cache = {};
    this.pendingActions = [];
    localStorage.removeItem('offline-cache');
    localStorage.removeItem('pending-actions');
  }
}

export const offlineSyncService = new OfflineSyncService();