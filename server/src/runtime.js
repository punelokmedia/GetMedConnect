import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { createApp } from './enquiry-app.js';

if (!process.env.VERCEL) dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
let sheets;
const configured = Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
if (configured) {
  const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  sheets = google.sheets({ version: 'v4', auth });
}
export const app = createApp({
  trustProxy: process.env.VERCEL ? 1 : false,
  origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim()).filter(Boolean),
  append: async (tab, row) => {
    if (!sheets) throw new Error('Sheets not configured');
    await sheets.spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `${tab}!A:K`, valueInputOption: 'RAW', requestBody: { values: [row] } });
  },
});

export { configured };
