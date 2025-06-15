import { GOOGLE_CONFIG } from '../config/googleConfig';
import { googleAuthService } from './googleAuth';

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private spreadsheetId = GOOGLE_CONFIG.SPREADSHEET_ID;

  private async getValidAccessToken(): Promise<string> {
    return await googleAuthService.ensureValidToken();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // در حالت آفلاین، خطا بدهیم
    if (!navigator.onLine) {
      throw new Error('کاربر آفلاین است');
    }

    // Get valid OAuth2 access token
    const accessToken = await this.getValidAccessToken();
    
    const url = `${this.baseUrl}/${this.spreadsheetId}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // بررسی خطاهای مربوط به authentication
      if (response.status === 401) {
        // Try to refresh token once
        try {
          await googleAuthService.refreshToken();
          const newAccessToken = await googleAuthService.ensureValidToken();
          if (newAccessToken) {
            // Retry the request with new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newAccessToken}`,
                ...options.headers,
              },
            });
            
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        } catch (refreshError) {
          // Refresh failed, user needs to re-authenticate
        }
        
        throw new Error('Authentication failed. Please re-authenticate with Google.');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied. Please check your Google account permissions for Google Sheets.');
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
      // ابتدا headers را دریافت کنیم
      const headersResponse = await this.makeRequest(`/values/${sheetName}!1:1`);
      const headers = headersResponse.values?.[0] || [];

      // اگر header وجود نداشت، ابتدا آن را ایجاد کنیم
      if (headers.length === 0) {
        const newHeaders = Object.keys(data);
        await this.makeRequest(`/values/${sheetName}!A1:${this.getColumnLetter(newHeaders.length)}1?valueInputOption=RAW`, {
          method: 'PUT',
          body: JSON.stringify({
            values: [newHeaders]
          })
        });
        headers.push(...newHeaders);
      }

      // ID ایجاد کنیم اگر وجود نداشت
      if (!data.id) {
        data.id = this.generateId();
      }

      // داده‌ها را بر اساس ترتیب headers مرتب کنیم
      const values = headers.map((header: string) => data[header] || '');

      const range = `${sheetName}!A:${this.getColumnLetter(headers.length)}`;
      await this.makeRequest(`/values/${range}:append?valueInputOption=RAW`, {
        method: 'POST',
        body: JSON.stringify({
          values: [values]
        })
      });

      return data;
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName: string, id: string, data: Partial<SheetRow>): Promise<SheetRow> {
    try {
      // ابتدا ردیف مورد نظر را پیدا کنیم
      const allData = await this.getSheetData(sheetName);
      const rowIndex = allData.findIndex(row => row.id === id);
      
      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found`);
      }

      // Headers را دریافت کنیم
      const headersResponse = await this.makeRequest(`/values/${sheetName}!1:1`);
      const headers = headersResponse.values?.[0] || [];

      // داده‌های موجود را با داده‌های جدید ترکیب کنیم
      const existingData = allData[rowIndex];
      const updatedData = { ...existingData, ...data };

      // داده‌ها را بر اساس ترتیب headers مرتب کنیم
      const values = headers.map((header: string) => updatedData[header] || '');

      const range = `${sheetName}!A${rowIndex + 2}:${this.getColumnLetter(headers.length)}${rowIndex + 2}`;
      await this.makeRequest(`/values/${range}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({
          values: [values]
        })
      });

      return updatedData;
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    try {
      // ابتدا ردیف مورد نظر را پیدا کنیم
      const allData = await this.getSheetData(sheetName);
      const rowIndex = allData.findIndex(row => row.id === id);
      
      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found`);
      }

      // ابتدا sheet ID را دریافت کنیم
      const sheetInfo = await this.makeRequest('');
      const sheet = sheetInfo.sheets.find((s: any) => s.properties.title === sheetName);
      
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const sheetId = sheet.properties.sheetId;

      await this.makeRequest(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 برای header
                endIndex: rowIndex + 2
              }
            }
          }]
        })
      });
    } catch (error) {
      console.error(`Error deleting row from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  private getColumnLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
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
}

export const googleSheetsService = new GoogleSheetsService();