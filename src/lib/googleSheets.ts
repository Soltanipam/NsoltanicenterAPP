import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const credentialsPath = path.resolve(__dirname, '../../config/credentials.json');
let jwtClient: JWT | null = null;
let sheets: any = null;

const init = async () => {
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('فایل credentials.json پیدا نشد.');
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

  jwtClient = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES
  );

  await jwtClient.authorize();

  sheets = google.sheets({ version: 'v4', auth: jwtClient });
};

const readSheet = async (sheetName: string) => {
  if (!sheets) await init();

  const spreadsheetId = '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w'; // شناسه فایل شیت شما
  const range = `${sheetName}!A1:Z1000`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  return response.data.values || [];
};

const appendRow = async (sheetName: string, row: string[]) => {
  if (!sheets) await init();

  const spreadsheetId = '16rJEpOdRXhAxY7UFa-20-6ETWaIeOJRtoJ2VPFmec1w';
  const range = `${sheetName}!A1`;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row]
    }
  });
};

export const googleSheetsService = {
  readSheet,
  appendRow
};
