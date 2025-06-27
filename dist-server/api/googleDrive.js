"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleDriveAPI = void 0;
// Server-side Google Drive API handler
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class GoogleDriveAPI {
    constructor() {
        this.auth = null;
        this.drive = null;
        this.initialized = false;
        this.initializationError = null;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            console.log('Initializing Google Drive API...');
            // Try multiple credential paths
            const credentialsPaths = [
                path_1.default.resolve(process.cwd(), 'config', 'credentials.json'),
                path_1.default.resolve(process.cwd(), 'src', 'config', 'credentials.json'),
                path_1.default.resolve(process.cwd(), 'public', 'config', 'credentials.json')
            ];
            let credentials = null;
            let credentialsPath = null;
            for (const pathToCheck of credentialsPaths) {
                if (fs_1.default.existsSync(pathToCheck)) {
                    credentialsPath = pathToCheck;
                    break;
                }
            }
            if (!credentialsPath) {
                throw new Error(`Credentials file not found. Searched paths: ${credentialsPaths.join(', ')}`);
            }
            try {
                const credentialsContent = fs_1.default.readFileSync(credentialsPath, 'utf-8');
                credentials = JSON.parse(credentialsContent);
            }
            catch (parseError) {
                throw new Error(`Failed to parse credentials file: ${parseError.message}`);
            }
            // Validate required credential fields
            const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
            for (const field of requiredFields) {
                if (!credentials[field]) {
                    throw new Error(`Missing required credential field: ${field}`);
                }
            }
            // Check if credentials are placeholder values
            if (credentials.project_id === 'your-project-id-here' ||
                credentials.private_key.includes('YOUR_PRIVATE_KEY_CONTENT_HERE')) {
                throw new Error('Credentials file contains placeholder values. Please update with actual Google service account credentials.');
            }
            this.auth = new googleapis_1.google.auth.GoogleAuth({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive'
                ]
            });
            this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.auth });
            this.initialized = true;
            this.initializationError = null;
            console.log('Google Drive API initialized successfully');
        }
        catch (error) {
            console.warn('Google Drive API initialization failed:', error.message);
            this.initialized = false;
            this.initializationError = error.message;
            // Don't throw the error - allow the server to continue running
        }
    }
    // Check if API is ready
    isReady() {
        return this.initialized && this.drive !== null;
    }
    // Check if there was an initialization error
    getInitializationError() {
        return this.initializationError;
    }
    async uploadFile(fileBuffer, fileName, mimeType, folderName) {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    throw new Error(`Google Drive not available: ${this.initializationError}`);
                }
                await this.initialize();
                if (!this.isReady()) {
                    throw new Error(`Google Drive not available: ${this.initializationError || 'Unknown initialization error'}`);
                }
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
        }
        catch (error) {
            console.error('Error uploading file to Google Drive:', error);
            return null;
        }
    }
    async createOrGetFolder(folderName) {
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
        }
        catch (error) {
            console.error('Error creating/getting folder:', error);
            throw error;
        }
    }
    async deleteFile(fileId) {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    throw new Error(`Google Drive not available: ${this.initializationError}`);
                }
                await this.initialize();
                if (!this.isReady()) {
                    throw new Error(`Google Drive not available: ${this.initializationError || 'Unknown initialization error'}`);
                }
            }
            const id = fileId.includes('drive.google.com')
                ? fileId.match(/id=([a-zA-Z0-9-_]+)/)?.[1] || fileId
                : fileId;
            await this.drive.files.delete({
                fileId: id
            });
            console.log(`File deleted: ${id}`);
        }
        catch (error) {
            console.error('Error deleting file from Google Drive:', error);
            throw error;
        }
    }
}
exports.googleDriveAPI = new GoogleDriveAPI();
