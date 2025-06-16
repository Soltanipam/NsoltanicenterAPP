import { google } from 'googleapis';

interface GoogleSheetsConfig {
  spreadsheetId: string;
  credentials: any;
}

class GoogleSheetsService {
  private auth: any;
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = '1your-spreadsheet-id-here'; // Will be configured
  }

  async initialize() {
    try {
      // Load credentials from the config file
      const credentials = await this.loadCredentials();
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  private async loadCredentials() {
    try {
      // In a real environment, you would load from /config/credentials.json
      // For now, we'll use environment variables or a mock
      const response = await fetch('/config/credentials.json');
      if (!response.ok) {
        throw new Error('Credentials file not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load credentials:', error);
      // Fallback to mock credentials for development
      return {
        type: "service_account",
        project_id: "your-project-id",
        private_key_id: "your-private-key-id",
        private_key: "your-private-key",
        client_email: "your-service-account@your-project.iam.gserviceaccount.com",
        client_id: "your-client-id",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token"
      };
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
        return [];
      }

      // Convert rows to objects using first row as headers
      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      throw error;
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

      return response.data;
    } catch (error) {
      console.error(`Error appending to sheet ${sheetName}:`, error);
      throw error;
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

      return response.data;
    } catch (error) {
      console.error(`Error updating sheet ${sheetName}:`, error);
      throw error;
    }
  }

  // User-specific methods
  async getUsers(): Promise<any[]> {
    return this.readSheet('users');
  }

  async getUserByCredentials(username: string, password: string): Promise<any | null> {
    try {
      const users = await this.getUsers();
      const user = users.find(u => u.username === username && u.password === password);
      return user || null;
    } catch (error) {
      console.error('Error getting user by credentials:', error);
      return null;
    }
  }

  async addUser(userData: any): Promise<any> {
    const values = [
      userData.id || this.generateId(),
      userData.username,
      userData.name,
      userData.role,
      userData.job_description || '',
      userData.active ? 'true' : 'false',
      JSON.stringify(userData.permissions || {}),
      JSON.stringify(userData.settings || {}),
      userData.created_at || new Date().toISOString(),
      userData.updated_at || new Date().toISOString(),
      userData.email || '',
      userData.auth_user_id || ''
    ];
    
    await this.appendToSheet('users', values);
    return { id: values[0], ...userData };
  }

  async updateUser(id: string, userData: any): Promise<any> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Update the user data
    const updatedUser = { ...users[userIndex], ...userData, updated_at: new Date().toISOString() };
    
    // Convert back to array format for updating
    const values = [
      updatedUser.id,
      updatedUser.username,
      updatedUser.name,
      updatedUser.role,
      updatedUser.job_description || '',
      updatedUser.active ? 'true' : 'false',
      JSON.stringify(updatedUser.permissions || {}),
      JSON.stringify(updatedUser.settings || {}),
      updatedUser.created_at,
      updatedUser.updated_at,
      updatedUser.email || '',
      updatedUser.auth_user_id || ''
    ];

    await this.updateSheet('users', `A${userIndex + 2}:L${userIndex + 2}`, [values]);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    // Implementation for deleting user
    // This would involve finding the row and clearing it or shifting rows up
    console.log('Delete user:', id);
  }

  // Customer-specific methods
  async getCustomers(): Promise<any[]> {
    return this.readSheet('customers');
  }

  async addCustomer(customerData: any): Promise<any> {
    const values = [
      customerData.id || this.generateId(),
      customerData.customer_id || this.generateCustomerId(),
      customerData.first_name,
      customerData.last_name,
      customerData.phone,
      customerData.password_hash || '',
      customerData.created_at || new Date().toISOString(),
      customerData.updated_at || new Date().toISOString(),
      customerData.email || '',
      customerData.can_login ? 'true' : 'false'
    ];
    
    await this.appendToSheet('customers', values);
    return { id: values[0], ...customerData };
  }

  async updateCustomer(id: string, customerData: any): Promise<any> {
    const customers = await this.getCustomers();
    const customerIndex = customers.findIndex(c => c.id === id);
    
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    const updatedCustomer = { ...customers[customerIndex], ...customerData, updated_at: new Date().toISOString() };
    
    const values = [
      updatedCustomer.id,
      updatedCustomer.customer_id,
      updatedCustomer.first_name,
      updatedCustomer.last_name,
      updatedCustomer.phone,
      updatedCustomer.password_hash || '',
      updatedCustomer.created_at,
      updatedCustomer.updated_at,
      updatedCustomer.email || '',
      updatedCustomer.can_login ? 'true' : 'false'
    ];

    await this.updateSheet('customers', `A${customerIndex + 2}:J${customerIndex + 2}`, [values]);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    console.log('Delete customer:', id);
  }

  // Reception-specific methods
  async getReceptions(): Promise<any[]> {
    return this.readSheet('receptions');
  }

  async addReception(receptionData: any): Promise<any> {
    const values = [
      receptionData.id || this.generateId(),
      JSON.stringify(receptionData.customer_info),
      JSON.stringify(receptionData.vehicle_info),
      JSON.stringify(receptionData.service_info),
      receptionData.status || 'pending',
      receptionData.images || '',
      receptionData.documents || '',
      receptionData.billing ? JSON.stringify(receptionData.billing) : '',
      receptionData.completed_at || '',
      receptionData.completed_by || '',
      receptionData.created_at || new Date().toISOString(),
      receptionData.updated_at || new Date().toISOString()
    ];
    
    await this.appendToSheet('receptions', values);
    return { id: values[0], ...receptionData };
  }

  async updateReception(id: string, receptionData: any): Promise<any> {
    const receptions = await this.getReceptions();
    const receptionIndex = receptions.findIndex(r => r.id === id);
    
    if (receptionIndex === -1) {
      throw new Error('Reception not found');
    }

    const updatedReception = { ...receptions[receptionIndex], ...receptionData, updated_at: new Date().toISOString() };
    
    const values = [
      updatedReception.id,
      JSON.stringify(updatedReception.customer_info),
      JSON.stringify(updatedReception.vehicle_info),
      JSON.stringify(updatedReception.service_info),
      updatedReception.status,
      updatedReception.images || '',
      updatedReception.documents || '',
      updatedReception.billing ? JSON.stringify(updatedReception.billing) : '',
      updatedReception.completed_at || '',
      updatedReception.completed_by || '',
      updatedReception.created_at,
      updatedReception.updated_at
    ];

    await this.updateSheet('receptions', `A${receptionIndex + 2}:L${receptionIndex + 2}`, [values]);
    return updatedReception;
  }

  async deleteReception(id: string): Promise<void> {
    console.log('Delete reception:', id);
  }

  // Task-specific methods
  async getTasks(): Promise<any[]> {
    return this.readSheet('tasks');
  }

  async addTask(taskData: any): Promise<any> {
    const values = [
      taskData.id || this.generateId(),
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
      taskData.created_at || new Date().toISOString(),
      taskData.updated_at || new Date().toISOString()
    ];
    
    await this.appendToSheet('tasks', values);
    return { id: values[0], ...taskData };
  }

  async updateTask(id: string, taskData: any): Promise<any> {
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const updatedTask = { ...tasks[taskIndex], ...taskData, updated_at: new Date().toISOString() };
    
    const values = [
      updatedTask.id,
      updatedTask.title,
      updatedTask.description || '',
      updatedTask.status,
      updatedTask.priority,
      updatedTask.assigned_to_id,
      updatedTask.assigned_to_name,
      updatedTask.vehicle_id,
      JSON.stringify(updatedTask.vehicle_info),
      updatedTask.due_date || '',
      updatedTask.images || '',
      JSON.stringify(updatedTask.history || []),
      updatedTask.created_at,
      updatedTask.updated_at
    ];

    await this.updateSheet('tasks', `A${taskIndex + 2}:N${taskIndex + 2}`, [values]);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    console.log('Delete task:', id);
  }

  // Message-specific methods
  async getMessages(): Promise<any[]> {
    return this.readSheet('messages');
  }

  async addMessage(messageData: any): Promise<any> {
    const values = [
      messageData.id || this.generateId(),
      messageData.from_user_id,
      messageData.to_user_id,
      messageData.subject,
      messageData.content,
      messageData.read || 'false',
      messageData.created_at || new Date().toISOString()
    ];
    
    await this.appendToSheet('messages', values);
    return { id: values[0], ...messageData };
  }

  async updateMessage(id: string, messageData: any): Promise<any> {
    const messages = await this.getMessages();
    const messageIndex = messages.findIndex(m => m.id === id);
    
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const updatedMessage = { ...messages[messageIndex], ...messageData };
    
    const values = [
      updatedMessage.id,
      updatedMessage.from_user_id,
      updatedMessage.to_user_id,
      updatedMessage.subject,
      updatedMessage.content,
      updatedMessage.read,
      updatedMessage.created_at
    ];

    await this.updateSheet('messages', `A${messageIndex + 2}:G${messageIndex + 2}`, [values]);
    return updatedMessage;
  }

  async deleteMessage(id: string): Promise<void> {
    console.log('Delete message:', id);
  }

  // SMS-specific methods
  async getSMSSettings(): Promise<any[]> {
    return this.readSheet('sms_settings');
  }

  async addSMSSettings(settingsData: any): Promise<any> {
    const values = [
      settingsData.id || this.generateId(),
      settingsData.username || '',
      settingsData.password_hash || '',
      settingsData.from_number || '',
      settingsData.enabled ? 'true' : 'false',
      JSON.stringify(settingsData.templates || []),
      settingsData.created_at || new Date().toISOString(),
      settingsData.updated_at || new Date().toISOString()
    ];
    
    await this.appendToSheet('sms_settings', values);
    return { id: values[0], ...settingsData };
  }

  async updateSMSSettings(id: string, settingsData: any): Promise<any> {
    const settings = await this.getSMSSettings();
    const settingsIndex = settings.findIndex(s => s.id === id);
    
    if (settingsIndex === -1) {
      throw new Error('SMS settings not found');
    }

    const updatedSettings = { ...settings[settingsIndex], ...settingsData, updated_at: new Date().toISOString() };
    
    const values = [
      updatedSettings.id,
      updatedSettings.username || '',
      updatedSettings.password_hash || '',
      updatedSettings.from_number || '',
      updatedSettings.enabled ? 'true' : 'false',
      JSON.stringify(updatedSettings.templates || []),
      updatedSettings.created_at,
      updatedSettings.updated_at
    ];

    await this.updateSheet('sms_settings', `A${settingsIndex + 2}:H${settingsIndex + 2}`, [values]);
    return updatedSettings;
  }

  async getSMSLogs(): Promise<any[]> {
    return this.readSheet('sms_logs');
  }

  async addSMSLog(logData: any): Promise<any> {
    const values = [
      logData.id || this.generateId(),
      logData.to_number,
      logData.message,
      logData.status,
      logData.template_used || '',
      logData.cost || 0,
      logData.sent_at || new Date().toISOString()
    ];
    
    await this.appendToSheet('sms_logs', values);
    return { id: values[0], ...logData };
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