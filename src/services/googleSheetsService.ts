import { googleAuth } from '../config/googleAuth';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  jobDescription?: string;
  active: boolean;
  permissions: any;
  auth_user_id?: string;
}

export interface Customer {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  canLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reception {
  id: string;
  customerInfo: any;
  vehicleInfo: any;
  serviceInfo: any;
  status: string;
  images?: string[];
  documents?: string[];
  billing?: any;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: {
    id: string;
    name: string;
  };
  vehicle: any;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  images?: string[];
  history: any[];
}

export interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  createdAt: string;
  read: boolean;
}

const SPREADSHEET_ID = '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';

class GoogleSheetsService {
  private async getSheets() {
    const auth = await googleAuth.getAuthClient();
    const { google } = await import('googleapis');
    return google.sheets({ version: 'v4', auth });
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'users!A:H',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return []; // No data or only headers

      return rows.slice(1).map((row, index) => ({
        id: row[0] || `user_${index}`,
        username: row[1] || '',
        name: row[2] || '',
        email: row[3] || '',
        role: row[4] || 'technician',
        jobDescription: row[5] || '',
        active: row[6] !== 'false',
        permissions: row[7] ? JSON.parse(row[7]) : {},
        auth_user_id: row[8] || null
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async addUser(user: Omit<User, 'id'> & { password?: string }): Promise<User> {
    try {
      const sheets = await this.getSheets();
      const id = `user_${Date.now()}`;
      
      const newUser: User = {
        id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        jobDescription: user.jobDescription,
        active: user.active,
        permissions: user.permissions,
        auth_user_id: user.auth_user_id
      };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'users!A:I',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newUser.id,
            newUser.username,
            newUser.name,
            newUser.email,
            newUser.role,
            newUser.jobDescription || '',
            newUser.active.toString(),
            JSON.stringify(newUser.permissions),
            newUser.auth_user_id || ''
          ]]
        }
      });

      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const updatedUser = { ...users[userIndex], ...updates };
      const sheets = await this.getSheets();

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `users!A${userIndex + 2}:I${userIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            updatedUser.id,
            updatedUser.username,
            updatedUser.name,
            updatedUser.email,
            updatedUser.role,
            updatedUser.jobDescription || '',
            updatedUser.active.toString(),
            JSON.stringify(updatedUser.permissions),
            updatedUser.auth_user_id || ''
          ]]
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const sheets = await this.getSheets();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming users is the first sheet
                dimension: 'ROWS',
                startIndex: userIndex + 1,
                endIndex: userIndex + 2
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Customers methods
  async getCustomers(): Promise<Customer[]> {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'customers!A:H',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      return rows.slice(1).map((row, index) => ({
        id: row[0] || `customer_${index}`,
        customerId: row[1] || '',
        firstName: row[2] || '',
        lastName: row[3] || '',
        phone: row[4] || '',
        email: row[5] || '',
        canLogin: row[6] !== 'false',
        createdAt: row[7] || new Date().toLocaleDateString('fa-IR'),
        updatedAt: row[7] || new Date().toLocaleDateString('fa-IR')
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    try {
      const sheets = await this.getSheets();
      const id = `customer_${Date.now()}`;
      const customerId = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date().toLocaleDateString('fa-IR');
      
      const newCustomer: Customer = {
        id,
        customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        canLogin: customer.canLogin,
        createdAt: now,
        updatedAt: now
      };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'customers!A:H',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newCustomer.id,
            newCustomer.customerId,
            newCustomer.firstName,
            newCustomer.lastName,
            newCustomer.phone,
            newCustomer.email || '',
            newCustomer.canLogin.toString(),
            newCustomer.createdAt
          ]]
        }
      });

      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const customerIndex = customers.findIndex(c => c.id === id);
      
      if (customerIndex === -1) {
        throw new Error('Customer not found');
      }

      const updatedCustomer = { 
        ...customers[customerIndex], 
        ...updates,
        updatedAt: new Date().toLocaleDateString('fa-IR')
      };
      
      const sheets = await this.getSheets();

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `customers!A${customerIndex + 2}:H${customerIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            updatedCustomer.id,
            updatedCustomer.customerId,
            updatedCustomer.firstName,
            updatedCustomer.lastName,
            updatedCustomer.phone,
            updatedCustomer.email || '',
            updatedCustomer.canLogin.toString(),
            updatedCustomer.updatedAt
          ]]
        }
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const customerIndex = customers.findIndex(c => c.id === id);
      
      if (customerIndex === -1) {
        throw new Error('Customer not found');
      }

      const sheets = await this.getSheets();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 1, // Assuming customers is the second sheet
                dimension: 'ROWS',
                startIndex: customerIndex + 1,
                endIndex: customerIndex + 2
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Tasks methods
  async getTasks(): Promise<Task[]> {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'tasks!A:L',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      return rows.slice(1).map((row, index) => ({
        id: row[0] || `task_${index}`,
        title: row[1] || '',
        description: row[2] || '',
        status: row[3] || 'pending',
        priority: row[4] || 'medium',
        assignedTo: {
          id: row[5] || '',
          name: row[6] || ''
        },
        vehicle: row[7] ? JSON.parse(row[7]) : {},
        createdAt: row[8] || new Date().toLocaleDateString('fa-IR'),
        updatedAt: row[9] || new Date().toLocaleDateString('fa-IR'),
        dueDate: row[10] || '',
        images: row[11] ? JSON.parse(row[11]) : [],
        history: row[12] ? JSON.parse(row[12]) : []
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Promise<Task> {
    try {
      const sheets = await this.getSheets();
      const id = `task_${Date.now()}`;
      const now = new Date().toLocaleDateString('fa-IR');
      
      const newTask: Task = {
        id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        vehicle: task.vehicle,
        createdAt: now,
        updatedAt: now,
        dueDate: task.dueDate,
        images: task.images || [],
        history: [{
          date: now,
          status: 'pending',
          description: 'وظیفه ایجاد شد',
          updatedBy: task.assignedTo.name
        }]
      };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'tasks!A:M',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newTask.id,
            newTask.title,
            newTask.description,
            newTask.status,
            newTask.priority,
            newTask.assignedTo.id,
            newTask.assignedTo.name,
            JSON.stringify(newTask.vehicle),
            newTask.createdAt,
            newTask.updatedAt,
            newTask.dueDate,
            JSON.stringify(newTask.images),
            JSON.stringify(newTask.history)
          ]]
        }
      });

      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>, updatedBy: string): Promise<boolean> {
    try {
      const tasks = await this.getTasks();
      const taskIndex = tasks.findIndex(t => t.id === id);
      
      if (taskIndex === -1) {
        return false;
      }

      const currentTask = tasks[taskIndex];
      const history = [...currentTask.history];
      
      if (updates.status && updates.status !== currentTask.status) {
        history.push({
          date: new Date().toLocaleDateString('fa-IR'),
          status: updates.status,
          description: `وضعیت به ${
            updates.status === 'pending' ? 'در انتظار' :
            updates.status === 'in-progress' ? 'در حال انجام' :
            'تکمیل شده'
          } تغییر کرد`,
          updatedBy
        });
      }

      const updatedTask = { 
        ...currentTask, 
        ...updates,
        history,
        updatedAt: new Date().toLocaleDateString('fa-IR')
      };
      
      const sheets = await this.getSheets();

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `tasks!A${taskIndex + 2}:M${taskIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            updatedTask.id,
            updatedTask.title,
            updatedTask.description,
            updatedTask.status,
            updatedTask.priority,
            updatedTask.assignedTo.id,
            updatedTask.assignedTo.name,
            JSON.stringify(updatedTask.vehicle),
            updatedTask.createdAt,
            updatedTask.updatedAt,
            updatedTask.dueDate,
            JSON.stringify(updatedTask.images),
            JSON.stringify(updatedTask.history)
          ]]
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const taskIndex = tasks.findIndex(t => t.id === id);
      
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const sheets = await this.getSheets();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 3, // Assuming tasks is the fourth sheet
                dimension: 'ROWS',
                startIndex: taskIndex + 1,
                endIndex: taskIndex + 2
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Messages methods
  async getMessages(): Promise<Message[]> {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'messages!A:G',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      return rows.slice(1).map((row, index) => ({
        id: row[0] || `message_${index}`,
        from: row[1] || '',
        to: row[2] || '',
        subject: row[3] || '',
        content: row[4] || '',
        createdAt: row[5] || new Date().toLocaleDateString('fa-IR'),
        read: row[6] === 'true'
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async addMessage(message: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
    try {
      const sheets = await this.getSheets();
      const id = `message_${Date.now()}`;
      const now = new Date().toLocaleDateString('fa-IR');
      
      const newMessage: Message = {
        id,
        from: message.from,
        to: message.to,
        subject: message.subject,
        content: message.content,
        createdAt: now,
        read: false
      };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'messages!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newMessage.id,
            newMessage.from,
            newMessage.to,
            newMessage.subject,
            newMessage.content,
            newMessage.createdAt,
            newMessage.read.toString()
          ]]
        }
      });

      return newMessage;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async markMessageAsRead(id: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(m => m.id === id);
      
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      const message = messages[messageIndex];
      const sheets = await this.getSheets();

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `messages!G${messageIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['true']]
        }
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const messageIndex = messages.findIndex(m => m.id === id);
      
      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      const sheets = await this.getSheets();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 4, // Assuming messages is the fifth sheet
                dimension: 'ROWS',
                startIndex: messageIndex + 1,
                endIndex: messageIndex + 2
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Receptions methods
  async getReceptions(): Promise<Reception[]> {
    try {
      const sheets = await this.getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'receptions!A:J',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      return rows.slice(1).map((row, index) => ({
        id: row[0] || `reception_${index}`,
        customerInfo: row[1] ? JSON.parse(row[1]) : {},
        vehicleInfo: row[2] ? JSON.parse(row[2]) : {},
        serviceInfo: row[3] ? JSON.parse(row[3]) : {},
        status: row[4] || 'pending',
        images: row[5] ? JSON.parse(row[5]) : [],
        documents: row[6] ? JSON.parse(row[6]) : [],
        billing: row[7] ? JSON.parse(row[7]) : null,
        completedAt: row[8] || '',
        completedBy: row[9] || '',
        createdAt: row[10] || new Date().toLocaleDateString('fa-IR')
      }));
    } catch (error) {
      console.error('Error fetching receptions:', error);
      return [];
    }
  }

  async addReception(reception: Omit<Reception, 'id' | 'createdAt'>): Promise<Reception> {
    try {
      const sheets = await this.getSheets();
      const id = `reception_${Date.now()}`;
      const now = new Date().toLocaleDateString('fa-IR');
      
      const newReception: Reception = {
        id,
        customerInfo: reception.customerInfo,
        vehicleInfo: reception.vehicleInfo,
        serviceInfo: reception.serviceInfo,
        status: reception.status || 'pending',
        images: reception.images || [],
        documents: reception.documents || [],
        billing: reception.billing,
        completedAt: reception.completedAt,
        completedBy: reception.completedBy,
        createdAt: now
      };

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'receptions!A:K',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newReception.id,
            JSON.stringify(newReception.customerInfo),
            JSON.stringify(newReception.vehicleInfo),
            JSON.stringify(newReception.serviceInfo),
            newReception.status,
            JSON.stringify(newReception.images),
            JSON.stringify(newReception.documents),
            newReception.billing ? JSON.stringify(newReception.billing) : '',
            newReception.completedAt || '',
            newReception.completedBy || '',
            newReception.createdAt
          ]]
        }
      });

      return newReception;
    } catch (error) {
      console.error('Error adding reception:', error);
      throw error;
    }
  }

  async updateReception(id: string, updates: Partial<Reception>): Promise<void> {
    try {
      const receptions = await this.getReceptions();
      const receptionIndex = receptions.findIndex(r => r.id === id);
      
      if (receptionIndex === -1) {
        throw new Error('Reception not found');
      }

      const updatedReception = { ...receptions[receptionIndex], ...updates };
      const sheets = await this.getSheets();

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `receptions!A${receptionIndex + 2}:K${receptionIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            updatedReception.id,
            JSON.stringify(updatedReception.customerInfo),
            JSON.stringify(updatedReception.vehicleInfo),
            JSON.stringify(updatedReception.serviceInfo),
            updatedReception.status,
            JSON.stringify(updatedReception.images),
            JSON.stringify(updatedReception.documents),
            updatedReception.billing ? JSON.stringify(updatedReception.billing) : '',
            updatedReception.completedAt || '',
            updatedReception.completedBy || '',
            updatedReception.createdAt
          ]]
        }
      });
    } catch (error) {
      console.error('Error updating reception:', error);
      throw error;
    }
  }

  async deleteReception(id: string): Promise<void> {
    try {
      const receptions = await this.getReceptions();
      const receptionIndex = receptions.findIndex(r => r.id === id);
      
      if (receptionIndex === -1) {
        throw new Error('Reception not found');
      }

      const sheets = await this.getSheets();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 2, // Assuming receptions is the third sheet
                dimension: 'ROWS',
                startIndex: receptionIndex + 1,
                endIndex: receptionIndex + 2
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error deleting reception:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();