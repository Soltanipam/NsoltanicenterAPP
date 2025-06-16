// File upload API routes
import { googleDriveAPI } from '../googleDrive';

export async function uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, folderName?: string) {
  try {
    const url = await googleDriveAPI.uploadFile(fileBuffer, fileName, mimeType, folderName);
    
    if (!url) {
      return { success: false, error: 'Failed to upload file' };
    }
    
    return { success: true, data: { url } };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadMultipleFiles(files: Array<{ buffer: Buffer, fileName: string, mimeType: string }>, folderName?: string) {
  try {
    const uploadPromises = files.map(file => 
      googleDriveAPI.uploadFile(file.buffer, file.fileName, file.mimeType, folderName)
    );
    
    const results = await Promise.all(uploadPromises);
    const urls = results.filter(url => url !== null) as string[];
    
    return { success: true, data: { urls } };
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFile(fileId: string) {
  try {
    await googleDriveAPI.deleteFile(fileId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
}