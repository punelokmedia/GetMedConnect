import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Neon pulls to the repository root; retain existing server-only local settings.
if (!process.env.VERCEL) {
  for (const path of ['../../.env.local', '../../.env', '../.env']) {
    dotenv.config({ path: fileURLToPath(new URL(path, import.meta.url)), quiet: true });
  }
}
