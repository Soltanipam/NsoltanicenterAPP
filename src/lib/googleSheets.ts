// Client-side wrapper for Google Sheets operations
import { apiClient } from '../services/apiClient';

class GoogleSheetsService {
  async initialize() {
    try {
      const result = await apiClient.checkConnection();
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect to Google Sheets');
      }
      console.log('Google Sheets service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  // User methods
  async getUsers() {
    const result = await apiClient.getUsers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get users');
    }
    return result.data;
  }

  async getUserByCredentials(username: string, password: string) {
    const result = await apiClient.login(username, password);
    return result.success ? result.user : null;
  }

  async addUser(userData: any) {
    const result = await apiClient.createUser(userData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }
    return result.data;
  }

  async updateUser(id: string, userData: any) {
    const result = await apiClient.updateUser(id, userData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update user');
    }
    return result.data;
  }

  async deleteUser(id: string) {
    const result = await apiClient.deleteUser(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete user');
    }
  }

  // Customer methods
  async getCustomers() {
    const result = await apiClient.getCustomers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get customers');
    }
    return result.data;
  }

  async addCustomer(customerData: any) {
    const result = await apiClient.createCustomer(customerData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create customer');
    }
    return result.data;
  }

  async updateCustomer(id: string, customerData: any) {
    const result = await apiClient.updateCustomer(id, customerData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update customer');
    }
    return result.data;
  }

  async deleteCustomer(id: string) {
    const result = await apiClient.deleteCustomer(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete customer');
    }
  }

  // Reception methods
  async getReceptions() {
    const result = await apiClient.getReceptions();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get receptions');
    }
    return result.data;
  }

  async addReception(receptionData: any) {
    const result = await apiClient.createReception(receptionData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create reception');
    }
    return result.data;
  }

  async updateReception(id: string, receptionData: any) {
    const result = await apiClient.updateReception(id, receptionData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update reception');
    }
    return result.data;
  }

  async deleteReception(id: string) {
    const result = await apiClient.deleteReception(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete reception');
    }
  }

  // Task methods
  async getTasks() {
    const result = await apiClient.getTasks();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get tasks');
    }
    return result.data;
  }

  async addTask(taskData: any) {
    const result = await apiClient.createTask(taskData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create task');
    }
    return result.data;
  }

  async updateTask(id: string, taskData: any) {
    const result = await apiClient.updateTask(id, taskData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update task');
    }
    return result.data;
  }

  async deleteTask(id: string) {
    const result = await apiClient.deleteTask(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete task');
    }
  }

  // Message methods
  async getMessages() {
    const result = await apiClient.getMessages();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get messages');
    }
    return result.data;
  }

  async addMessage(messageData: any) {
    const result = await apiClient.createMessage(messageData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create message');
    }
    return result.data;
  }

  async updateMessage(id: string, messageData: any) {
    const result = await apiClient.updateMessage(id, messageData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update message');
    }
    return result.data;
  }

  async deleteMessage(id: string) {
    const result = await apiClient.deleteMessage(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete message');
    }
  }

  // SMS methods
  async getSMSSettings() {
    // Implement SMS settings API calls
    return [];
  }

  async addSMSSettings(settingsData: any) {
    // Implement SMS settings creation
    return settingsData;
  }

  async updateSMSSettings(id: string, settingsData: any) {
    // Implement SMS settings update
    return settingsData;
  }

  async getSMSLogs() {
    // Implement SMS logs API calls
    return [];
  }

  async addSMSLog(logData: any) {
    // Implement SMS log creation
    return logData;
  }
}

export const googleSheetsService = new GoogleSheetsService();