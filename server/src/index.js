import express from 'express';
import { app as enquiryApp, configured } from './runtime.js';

const app = express();
app.use(enquiryApp);

// Vercel loads the Express export; npm run dev starts the local listener.
export default app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 4000, '127.0.0.1', () => {
    console.log(`API: http://localhost:${process.env.PORT || 4000}`);
    if (!configured) console.log('Google Sheets is not configured. Forms will return 503 until server/.env is completed.');
  });
}
