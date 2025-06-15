import { google } from 'googleapis';
import credentials from '../config/credentials.json';

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;
  private isInitialized = false;

  constructor() {
    this.spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if credentials file exists and is valid
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('فایل احراز هویت یافت نشد یا معتبر نیست');
      }

      if (!this.spreadsheetId) {
        throw new Error('شناسه Google Sheets تنظیم نشده است. لطفاً VITE_GOOGLE_SPREADSHEET_ID را در فایل .env تنظیم کنید.');
      }

      // Create JWT client
      const auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Authorize the client
      await auth.authorize();

      // Create sheets API instance
      this.sheets = google.sheets({ version: 'v4', auth });
      this.isInitialized = true;

      console.log('Google Sheets Service Account authentication successful');
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw error;
    }
  }

  async getSheetData(sheetName: string): Promise<SheetRow[]> {
    try {
      await this.initialize();

      const range = `${sheetName}!A:Z`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      if (!response.data.values || response.data.values.length === 0) {
        return [];
      }

      const [headers, ...rows] = response.data.values;
      
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
      await this.initialize();

      // First, get the headers to know the column order
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`,
      });

      if (!headersResponse.data.values || headersResponse.data.values.length === 0) {
        throw new Error(`Headers not found for sheet ${sheetName}`);
      }

      const headers = headersResponse.data.values[0];
      
      // Generate ID if not provided
      if (!data.id) {
        data.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      }

      // Create row data in the correct order
      const rowData = headers.map((header: string) => data[header] || '');

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });

      console.log(`Row appended to ${sheetName}:`, response.data);
      return data;
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName: string, id: string, data: Partial<SheetRow>): Promise<SheetRow> {
    try {
      await this.initialize();

      // Get all data to find the row
      const allData = await this.getSheetData(sheetName);
      const rowIndex = allData.findIndex(row => row.id === id);

      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found in sheet ${sheetName}`);
      }

      // Get headers
      const headersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!1:1`,
      });

      const headers = headersResponse.data.values[0];
      const actualRowIndex = rowIndex + 2; // +1 for 0-based index, +1 for header row

      // Update specific cells
      const updates = [];
      for (const [key, value] of Object.entries(data)) {
        const columnIndex = headers.indexOf(key);
        if (columnIndex !== -1) {
          const columnLetter = String.fromCharCode(65 + columnIndex); // A, B, C, etc.
          updates.push({
            range: `${sheetName}!${columnLetter}${actualRowIndex}`,
            values: [[value]],
          });
        }
      }

      // Batch update
      if (updates.length > 0) {
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates,
          },
        });
      }

      return { ...allData[rowIndex], ...data };
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    try {
      await this.initialize();

      // Get all data to find the row
      const allData = await this.getSheetData(sheetName);
      const rowIndex = allData.findIndex(row => row.id === id);

      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found in sheet ${sheetName}`);
      }

      const actualRowIndex = rowIndex + 1; // +1 for header row (0-based to 1-based)

      // Delete the row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  dimension: 'ROWS',
                  startIndex: actualRowIndex,
                  endIndex: actualRowIndex + 1,
                },
              },
            },
          ],
        },
      });

      console.log(`Row deleted from ${sheetName}`);
    } catch (error) {
      console.error(`Error deleting row from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  private async getSheetId(sheetName: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = response.data.sheets.find((s: any) => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      return sheet.properties.sheetId;
    } catch (error) {
      console.error(`Error getting sheet ID for ${sheetName}:`, error);
      throw error;
    }
  }

  // Specific methods for each table
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