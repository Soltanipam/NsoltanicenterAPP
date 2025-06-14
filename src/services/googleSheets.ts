import { GOOGLE_CONFIG } from '../config/googleConfig';
import { googleAuthService } from './googleAuth';

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = googleAuthService.getAccessToken();
    if (!token) {
      throw new Error('کاربر احراز هویت نشده است');
    }

    const response = await fetch(`${this.baseUrl}/${GOOGLE_CONFIG.SPREADSHEET_ID}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
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

  async appendRow(sheetName: string, data: SheetRow): Promise<void> {
    try {
      // ابتدا headers را دریافت کنیم
      const headersResponse = await this.makeRequest(`/values/${sheetName}!1:1`);
      const headers = headersResponse.values?.[0] || [];

      // اگر header وجود نداشت، ابتدا آن را ایجاد کنیم
      if (headers.length === 0) {
        const newHeaders = Object.keys(data);
        await this.makeRequest(`/values/${sheetName}!A1:${this.getColumnLetter(newHeaders.length)}1`, {
          method: 'PUT',
          body: JSON.stringify({
            values: [newHeaders]
          })
        });
        headers.push(...newHeaders);
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
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName: string, rowIndex: number, data: SheetRow): Promise<void> {
    try {
      // Headers را دریافت کنیم
      const headersResponse = await this.makeRequest(`/values/${sheetName}!1:1`);
      const headers = headersResponse.values?.[0] || [];

      // داده‌ها را بر اساس ترتیب headers مرتب کنیم
      const values = headers.map((header: string) => data[header] || '');

      const range = `${sheetName}!A${rowIndex + 1}:${this.getColumnLetter(headers.length)}${rowIndex + 1}`;
      await this.makeRequest(`/values/${range}`, {
        method: 'PUT',
        body: JSON.stringify({
          values: [values]
        })
      });
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<void> {
    try {
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
                startIndex: rowIndex,
                endIndex: rowIndex + 1
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

  async findRowByField(sheetName: string, field: string, value: any): Promise<{ row: SheetRow; index: number } | null> {
    try {
      const data = await this.getSheetData(sheetName);
      const index = data.findIndex(row => row[field] === value);
      
      if (index === -1) {
        return null;
      }

      return { row: data[index], index: index + 1 }; // +1 چون header در نظر گرفته می‌شود
    } catch (error) {
      console.error(`Error finding row in sheet ${sheetName}:`, error);
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

  // متدهای مخصوص هر جدول
  async getUsers(): Promise<SheetRow[]> {
    return this.getSheetData(GOOGLE_CONFIG.SHEETS.USERS);
  }

  async addUser(user: SheetRow): Promise<void> {
    user.id = this.generateId();
    user.created_at = new Date().toISOString();
    return this.appendRow(GOOGLE_CONFIG.SHEETS.USERS, user);
  }

  async updateUser(id: string, updates: Partial<SheetRow>): Promise<void> {
    const result = await this.findRowByField(GOOGLE_CONFIG.SHEETS.USERS, 'id', id);
    if (!result) {
      throw new Error('کاربر یافت نشد');
    }

    const updatedData = { ...result.row, ...updates, updated_at: new Date().toISOString() };
    return this.updateRow(GOOGLE_CONFIG.SHEETS.USERS, result.index, updatedData);
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.findRowByField(GOOGLE_CONFIG.SHEETS.USERS, 'id', id);
    if (!result) {
      throw new Error('کاربر یافت نشد');
    }

    return this.deleteRow(GOOGLE_CONFIG.SHEETS.USERS, result.index);
  }

  // متدهای مشابه برای سایر جداول
  async getCustomers(): Promise<SheetRow[]> {
    return this.getSheetData(GOOGLE_CONFIG.SHEETS.CUSTOMERS);
  }

  async addCustomer(customer: SheetRow): Promise<void> {
    customer.id = this.generateId();
    customer.created_at = new Date().toISOString();
    return this.appendRow(GOOGLE_CONFIG.SHEETS.CUSTOMERS, customer);
  }

  async getReceptions(): Promise<SheetRow[]> {
    return this.getSheetData(GOOGLE_CONFIG.SHEETS.RECEPTIONS);
  }

  async addReception(reception: SheetRow): Promise<void> {
    reception.id = this.generateId();
    reception.created_at = new Date().toISOString();
    return this.appendRow(GOOGLE_CONFIG.SHEETS.RECEPTIONS, reception);
  }

  async getTasks(): Promise<SheetRow[]> {
    return this.getSheetData(GOOGLE_CONFIG.SHEETS.TASKS);
  }

  async addTask(task: SheetRow): Promise<void> {
    task.id = this.generateId();
    task.created_at = new Date().toISOString();
    task.updated_at = new Date().toISOString();
    return this.appendRow(GOOGLE_CONFIG.SHEETS.TASKS, task);
  }

  async updateTask(id: string, updates: Partial<SheetRow>): Promise<void> {
    const result = await this.findRowByField(GOOGLE_CONFIG.SHEETS.TASKS, 'id', id);
    if (!result) {
      throw new Error('وظیفه یافت نشد');
    }

    const updatedData = { ...result.row, ...updates, updated_at: new Date().toISOString() };
    return this.updateRow(GOOGLE_CONFIG.SHEETS.TASKS, result.index, updatedData);
  }

  async getMessages(): Promise<SheetRow[]> {
    return this.getSheetData(GOOGLE_CONFIG.SHEETS.MESSAGES);
  }

  async addMessage(message: SheetRow): Promise<void> {
    message.id = this.generateId();
    message.date = new Date().toISOString();
    return this.appendRow(GOOGLE_CONFIG.SHEETS.MESSAGES, message);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export const googleSheetsService = new GoogleSheetsService();