// Mock implementation for browser compatibility
// Note: This is a mock service. For production use, implement these operations
// through a backend API that securely handles Google Sheets authentication.

export interface SheetRow {
  [key: string]: string | number | boolean | null;
}

class GoogleSheetsService {
  private spreadsheetId: string;
  private mockData: { [sheetName: string]: SheetRow[] } = {
    users: [],
    customers: [],
    receptions: [],
    tasks: [],
    messages: [],
    sms_settings: [],
    sms_logs: []
  };

  constructor() {
    this.spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';
    console.warn('Google Sheets Service is running in mock mode. Implement backend API for production use.');
  }

  async getSheetData(sheetName: string): Promise<SheetRow[]> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return this.mockData[sheetName] || [];
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async appendRow(sheetName: string, data: SheetRow): Promise<SheetRow> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate ID if not provided
      if (!data.id) {
        data.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      }

      // Initialize sheet if it doesn't exist
      if (!this.mockData[sheetName]) {
        this.mockData[sheetName] = [];
      }

      this.mockData[sheetName].push({ ...data });
      console.log(`Mock: Row appended to ${sheetName}:`, data);
      return data;
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(sheetName: string, id: string, data: Partial<SheetRow>): Promise<SheetRow> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!this.mockData[sheetName]) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const rowIndex = this.mockData[sheetName].findIndex(row => row.id === id);
      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found in sheet ${sheetName}`);
      }

      this.mockData[sheetName][rowIndex] = { ...this.mockData[sheetName][rowIndex], ...data };
      console.log(`Mock: Row updated in ${sheetName}:`, this.mockData[sheetName][rowIndex]);
      return this.mockData[sheetName][rowIndex];
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async deleteRow(sheetName: string, id: string): Promise<void> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!this.mockData[sheetName]) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const rowIndex = this.mockData[sheetName].findIndex(row => row.id === id);
      if (rowIndex === -1) {
        throw new Error(`Row with id ${id} not found in sheet ${sheetName}`);
      }

      this.mockData[sheetName].splice(rowIndex, 1);
      console.log(`Mock: Row deleted from ${sheetName}`);
    } catch (error) {
      console.error(`Error deleting row from sheet ${sheetName}:`, error);
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