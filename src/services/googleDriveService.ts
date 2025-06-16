import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

class GoogleDriveService {
  private auth: GoogleAuth | null = null;
  private drive: any = null;

  async initialize() {
    try {
      console.log('Initializing Google Drive service...');
      
      // Load credentials
      const credentials = await this.loadCredentials();
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('Google Drive service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      throw new Error(`Google Drive initialization failed: ${error.message}`);
    }
  }

  private async loadCredentials() {
    try {
      const response = await fetch('/config/credentials.json');
      if (!response.ok) {
        throw new Error(`Credentials file not found. Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load credentials for Google Drive:', error);
      throw error;
    }
  }

  async uploadFile(file: File, folderName?: string): Promise<string | null> {
    try {
      if (!this.drive) {
        await this.initialize();
      }

      // Create folder if specified
      let folderId = null;
      if (folderName) {
        folderId = await this.createOrGetFolder(folderName);
      }

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      
      const fileMetadata = {
        name: file.name,
        parents: folderId ? [folderId] : undefined
      };

      const media = {
        mimeType: file.type,
        body: Buffer.from(buffer)
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink,webContentLink'
      });

      // Make file publicly viewable
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      console.log(`File uploaded successfully: ${file.name}`);
      return `https://drive.google.com/uc?id=${response.data.id}`;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      return null;
    }
  }

  async uploadMultipleFiles(files: File[], folderName?: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folderName));
    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== null) as string[];
  }

  private async createOrGetFolder(folderName: string): Promise<string> {
    try {
      // Check if folder already exists
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });

      console.log(`Folder created: ${folderName}`);
      return folder.data.id;
    } catch (error) {
      console.error('Error creating/getting folder:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        await this.initialize();
      }

      // Extract file ID from URL if needed
      const id = fileId.includes('drive.google.com') 
        ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
        : fileId;

      await this.drive.files.delete({
        fileId: id
      });

      console.log(`File deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      if (!this.drive) {
        await this.initialize();
      }

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