// Client-side API service for making requests to server-side APIs
class APIClient {
  private baseURL: string;

  constructor() {
    // Use /api for all environments - Vite proxy will handle dev routing
    this.baseURL = '/api';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async checkConnection() {
    return this.request('/auth/check-connection');
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async createCustomer(customerData: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Receptions
  async getReceptions() {
    return this.request('/receptions');
  }

  async createReception(receptionData: any) {
    return this.request('/receptions', {
      method: 'POST',
      body: JSON.stringify(receptionData),
    });
  }

  async updateReception(id: string, receptionData: any) {
    return this.request(`/receptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(receptionData),
    });
  }

  async deleteReception(id: string) {
    return this.request(`/receptions/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks() {
    return this.request('/tasks');
  }

  async createTask(taskData: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: string, taskData: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async getMessages() {
    return this.request('/messages');
  }

  async createMessage(messageData: any) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async updateMessage(id: string, messageData: any) {
    return this.request(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(messageData),
    });
  }

  async deleteMessage(id: string) {
    return this.request(`/messages/${id}`, {
      method: 'DELETE',
    });
  }

  // File uploads
  async uploadFile(file: File, folderName?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folderName) {
      formData.append('folderName', folderName);
    }

    return fetch(`${this.baseURL}/upload/file`, {
      method: 'POST',
      body: formData,
    }).then(response => response.json());
  }

  async uploadMultipleFiles(files: File[], folderName?: string) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (folderName) {
      formData.append('folderName', folderName);
    }

    return fetch(`${this.baseURL}/upload/files`, {
      method: 'POST',
      body: formData,
    }).then(response => response.json());
  }

  async deleteFile(fileId: string) {
    return this.request(`/upload/file/${fileId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new APIClient();