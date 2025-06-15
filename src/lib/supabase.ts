// Simple file upload utility for Google Drive
import { googleDriveService } from '../services/googleDrive';

export const uploadFile = async (file: File, path: string): Promise<string | null> => {
  try {
    return await googleDriveService.uploadFile(file, path);
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};