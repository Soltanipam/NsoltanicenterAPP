import { GOOGLE_CONFIG } from '../config/googleConfig';

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private spreadsheetId = GOOGLE_CONFIG.SPREADSHEET_ID;
  private apiKey = GOOGLE_CONFIG.API_KEY;

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // در حالت آفلاین، خطا بدهیم
    if (!navigator.onLine) {
      throw new Error('کاربر آفلاین است');
    }

    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'your_google_api_key_here') {
      throw new Error('Google API key تنظیم نشده است. لطفاً VITE_GOOGLE_API_KEY را در فایل .env تنظیم کنید.');
    }
    
    const url = `${this.baseUrl}/${this.spreadsheetId}${endpoint}`;
    const finalUrl = url + (url.includes('?') ? '&' : '?') + `key=${this.apiKey}`;
    
    const response = await fetch(finalUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // بررسی خطاهای مربوط به API key
      if (response.status === 400 && error.error?.message?.includes('API key not valid')) {
        throw new Error('API key معتبر نیست. لطفاً Google API key خود را در فایل .env بررسی کنید و مطمئن شوید که Google Sheets API فعال است.');
      }
      
      if (response.status === 403) {
        throw new Error('دسترسی رد شد. لطفاً مجوزهای Google API key خود را بررسی کنید.');
      }
      
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getSheetData(sheetName: string): Promise<SheetRow[]> {
    try {
      const range = `${sheetName}!A:Z`;
      const response = await this.makeRequest(`/values/${range}`);
      
      if (!response.values || response.values.length === 0) {
        return [];
      }

      const [headers, ...rows] = response.values;
      
      return rows.map((row: any[]) => {
        const rowData: SheetRow = {};
        headers.forEach((header: string, index: number) => {
          rowData[header] = row[index] || null;
        });
        return rowData;
      });
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async appendRow(sheetName: string, data: SheetRow): Promise<SheetRow> {
    try {
      // For read-only API key, we simulate the operation
      // In a real implementation with service account, you would use the write API
      console.warn('Write operations require service account authentication. Simulating append operation.');
      
      // Generate a mock ID for the new row
      const mockId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      return { ...data, id: mockId };
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName: string, id: string, data: Partial<SheetRow>): Promise<SheetRow> {
    try {
      // For read-only API key, we simulate the operation
      console.warn('Write operations require service account authentication. Simulating update operation.');
      
      // Return the updated data
      return { id, ...data } as SheetRow;
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    try {
      // For read-only API key, we simulate the operation
      console.warn('Write operations require service account authentication. Simulating delete operation.');
    } catch (error) {
      console.error(`Error deleting row from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // متدهای مخصوص هر جدول
  async getUsers(): Promise<SheetRow[]> {
    return this.getSheetData('users');
  }

  async addUser(user: SheetRow): Promise<SheetRow> {
    user.created_at = new Date().toLocaleDateString('fa-IR');
    user.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('users', user);
  }

  async updateUser(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('users', id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    return this.deleteRow('users', id);
  }

  async getCustomers(): Promise<SheetRow[]> {
    return this.getSheetData('customers');
  }

  async addCustomer(customer: SheetRow): Promise<SheetRow> {
    customer.created_at = new Date().toLocaleDateString('fa-IR');
    customer.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('customers', customer);
  }

  async updateCustomer(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('customers', id, updates);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.deleteRow('customers', id);
  }

  async getReceptions(): Promise<SheetRow[]> {
    return this.getSheetData('receptions');
  }

  async addReception(reception: SheetRow): Promise<SheetRow> {
    reception.created_at = new Date().toLocaleDateString('fa-IR');
    reception.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('receptions', reception);
  }

  async updateReception(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('receptions', id, updates);
  }

  async deleteReception(id: string): Promise<void> {
    return this.deleteRow('receptions', id);
  }

  async getTasks(): Promise<SheetRow[]> {
    return this.getSheetData('tasks');
  }

  async addTask(task: SheetRow): Promise<SheetRow> {
    task.created_at = new Date().toLocaleDateString('fa-IR');
    task.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('tasks', task);
  }

  async updateTask(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('tasks', id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    return this.deleteRow('tasks', id);
  }

  async getMessages(): Promise<SheetRow[]> {
    return this.getSheetData('messages');
  }

  async addMessage(message: SheetRow): Promise<SheetRow> {
    message.created_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('messages', message);
  }

  async updateMessage(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    return this.updateRow('messages', id, updates);
  }

  async deleteMessage(id: string): Promise<void> {
    return this.deleteRow('messages', id);
  }

  async getSMSSettings(): Promise<SheetRow[]> {
    return this.getSheetData('sms_settings');
  }

  async addSMSSettings(settings: SheetRow): Promise<SheetRow> {
    settings.created_at = new Date().toLocaleDateString('fa-IR');
    settings.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('sms_settings', settings);
  }

  async updateSMSSettings(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('sms_settings', id, updates);
  }

  async getSMSLogs(): Promise<SheetRow[]> {
    return this.getSheetData('sms_logs');
  }

  async addSMSLog(log: SheetRow): Promise<SheetRow> {
    log.sent_at = new Date().toLocaleDateString('fa-IR');
    return this.appendRow('sms_logs', log);
  }
}

export const googleSheetsService = new GoogleSheetsService();