// Server-side Google Drive API handler
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

class GoogleDriveAPI {
  private auth: GoogleAuth | null = null;
  private drive: any = null;

  async initialize() {
    try {
      console.log('Initializing Google Drive API...');
      
      // Load credentials from file system (server-side only)
      const credentialsPath = path.resolve(process.cwd(), 'config', 'credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('Credentials file not found at: ' + credentialsPath);
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('Google Drive API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw new Error(`Google Drive initialization failed: ${error.message}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, folderName?: string): Promise<string | null> {
    try {
      if (!this.drive) {
        await this.initialize();
      }

      // Create folder if specified
      let folderId = null;
      if (folderName) {
        folderId = await this.createOrGetFolder(folderName);
      }

      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      };

      const media = {
        mimeType: mimeType,
        body: fileBuffer
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

      console.log(`File uploaded successfully: ${fileName}`);
      return `https://drive.google.com/uc?id=${response.data.id}`;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      return null;
    }
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
}

export const googleDriveAPI = new GoogleDriveAPI();