import { JWT } from 'google-auth-library';

class GoogleDriveService {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';
  private jwtClient: JWT | null = null;
  private isInitialized = false;

  private async initializeAuth(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to load credentials from the config file
      const credentialsResponse = await fetch('/src/config/credentials.json');
      
      if (!credentialsResponse.ok) {
        throw new Error('فایل credentials.json یافت نشد');
      }

      const credentials = await credentialsResponse.json();
      
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('فایل credentials.json معتبر نیست');
      }

      this.jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      await this.jwtClient.authorize();
      this.isInitialized = true;
      console.log('Google Drive Service Account authentication successful');
    } catch (error) {
      console.error('Error initializing Google Drive authentication:', error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.initializeAuth();

    if (!this.jwtClient) {
      throw new Error('احراز هویت Google Drive انجام نشده است');
    }

    const accessToken = await this.jwtClient.getAccessToken();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
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
      await this.initializeAuth();

      if (!this.jwtClient) {
        throw new Error('احراز هویت Google Drive انجام نشده است');
      }

      const accessToken = await this.jwtClient.getAccessToken();

      // Create form data for file upload
      const formData = new FormData();
      
      const metadata = {
        name: file.name,
        parents: folderName ? [folderName] : undefined
      };
      
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Make the file publicly accessible
      await this.makeRequest(`/files/${result.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });

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

  async deleteFile(fileId: string): Promise<void> {
    try {
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