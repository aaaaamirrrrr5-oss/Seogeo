const assert = require('node:assert/strict');
const fs = require('node:fs');
const rd = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');
const html = rd('www/index.html'), nat = rd('www/native.js'), act = rd('native/AdminActivity.java'), wf = rd('.github/workflows/build-apk.yml');
const ok = (n, f) => { f(); console.log('PASS ' + n); };
ok('removing a site revokes the server-side device session first', () => {
  assert.match(html, /async function revokeRemoteSession\(s\)/);
  assert.match(html, /auth\/logout/);
  assert.match(html, /await revokeRemoteSession\(s\);clearSiteCache\(s\)/);
});
ok('financial dashboard is not kept in the plaintext offline cache', () => {
  const m = html.match(/const cacheablePath=p=>\/\^\\\/\(([^)]*)\)/);
  assert.ok(m, 'cacheablePath regex found');
  assert.doesNotMatch(m[1], /\bdash\b/);
});
ok('clipboard copy reports failure of the async API', () => assert.match(nat, /writeText\(t\)\.then\(\(\)=>toast\("کپی شد"\),fail\)/));
ok('WebView: credentials removed from Intent, no content access, external schemes allow-listed, destroyed on exit', () => {
  assert.match(act, /removeExtra\("pass"\)/);
  assert.match(act, /setAllowContentAccess\(false\)/);
  assert.match(act, /scheme\.equals\("mailto"\)/);
  assert.match(act, /wv\.destroy\(\)/);
});
ok('workflow computes the APK SHA-256 without escaped quotes', () => {
  assert.doesNotMatch(wf, /sha256sum \\"/);
  assert.match(wf, /sha256sum "\$APK"/);
});
