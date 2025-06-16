// Client-side wrapper for Google Drive operations
import { apiClient } from './apiClient';

class GoogleDriveService {
  async uploadFile(file: File, folderName?: string): Promise<string> {
    try {
      const result = await apiClient.uploadFile(file, folderName);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload file');
      }
      
      return result.data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files: File[], folderName?: string): Promise<string[]> {
    try {
      const result = await apiClient.uploadMultipleFiles(files, folderName);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload files');
      }
      
      return result.data.urls;
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const result = await apiClient.deleteFile(fileId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    // This would need to be implemented on the server side
    throw new Error('getFileInfo not implemented yet');
  }

  isConnected(): boolean {
    return navigator.onLine;
  }
}

export const googleDriveService = new GoogleDriveService();