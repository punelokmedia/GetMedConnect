// Run during deployment so incompatible dependencies fail the build, not live requests.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const auth = require('firebase-admin/auth');
assert.equal(typeof auth.getAuth, 'function');
const fromFirebase = createRequire(require.resolve('firebase-admin/auth'));
const jwks = fromFirebase('jwks-rsa');
assert.equal(typeof jwks, 'function');
console.log('Firebase Auth and JWKS load successfully without require(esm).');
