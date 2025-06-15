import { GOOGLE_CONFIG } from '../config/googleConfig';

class GoogleDriveService {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
  private apiKey = GOOGLE_CONFIG.API_KEY;

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // در حالت آفلاین، خطا بدهیم
    if (!navigator.onLine) {
      throw new Error('کاربر آفلاین است');
    }

    if (!this.apiKey) {
      throw new Error('Google API key is not configured. Please set VITE_GOOGLE_API_KEY in your environment variables.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const finalUrl = url + (url.includes('?') ? '&' : '?') + `key=${this.apiKey}`;
    
    const response = await fetch(finalUrl, {
      ...options,
      headers: {
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

  async uploadFile(file: File, folderName?: string): Promise<string> {
    try {
      // در حالت آفلاین، خطا بدهیم
      if (!navigator.onLine) {
        throw new Error('کاربر آفلاین است');
      }

      if (!this.apiKey) {
        throw new Error('Google API key is not configured. Please set VITE_GOOGLE_API_KEY in your environment variables.');
      }

      // For read-only API key, we simulate file upload
      // In a real implementation with service account, you would upload to Google Drive
      console.warn('File upload requires service account authentication. Simulating upload operation.');
      
      // Generate a mock URL for the uploaded file
      const mockFileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      return `https://drive.google.com/uc?id=${mockFileId}`;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: File[], folderName?: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folderName));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // For read-only API key, we simulate the operation
      console.warn('File deletion requires service account authentication. Simulating delete operation.');
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const id = fileId.includes('drive.google.com') 
        ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
        : fileId;

      return await this.makeRequest(`/files/${id}?fields=id,name,size,mimeType,createdTime,modifiedTime`);
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();