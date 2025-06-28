"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSheetsAPI = void 0;
// Server-side Google Sheets API handler
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class GoogleSheetsAPI {
    auth = null;
    sheets = null;
    spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';
    initialized = false;
    initializationError = null;
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            console.log('Initializing Google Sheets API...');
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
                credentials.private_key?.includes('YOUR_PRIVATE_KEY_CONTENT_HERE')) {
                throw new Error('Credentials file contains placeholder values. Please update with actual Google service account credentials.');
            }
            this.auth = new googleapis_1.google.auth.GoogleAuth({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file'
                ]
            });
            this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
            // Test connection with timeout
            await this.testConnection();
            this.initialized = true;
            this.initializationError = null;
            console.log('Google Sheets API initialized successfully');
        }
        catch (error) {
            console.warn('Google Sheets API initialization failed:', error.message);
            this.initialized = false;
            this.initializationError = error.message;
            // Don't throw the error - allow the server to continue running
        }
    }
    async testConnection() {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), 10000);
            });
            const testPromise = this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
                fields: 'properties.title'
            });
            await Promise.race([testPromise, timeoutPromise]);
        }
        catch (error) {
            if (error.message === 'Connection timeout') {
                throw new Error('Connection to Google Sheets timed out. Please check your internet connection.');
            }
            else if (error.code === 404) {
                throw new Error(`Spreadsheet not found. Please check the spreadsheet ID: ${this.spreadsheetId}. Make sure the spreadsheet exists and is accessible.`);
            }
            else if (error.code === 403) {
                throw new Error(`Permission denied. Please ensure the service account (${this.auth?.credentials?.client_email || 'unknown'}) has Editor access to the spreadsheet. Share the spreadsheet with this email address.`);
            }
            else if (error.code === 401) {
                throw new Error('Authentication failed. Please check your service account credentials.');
            }
            throw error;
        }
    }
    // Check if API is ready
    isReady() {
        return this.initialized && this.sheets !== null;
    }
    // Check if there was an initialization error
    getInitializationError() {
        return this.initializationError;
    }
    // Generic method to read data from any sheet
    async readSheet(sheetName, range) {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    throw new Error(`Google Sheets not available: ${this.initializationError}`);
                }
                await this.initialize();
                if (!this.isReady()) {
                    throw new Error(`Google Sheets not available: ${this.initializationError || 'Unknown initialization error'}`);
                }
            }
            const fullRange = range ? `${sheetName}!${range}` : `${sheetName}!A:Z`;
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: fullRange,
            });
            const rows = response.data.values || [];
            if (rows.length === 0) {
                console.log(`No data found in sheet: ${sheetName}`);
                return [];
            }
            // Convert rows to objects using first row as headers
            const headers = rows[0];
            const data = rows.slice(1).map((row, index) => {
                const obj = {};
                headers.forEach((header, headerIndex) => {
                    obj[header] = row[headerIndex] || '';
                });
                obj._rowNumber = index + 2;
                return obj;
            });
            console.log(`Successfully read ${data.length} records from ${sheetName}`);
            return data;
        }
        catch (error) {
            console.error(`Error reading sheet ${sheetName}:`, error);
            throw new Error(`Failed to read from ${sheetName}: ${error.message}`);
        }
    }
    // Generic method to append data to any sheet
    async appendToSheet(sheetName, values) {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    throw new Error(`Google Sheets not available: ${this.initializationError}`);
                }
                await this.initialize();
                if (!this.isReady()) {
                    throw new Error(`Google Sheets not available: ${this.initializationError || 'Unknown initialization error'}`);
                }
            }
            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [values],
                },
            });
            console.log(`Successfully appended data to ${sheetName}`);
            return response.data;
        }
        catch (error) {
            console.error(`Error appending to sheet ${sheetName}:`, error);
            throw new Error(`Failed to append to ${sheetName}: ${error.message}`);
        }
    }
    // Generic method to update data in any sheet
    async updateSheet(sheetName, range, values) {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    throw new Error(`Google Sheets not available: ${this.initializationError}`);
                }
                await this.initialize();
                if (!this.isReady()) {
                    throw new Error(`Google Sheets not available: ${this.initializationError || 'Unknown initialization error'}`);
                }
            }
            const response = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!${range}`,
                valueInputOption: 'RAW',
                requestBody: {
                    values,
                },
            });
            console.log(`Successfully updated ${sheetName} range ${range}`);
            return response.data;
        }
        catch (error) {
            console.error(`Error updating sheet ${sheetName}:`, error);
            throw new Error(`Failed to update ${sheetName}: ${error.message}`);
        }
    }
    // Health check method
    async healthCheck() {
        try {
            if (!this.isReady()) {
                if (this.initializationError) {
                    return { status: 'error', message: `Google Sheets not available: ${this.initializationError}` };
                }
                await this.initialize();
                if (!this.isReady()) {
                    return { status: 'error', message: `Google Sheets not available: ${this.initializationError || 'Unknown initialization error'}` };
                }
            }
            await this.testConnection();
            return { status: 'healthy', message: 'Google Sheets API is working correctly' };
        }
        catch (error) {
            return { status: 'error', message: error.message };
        }
    }
    // Utility methods
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
    generateCustomerId() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}
exports.googleSheetsAPI = new GoogleSheetsAPI();
