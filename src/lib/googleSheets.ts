import { GoogleAuth } from 'google-auth-library';
import { sheets_v4, google } from 'googleapis';

interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private auth: GoogleAuth;
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor() {
    // Load credentials from the credentials.json file
    this.auth = new GoogleAuth({
      keyFile: '/src/config/credentials.json',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.VITE_GOOGLE_SPREADSHEET_ID || '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';
  }

  // خواندن تمام سطرها از شیت خاص
  async getAllRows(sheetName: string): Promise<SheetRow[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const [headers, ...dataRows] = rows;
      return dataRows.map(row => {
        const rowData: SheetRow = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || null;
        });
        return rowData;
      });
    } catch (error) {
      console.error(`خطا در خواندن داده‌های شیت ${sheetName}:`, error);
      throw new Error(`خطا در ارتباط با گوگل: ${error}`);
    }
  }

  // افزودن سطر جدید به شیت
  async addRow(sheetName: string, data: SheetRow): Promise<SheetRow> {
    try {
      // ابتدا هدرها را بگیریم
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`,
      });

      const headers = headersResponse.data.values?.[0] || [];
      
      // داده‌ها را بر اساس ترتیب هدرها مرتب کنیم
      const values = headers.map(header => data[header] || '');
      
      // ID منحصر به فرد تولید کنیم
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      values[0] = id; // فرض می‌کنیم ستون اول ID است

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });

      return { ...data, id };
    } catch (error) {
      console.error(`خطا در افزودن سطر به شیت ${sheetName}:`, error);
      throw new Error(`خطا در ارتباط با گوگل: ${error}`);
    }
  }

  // به‌روزرسانی سطر مشخص بر اساس ID
  async updateRow(sheetName: string, id: string, data: Partial<SheetRow>): Promise<SheetRow> {
    try {
      // ابتدا سطر مورد نظر را پیدا کنیم
      const allRows = await this.getAllRows(sheetName);
      const rowIndex = allRows.findIndex(row => row.id === id);
      
      if (rowIndex === -1) {
        throw new Error(`سطر با ID ${id} یافت نشد`);
      }

      // هدرها را بگیریم
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`,
      });

      const headers = headersResponse.data.values?.[0] || [];
      const updatedRow = { ...allRows[rowIndex], ...data };
      const values = headers.map(header => updatedRow[header] || '');

      // سطر را به‌روزرسانی کنیم (rowIndex + 2 چون از سطر 1 شروع می‌شود و سطر 1 هدر است)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });

      return updatedRow;
    } catch (error) {
      console.error(`خطا در به‌روزرسانی سطر در شیت ${sheetName}:`, error);
      throw new Error(`خطا در ارتباط با گوگل: ${error}`);
    }
  }

  // حذف سطر
  async deleteRow(sheetName: string, id: string): Promise<void> {
    try {
      // ابتدا سطر مورد نظر را پیدا کنیم
      const allRows = await this.getAllRows(sheetName);
      const rowIndex = allRows.findIndex(row => row.id === id);
      
      if (rowIndex === -1) {
        throw new Error(`سطر با ID ${id} یافت نشد`);
      }

      // سطر را حذف کنیم (rowIndex + 2 چون از سطر 1 شروع می‌شود و سطر 1 هدر است)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0, // فرض می‌کنیم شیت اول است
                  dimension: 'ROWS',
                  startIndex: rowIndex + 1,
                  endIndex: rowIndex + 2,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error(`خطا در حذف سطر از شیت ${sheetName}:`, error);
      throw new Error(`خطا در ارتباط با گوگل: ${error}`);
    }
  }

  // متدهای مخصوص هر جدول
  async getUsers(): Promise<SheetRow[]> {
    return this.getAllRows('users');
  }

  async addUser(user: SheetRow): Promise<SheetRow> {
    user.created_at = new Date().toLocaleDateString('fa-IR');
    user.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('users', user);
  }

  async updateUser(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('users', id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    return this.deleteRow('users', id);
  }

  async getCustomers(): Promise<SheetRow[]> {
    return this.getAllRows('customers');
  }

  async addCustomer(customer: SheetRow): Promise<SheetRow> {
    customer.created_at = new Date().toLocaleDateString('fa-IR');
    customer.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('customers', customer);
  }

  async updateCustomer(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('customers', id, updates);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.deleteRow('customers', id);
  }

  async getReceptions(): Promise<SheetRow[]> {
    return this.getAllRows('receptions');
  }

  async addReception(reception: SheetRow): Promise<SheetRow> {
    reception.created_at = new Date().toLocaleDateString('fa-IR');
    reception.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('receptions', reception);
  }

  async updateReception(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('receptions', id, updates);
  }

  async deleteReception(id: string): Promise<void> {
    return this.deleteRow('receptions', id);
  }

  async getTasks(): Promise<SheetRow[]> {
    return this.getAllRows('tasks');
  }

  async addTask(task: SheetRow): Promise<SheetRow> {
    task.created_at = new Date().toLocaleDateString('fa-IR');
    task.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('tasks', task);
  }

  async updateTask(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('tasks', id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    return this.deleteRow('tasks', id);
  }

  async getMessages(): Promise<SheetRow[]> {
    return this.getAllRows('messages');
  }

  async addMessage(message: SheetRow): Promise<SheetRow> {
    message.created_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('messages', message);
  }

  async updateMessage(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    return this.updateRow('messages', id, updates);
  }

  async deleteMessage(id: string): Promise<void> {
    return this.deleteRow('messages', id);
  }

  async getSMSSettings(): Promise<SheetRow[]> {
    return this.getAllRows('sms_settings');
  }

  async addSMSSettings(settings: SheetRow): Promise<SheetRow> {
    settings.created_at = new Date().toLocaleDateString('fa-IR');
    settings.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('sms_settings', settings);
  }

  async updateSMSSettings(id: string, updates: Partial<SheetRow>): Promise<SheetRow> {
    updates.updated_at = new Date().toLocaleDateString('fa-IR');
    return this.updateRow('sms_settings', id, updates);
  }

  async getSMSLogs(): Promise<SheetRow[]> {
    return this.getAllRows('sms_logs');
  }

  async addSMSLog(log: SheetRow): Promise<SheetRow> {
    log.sent_at = new Date().toLocaleDateString('fa-IR');
    return this.addRow('sms_logs', log);
  }
}

export const googleSheetsService = new GoogleSheetsService();