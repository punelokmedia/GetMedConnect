import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Firebase Auth loads and JWKS verifies RSA signatures without require(esm)', () => {
  // Reproduce the CommonJS restriction in the failing production runtime.
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const { generateKeyPairSync, sign, verify } = require('node:crypto');
    const auth = require('firebase-admin/auth');
    assert.equal(typeof auth.getAuth, 'function');
    const fromFirebase = createRequire(require.resolve('firebase-admin/auth'));
    const jwksClient = fromFirebase('jwks-rsa');
    (async () => {
      const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
      const client = jwksClient({
        jwksUri: 'https://unused.example/jwks',
        cache: false,
        fetcher: async () => ({ keys: [jwk] }),
      });
      const key = await client.getSigningKey('test-key');
      const message = Buffer.from('runtime compatibility regression');
      const signature = sign('RSA-SHA256', message, privateKey);
      assert.equal(verify('RSA-SHA256', message, key.getPublicKey(), signature), true);
      assert.equal(verify('RSA-SHA256', Buffer.from('tampered'), key.getPublicKey(), signature), false);
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
});
