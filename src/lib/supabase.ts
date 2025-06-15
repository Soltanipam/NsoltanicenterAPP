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

// Compatibility functions for existing code
export const supabase = {
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const url = await googleDriveService.uploadFile(file, bucket);
          return { data: { path: url }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
    })
  }
};