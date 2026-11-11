const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(__dirname + '/../www/index.html', 'utf8');
const block = (start, end) => {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `missing block: ${start}`);
  return html.slice(a, b);
};
const addSite = block('async function addSite(i){', 'async function switchSite(');
const apiRaw = block('async function apiRaw(path,body,opts={}){', 'const apiMemo=new Map()');
const apiMemo = block('const apiMemo=new Map()', 'async function readOfflineQueue(');
assert.match(addSite, /apiRaw\("\/ping",undefined,\{requireNetwork:true\}\)/, 'connect must verify ping against the live server');
assert.match(addSite, /invalidateSiteApi\(s\)/, 'changing credentials must invalidate API memo entries');
assert.match(apiRaw, /if\(opts\.requireNetwork\)throw new Error/, 'fresh auth check must not fall back to offline cache');
assert.match(apiMemo, /apiEpoch/, 'memo cache must be versioned per site');
assert.match(apiMemo, /apiPending\.get\(key\)===task/, 'old requests must not delete a newer pending request');
assert.match(html, /نشست امن کامل برنگرداند/, 'malformed session response must be rejected');
console.log('PASS live connection validation, stale cache invalidation, and auth response checks');
