const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
// Load dependency-free TypeScript modules without adding a test runtime dependency.
function load(filename) {
  const absolute = path.resolve(__dirname, '../src/lib', filename);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const instance = new Module(absolute, module);
  instance._compile(source, absolute);
  return instance.exports;
}
const { parseAccountLink } = load('account-links.ts');
const { stockQuantity, validBarcode, binLabel, resolveBin, definitiveStockRejection, mayDiscardReceipt } = load('validation.ts');
const project = 'https://warehouse-test.supabase.co';
const callback = 'productscanner://auth-callback';
test('barcode text preserves leading zeroes', () => {
  assert.equal(validBarcode(' 0012345678905 '), '0012345678905');
  assert.throws(() => validBarcode('warehouse-bin:store:bin'));
  assert.throws(() => validBarcode(''));
});
test('stock quantities reject decimals, negatives, exponents and unsafe integers', () => {
  for (const value of ['-1', '1.5', '1e3', '', '9007199254740992']) assert.throws(() => stockQuantity(value));
  assert.equal(stockQuantity('10'), 10);
  assert.throws(() => stockQuantity('0'));
  assert.equal(stockQuantity('0', true), 0);
});
test('proxy and transport uncertainty retains the receipt reference', () => {
  for (const [status, code] of [[0, ''], [502, ''], [503, ''], [500, '42501'], [400, '']]) {
    assert.equal(definitiveStockRejection(status, code), false);
  }
  for (const [status, code] of [[400, '22023'], [409, '23514'], [403, '42501'], [401, 'PGRST301']]) {
    assert.equal(definitiveStockRejection(status, code), true);
  }
});
test('a later auth rejection cannot discard a previously uncertain receipt', () => {
  assert.equal(mayDiscardReceipt(true, true, definitiveStockRejection(401, 'PGRST301')), false);
  assert.equal(mayDiscardReceipt(true, true, definitiveStockRejection(403, '42501')), false);
  assert.equal(mayDiscardReceipt(true, false, false), false);
  assert.equal(mayDiscardReceipt(false, true, true), true);
  assert.equal(mayDiscardReceipt(false, true, false), false);
  assert.equal(mayDiscardReceipt(false, false, false), true);
});
test('bin QR identity survives renaming and stays scoped to a store', () => {
  const location = { id: 'bin-1', code: 'B-02-03' };
  assert.equal(resolveBin(binLabel('store-1', location.id), 'store-1', [location]), location);
  assert.equal(resolveBin('B-02-03', 'store-1', [location]), location);
  assert.throws(() => resolveBin(binLabel('other-store', location.id), 'store-1', [location]));
  assert.throws(() => resolveBin(binLabel('store-1', 'deleted-bin'), 'store-1', [location]));
});
test('original invite and recovery links are accepted only from this project', () => {
  assert.deepEqual(parseAccountLink(project + '/auth/v1/verify?type=invite&token=one-time', project, callback),
    { kind: 'token', tokenHash: 'one-time', type: 'invite' });
  assert.equal(parseAccountLink(project + '/auth/v1/verify?type=recovery&token_hash=one-time', project, callback).type, 'recovery');
  assert.throws(() => parseAccountLink('https://other.supabase.co/auth/v1/verify?type=invite&token=x', project, callback));
  assert.throws(() => parseAccountLink(project + '/auth/v1/verify?type=signup&token=x', project, callback));
  assert.throws(() => parseAccountLink(project + '/auth/v1/verify?type=invite', project, callback));
});
test('callback session fragments and PKCE codes are parsed without logging tokens', () => {
  assert.deepEqual(parseAccountLink(callback + '#access_token=test-access&refresh_token=test-refresh&type=recovery', project, callback),
    { kind: 'session', accessToken: 'test-access', refreshToken: 'test-refresh' });
  assert.deepEqual(parseAccountLink(callback + '?code=test-code', project, callback), { kind: 'code', code: 'test-code' });
  assert.throws(() => parseAccountLink('productscanner://another-screen?code=x', project, callback));
  assert.throws(() => parseAccountLink(callback + '#access_token=x', project, callback));
  assert.throws(() => parseAccountLink(callback + '#error_description=Link%20expired', project, callback), /expired/);
});
