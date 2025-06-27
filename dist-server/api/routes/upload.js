"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.uploadMultipleFiles = uploadMultipleFiles;
exports.deleteFile = deleteFile;
// File upload API routes
const googleDrive_1 = require("../googleDrive");
async function uploadFile(fileBuffer, fileName, mimeType, folderName) {
    try {
        const url = await googleDrive_1.googleDriveAPI.uploadFile(fileBuffer, fileName, mimeType, folderName);
        if (!url) {
            return { success: false, error: 'Failed to upload file' };
        }
        return { success: true, data: { url } };
    }
    catch (error) {
        console.error('Error uploading file:', error);
        return { success: false, error: error.message };
    }
}
async function uploadMultipleFiles(files, folderName) {
    try {
        const uploadPromises = files.map(file => googleDrive_1.googleDriveAPI.uploadFile(file.buffer, file.fileName, file.mimeType, folderName));
        const results = await Promise.all(uploadPromises);
        const urls = results.filter(url => url !== null);
        return { success: true, data: { urls } };
    }
    catch (error) {
        console.error('Error uploading multiple files:', error);
        return { success: false, error: error.message };
    }
}
async function deleteFile(fileId) {
    try {
        await googleDrive_1.googleDriveAPI.deleteFile(fileId);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting file:', error);
        return { success: false, error: error.message };
    }
}
