// Server-side Google Sheets API handler
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

class GoogleSheetsAPI {
  private auth: GoogleAuth | null = null;
  private sheets: any = null;
  private spreadsheetId: string = '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';

  async initialize() {
    try {
      console.log('Initializing Google Sheets API...');
      
      // Load credentials from file system (server-side only)
      const credentialsPath = path.resolve(process.cwd(), 'config', 'credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('Credentials file not found at: ' + credentialsPath);
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Test connection
      await this.testConnection();
      
      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error);
      throw new Error(`Google Sheets initialization failed: ${error.message}`);
    }
  }

  private async testConnection() {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'properties.title'
      });
    } catch (error) {
      if (error.code === 404) {
        throw new Error(`Spreadsheet not found. Please check the spreadsheet ID: ${this.spreadsheetId}`);
      } else if (error.code === 403) {
        throw new Error('Permission denied. Please ensure the service account has access to the spreadsheet.');
      }
      throw error;
    }
  }

  // Generic method to read data from any sheet
  async readSheet(sheetName: string, range?: string): Promise<any[]> {
    try {
      if (!this.sheets) {
        await this.initialize();
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
        const obj: any = {};
        headers.forEach((header: string, headerIndex: number) => {
          obj[header] = row[headerIndex] || '';
        });
        obj._rowNumber = index + 2;
        return obj;
      });

      console.log(`Successfully read ${data.length} records from ${sheetName}`);
      return data;
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      throw new Error(`Failed to read from ${sheetName}: ${error.message}`);
    }
  }

  // Generic method to append data to any sheet
  async appendToSheet(sheetName: string, values: any[]): Promise<any> {
    try {
      if (!this.sheets) {
        await this.initialize();
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
    } catch (error) {
      console.error(`Error appending to sheet ${sheetName}:`, error);
      throw new Error(`Failed to append to ${sheetName}: ${error.message}`);
    }
  }

  // Generic method to update data in any sheet
  async updateSheet(sheetName: string, range: string, values: any[][]): Promise<any> {
    try {
      if (!this.sheets) {
        await this.initialize();
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
    } catch (error) {
      console.error(`Error updating sheet ${sheetName}:`, error);
      throw new Error(`Failed to update ${sheetName}: ${error.message}`);
    }
  }

  // Utility methods
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  generateCustomerId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export const googleSheetsAPI = new GoogleSheetsAPI();