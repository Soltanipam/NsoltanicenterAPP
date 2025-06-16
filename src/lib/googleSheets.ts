import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

class GoogleSheetsService {
  private auth: GoogleAuth | null = null;
  private sheets: any = null;
  private spreadsheetId: string = '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w'; // Your actual spreadsheet ID

  async initialize() {
    try {
      console.log('Initializing Google Sheets service...');
      
      // Load credentials
      const credentials = await this.loadCredentials();
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Test connection
      await this.testConnection();
      
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw new Error(`Google Sheets initialization failed: ${error.message}`);
    }
  }

  private async loadCredentials() {
    try {
      const response = await fetch('/config/credentials.json');
      if (!response.ok) {
        throw new Error(`Credentials file not found. Please ensure credentials.json exists in /config/ directory. Status: ${response.status}`);
      }
      const credentials = await response.json();
      
      // Validate required fields
      const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
      for (const field of requiredFields) {
        if (!credentials[field]) {
          throw new Error(`Missing required field '${field}' in credentials.json`);
        }
      }
      
      return credentials;
    } catch (error) {
      console.error('Failed to load credentials:', error);
      throw error;
    }
  }

  private async testConnection() {
    try {
      // Try to read the spreadsheet metadata to test connection
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'properties.title'
      });
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`Spreadsheet not found. Please check the spreadsheet ID: ${this.spreadsheetId}`);
      } else if (error.code === 403) {
        throw new Error('Permission denied. Please ensure the service account has access to the spreadsheet.');
      }
      throw error;
    }
  }

  // Generic method to read data from any sheet
  async readSheet(sheetName: string, range?: string): Promise<any[]> {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A:Z`;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log(`No data found in sheet: ${sheetName}`);
        return [];
      }

      // Convert rows to objects using first row as headers
      const headers = rows[0];
      const data = rows.slice(1).map((row, index) => {
        const obj: any = {};
        headers.forEach((header: string, headerIndex: number) => {
          obj[header] = row[headerIndex] || '';
        });
        // Add row number for updates/deletes
        obj._rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed
        return obj;
      });

      console.log(`Successfully read ${data.length} records from ${sheetName}`);
      return data;
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      throw new Error(`Failed to read from ${sheetName}: ${error.message}`);
    }
  }

  // Generic method to append data to any sheet
  async appendToSheet(sheetName: string, values: any[]): Promise<any> {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values],
        },
      });

      console.log(`Successfully appended data to ${sheetName}`);
      return response.data;
    } catch (error) {
      console.error(`Error appending to sheet ${sheetName}:`, error);
      throw new Error(`Failed to append to ${sheetName}: ${error.message}`);
    }
  }

  // Generic method to update data in any sheet
  async updateSheet(sheetName: string, range: string, values: any[][]): Promise<any> {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      console.log(`Successfully updated ${sheetName} range ${range}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating sheet ${sheetName}:`, error);
      throw new Error(`Failed to update ${sheetName}: ${error.message}`);
    }
  }

  // User-specific methods
  async getUsers(): Promise<any[]> {
    return this.readSheet('users');
  }

  async getUserByCredentials(username: string, password: string): Promise<any | null> {
    try {
      const users = await this.getUsers();
      // For now, we'll do simple password comparison
      // In production, you should hash passwords
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        console.log(`User found: ${username}`);
      } else {
        console.log(`User not found or invalid credentials: ${username}`);
      }
      
      return user || null;
    } catch (error) {
      console.error('Error getting user by credentials:', error);
      return null;
    }
  }

  async addUser(userData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      userData.username,
      userData.name,
      userData.role,
      userData.job_description || '',
      userData.active ? 'true' : 'false',
      JSON.stringify(userData.permissions || {}),
      JSON.stringify(userData.settings || {}),
      userData.created_at || new Date().toLocaleDateString('fa-IR'),
      userData.updated_at || new Date().toLocaleDateString('fa-IR'),
      userData.email || '',
      userData.auth_user_id || id
    ];
    
    await this.appendToSheet('users', values);
    return { id, ...userData };
  }

  async updateUser(id: string, userData: any): Promise<any> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === id);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Update the user data
    const updatedUser = { 
      ...user, 
      ...userData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    // Convert back to array format for updating
    const values = [
      updatedUser.id,
      updatedUser.username,
      updatedUser.name,
      updatedUser.role,
      updatedUser.job_description || '',
      updatedUser.active ? 'true' : 'false',
      typeof updatedUser.permissions === 'string' ? updatedUser.permissions : JSON.stringify(updatedUser.permissions || {}),
      typeof updatedUser.settings === 'string' ? updatedUser.settings : JSON.stringify(updatedUser.settings || {}),
      updatedUser.created_at,
      updatedUser.updated_at,
      updatedUser.email || '',
      updatedUser.auth_user_id || updatedUser.id
    ];

    await this.updateSheet('users', `A${user._rowNumber}:L${user._rowNumber}`, [values]);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === id);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Clear the row (set all values to empty)
    const emptyValues = new Array(12).fill('');
    await this.updateSheet('users', `A${user._rowNumber}:L${user._rowNumber}`, [emptyValues]);
    console.log(`User ${id} deleted successfully`);
  }

  // Customer-specific methods
  async getCustomers(): Promise<any[]> {
    return this.readSheet('customers');
  }

  async addCustomer(customerData: any): Promise<any> {
    const id = this.generateId();
    const code = customerData.code || this.generateCustomerId();
    
    const values = [
      id,
      code,
      customerData.name,
      customerData.phone,
      customerData.email || '',
      customerData.can_login ? 'true' : 'false',
      customerData.created_at || new Date().toLocaleDateString('fa-IR'),
      customerData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('customers', values);
    return { id, code, ...customerData };
  }

  async updateCustomer(id: string, customerData: any): Promise<any> {
    const customers = await this.getCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedCustomer = { 
      ...customer, 
      ...customerData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedCustomer.id,
      updatedCustomer.code,
      updatedCustomer.name,
      updatedCustomer.phone,
      updatedCustomer.email || '',
      updatedCustomer.can_login ? 'true' : 'false',
      updatedCustomer.created_at,
      updatedCustomer.updated_at
    ];

    await this.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [values]);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    const customers = await this.getCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    const emptyValues = new Array(8).fill('');
    await this.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [emptyValues]);
    console.log(`Customer ${id} deleted successfully`);
  }

  // Reception-specific methods
  async getReceptions(): Promise<any[]> {
    return this.readSheet('receptions');
  }

  async addReception(receptionData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      JSON.stringify(receptionData.customer_info),
      JSON.stringify(receptionData.vehicle_info),
      JSON.stringify(receptionData.service_info),
      receptionData.status || 'pending',
      receptionData.images || '',
      receptionData.documents || '',
      receptionData.billing ? JSON.stringify(receptionData.billing) : '',
      receptionData.completed_at || '',
      receptionData.completed_by || '',
      receptionData.created_at || new Date().toLocaleDateString('fa-IR'),
      receptionData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('receptions', values);
    return { id, ...receptionData };
  }

  async updateReception(id: string, receptionData: any): Promise<any> {
    const receptions = await this.getReceptions();
    const reception = receptions.find(r => r.id === id);
    
    if (!reception) {
      throw new Error('Reception not found');
    }

    const updatedReception = { 
      ...reception, 
      ...receptionData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedReception.id,
      typeof updatedReception.customer_info === 'string' ? updatedReception.customer_info : JSON.stringify(updatedReception.customer_info),
      typeof updatedReception.vehicle_info === 'string' ? updatedReception.vehicle_info : JSON.stringify(updatedReception.vehicle_info),
      typeof updatedReception.service_info === 'string' ? updatedReception.service_info : JSON.stringify(updatedReception.service_info),
      updatedReception.status,
      updatedReception.images || '',
      updatedReception.documents || '',
      updatedReception.billing ? (typeof updatedReception.billing === 'string' ? updatedReception.billing : JSON.stringify(updatedReception.billing)) : '',
      updatedReception.completed_at || '',
      updatedReception.completed_by || '',
      updatedReception.created_at,
      updatedReception.updated_at
    ];

    await this.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [values]);
    return updatedReception;
  }

  async deleteReception(id: string): Promise<void> {
    const receptions = await this.getReceptions();
    const reception = receptions.find(r => r.id === id);
    
    if (!reception) {
      throw new Error('Reception not found');
    }

    const emptyValues = new Array(12).fill('');
    await this.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [emptyValues]);
    console.log(`Reception ${id} deleted successfully`);
  }

  // Task-specific methods
  async getTasks(): Promise<any[]> {
    return this.readSheet('tasks');
  }

  async addTask(taskData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      taskData.title,
      taskData.description || '',
      taskData.status || 'pending',
      taskData.priority || 'medium',
      taskData.assigned_to_id,
      taskData.assigned_to_name,
      taskData.vehicle_id,
      JSON.stringify(taskData.vehicle_info),
      taskData.due_date || '',
      taskData.images || '',
      JSON.stringify(taskData.history || []),
      taskData.created_at || new Date().toLocaleDateString('fa-IR'),
      taskData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('tasks', values);
    return { id, ...taskData };
  }

  async updateTask(id: string, taskData: any): Promise<any> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      throw new Error('Task not found');
    }

    const updatedTask = { 
      ...task, 
      ...taskData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedTask.id,
      updatedTask.title,
      updatedTask.description || '',
      updatedTask.status,
      updatedTask.priority,
      updatedTask.assigned_to_id,
      updatedTask.assigned_to_name,
      updatedTask.vehicle_id,
      typeof updatedTask.vehicle_info === 'string' ? updatedTask.vehicle_info : JSON.stringify(updatedTask.vehicle_info),
      updatedTask.due_date || '',
      updatedTask.images || '',
      typeof updatedTask.history === 'string' ? updatedTask.history : JSON.stringify(updatedTask.history || []),
      updatedTask.created_at,
      updatedTask.updated_at
    ];

    await this.updateSheet('tasks', `A${task._rowNumber}:N${task._rowNumber}`, [values]);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      throw new Error('Task not found');
    }

    const emptyValues = new Array(14).fill('');
    await this.updateSheet('tasks', `A${task._rowNumber}:N${task._rowNumber}`, [emptyValues]);
    console.log(`Task ${id} deleted successfully`);
  }

  // Message-specific methods
  async getMessages(): Promise<any[]> {
    return this.readSheet('messages');
  }

  async addMessage(messageData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      messageData.from_user_id,
      messageData.to_user_id,
      messageData.subject,
      messageData.content,
      messageData.read || 'false',
      messageData.created_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('messages', values);
    return { id, ...messageData };
  }

  async updateMessage(id: string, messageData: any): Promise<any> {
    const messages = await this.getMessages();
    const message = messages.find(m => m.id === id);
    
    if (!message) {
      throw new Error('Message not found');
    }

    const updatedMessage = { ...message, ...messageData };
    
    const values = [
      updatedMessage.id,
      updatedMessage.from_user_id,
      updatedMessage.to_user_id,
      updatedMessage.subject,
      updatedMessage.content,
      updatedMessage.read,
      updatedMessage.created_at
    ];

    await this.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [values]);
    return updatedMessage;
  }

  async deleteMessage(id: string): Promise<void> {
    const messages = await this.getMessages();
    const message = messages.find(m => m.id === id);
    
    if (!message) {
      throw new Error('Message not found');
    }

    const emptyValues = new Array(7).fill('');
    await this.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [emptyValues]);
    console.log(`Message ${id} deleted successfully`);
  }

  // SMS-specific methods
  async getSMSSettings(): Promise<any[]> {
    return this.readSheet('sms_settings');
  }

  async addSMSSettings(settingsData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      settingsData.username || '',
      settingsData.password_hash || '',
      settingsData.from_number || '',
      settingsData.enabled ? 'true' : 'false',
      JSON.stringify(settingsData.templates || []),
      settingsData.created_at || new Date().toLocaleDateString('fa-IR'),
      settingsData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('sms_settings', values);
    return { id, ...settingsData };
  }

  async updateSMSSettings(id: string, settingsData: any): Promise<any> {
    const settings = await this.getSMSSettings();
    const setting = settings.find(s => s.id === id);
    
    if (!setting) {
      throw new Error('SMS settings not found');
    }

    const updatedSettings = { 
      ...setting, 
      ...settingsData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedSettings.id,
      updatedSettings.username || '',
      updatedSettings.password_hash || '',
      updatedSettings.from_number || '',
      updatedSettings.enabled ? 'true' : 'false',
      typeof updatedSettings.templates === 'string' ? updatedSettings.templates : JSON.stringify(updatedSettings.templates || []),
      updatedSettings.created_at,
      updatedSettings.updated_at
    ];

    await this.updateSheet('sms_settings', `A${setting._rowNumber}:H${setting._rowNumber}`, [values]);
    return updatedSettings;
  }

  async getSMSLogs(): Promise<any[]> {
    return this.readSheet('sms_logs');
  }

  async addSMSLog(logData: any): Promise<any> {
    const id = this.generateId();
    const values = [
      id,
      logData.to_number,
      logData.message,
      logData.status,
      logData.template_used || '',
      logData.cost || 0,
      logData.sent_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await this.appendToSheet('sms_logs', values);
    return { id, ...logData };
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private generateCustomerId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const googleSheetsService = new GoogleSheetsService();