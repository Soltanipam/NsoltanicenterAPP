// src/config/googleAuth.ts
import { google } from 'googleapis';
import credentials from './credentials.json';

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];

export const googleAuth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: SCOPES,
});
