import './env.js';
import { google } from 'googleapis';
import { createApp } from './enquiry-app.js';

let sheets;
export const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175').split(',').map(value => value.trim()).filter(Boolean);
const configured = Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
if (configured) {
  const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  sheets = google.sheets({ version: 'v4', auth });
}
export const app = createApp({
  trustProxy: process.env.VERCEL ? 1 : false,
  origin: frontendOrigins,
  append: async (tab, row) => {
    if (!sheets) throw new Error('Sheets not configured');
    await sheets.spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `${tab}!A:K`, valueInputOption: 'RAW', requestBody: { values: [row] } });
  },
});

export { configured };
