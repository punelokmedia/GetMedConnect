import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../dist/', import.meta.url);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Portal asset URLs must not collide with public-site assets.
for (const [workspace, base] of [['client', '/'], ['admin', '/admin/'], ['doctor', '/doctor/']]) {
  const result = spawnSync(npm, ['run', 'build', '--workspace', workspace, '--', '--base', base], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// The deletion target is the fixed generated dist directory in this repository.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../client/dist/', import.meta.url), output, { recursive: true });
for (const workspace of ['admin', 'doctor']) {
  await cp(new URL(`../${workspace}/dist/`, import.meta.url), new URL(`${workspace}/`, output), { recursive: true });
}
console.log('Production output ready: /, /admin/, /doctor/, with /api handled by the Vercel function.');
