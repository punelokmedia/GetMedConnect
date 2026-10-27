import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // npm run dev uses Vite's proxy. vercel dev routes /api to the server service.
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
});
