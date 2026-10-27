import { app, configured } from './runtime.js';

app.listen(process.env.PORT || 4000, '127.0.0.1', () => {
  console.log(`API: http://localhost:${process.env.PORT || 4000}`);
  if (!configured) console.log('Google Sheets is not configured. Forms will return 503 until server/.env is completed.');
});
