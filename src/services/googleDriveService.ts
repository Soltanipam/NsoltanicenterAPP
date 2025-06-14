import { googleAuth } from '../config/googleAuth';

class GoogleDriveService {
  private async getDrive() {
    const auth = await googleAuth.getAuthClient();
    const { google } = await import('googleapis');
    return google.drive({ version: 'v3', auth });
  }

  async uploadFile(file: File, fileName: string, folderId?: string): Promise<string> {
    try {
      const drive = await this.getDrive();
      
      // Convert File to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileMetadata: any = {
        name: fileName,
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const media = {
        mimeType: file.type,
        body: buffer,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink,webContentLink',
      });

      // Make the file publicly viewable
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return response.data.webViewLink || response.data.webContentLink || '';
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async uploadFiles(files: File[], folderName?: string): Promise<string[]> {
    try {
      let folderId: string | undefined;

      // Create folder if specified
      if (folderName) {
        folderId = await this.createFolder(folderName);
      }

      const uploadPromises = files.map((file, index) => {
        const fileName = `${Date.now()}_${index}_${file.name}`;
        return this.uploadFile(file, fileName, folderId);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files to Google Drive:', error);
      throw error;
    }
  }

  async createFolder(name: string, parentFolderId?: string): Promise<string> {
    try {
      const drive = await this.getDrive();

      const fileMetadata: any = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const drive = await this.getDrive();
      await drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  async getFileUrl(fileId: string): Promise<string> {
    try {
      const drive = await this.getDrive();
      const response = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink,webContentLink',
      });

      return response.data.webViewLink || response.data.webContentLink || '';
    } catch (error) {
      console.error('Error getting file URL from Google Drive:', error);
      throw error;
    }
  }

  // Helper method to extract file ID from Google Drive URL
  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}

export const googleDriveService = new GoogleDriveService();