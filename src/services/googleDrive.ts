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

      // ایجاد فولدر در صورت نیاز
      let folderId = 'root';
      if (folderName) {
        folderId = await this.createOrGetFolder(folderName, folderId);
      }

      // آپلود فایل
      const metadata = {
        name: `${Date.now()}_${file.name}`,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const url = `${this.uploadUrl}/files?uploadType=multipart&key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      // فایل را عمومی کنیم تا قابل دسترسی باشد
      await this.makeFilePublic(result.id);

      // لینک مستقیم فایل را برگردانیم
      return `https://drive.google.com/uc?id=${result.id}`;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: File[], folderName?: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folderName));
    return Promise.all(uploadPromises);
  }

  private async createOrGetFolder(folderName: string, parentId: string): Promise<string> {
    try {
      // بررسی وجود فولدر
      const searchResponse = await this.makeRequest(
        `/files?q=name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      );

      if (searchResponse.files && searchResponse.files.length > 0) {
        return searchResponse.files[0].id;
      }

      // ایجاد فولدر جدید
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };

      const createResponse = await this.makeRequest('/files', {
        method: 'POST',
        body: JSON.stringify(folderMetadata)
      });

      return createResponse.id;
    } catch (error) {
      console.error('Error creating/getting folder:', error);
      throw error;
    }
  }

  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await this.makeRequest(`/files/${fileId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (error) {
      console.error('Error making file public:', error);
      // در صورت خطا، فایل private باقی می‌ماند
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // استخراج ID از URL در صورت نیاز
      const id = fileId.includes('drive.google.com') 
        ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
        : fileId;

      await this.makeRequest(`/files/${id}`, {
        method: 'DELETE'
      });
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