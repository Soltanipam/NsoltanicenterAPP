import { google } from 'googleapis';
import credentials from '../config/credentials.json';

class GoogleDriveService {
  private drive: any;
  private isInitialized = false;

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if credentials file exists and is valid
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('فایل احراز هویت یافت نشد یا معتبر نیست');
      }

      // Create JWT client
      const auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive.file']
      );

      // Authorize the client
      await auth.authorize();

      // Create drive API instance
      this.drive = google.drive({ version: 'v3', auth });
      this.isInitialized = true;

      console.log('Google Drive Service Account authentication successful');
    } catch (error) {
      console.error('Error initializing Google Drive:', error);
      throw error;
    }
  }

  async uploadFile(file: File, folderName?: string): Promise<string> {
    try {
      await this.initialize();

      // Create form data for file upload
      const fileMetadata = {
        name: file.name,
        parents: folderName ? [folderName] : undefined
      };

      const media = {
        mimeType: file.type,
        body: file.stream()
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      const fileId = response.data.id;

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return `https://drive.google.com/uc?id=${fileId}`;
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
      await this.initialize();

      const id = fileId.includes('drive.google.com') 
        ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
        : fileId;

      await this.drive.files.delete({
        fileId: id
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      await this.initialize();

      const id = fileId.includes('drive.google.com') 
        ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
        : fileId;

      const response = await this.drive.files.get({
        fileId: id,
        fields: 'id,name,size,mimeType,createdTime,modifiedTime'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();