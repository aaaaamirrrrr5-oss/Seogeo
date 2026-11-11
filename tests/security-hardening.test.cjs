const assert = require('node:assert/strict');
const fs = require('node:fs');
const rd = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');
const html = rd('www/index.html'), plugin = rd('native/AdminPlugin.java'), act = rd('native/AdminActivity.java'),
  main = rd('native/MainActivity.java'), wf = rd('.github/workflows/build-apk.yml'), prep = rd('scripts/prepare-android.py'), cap = JSON.parse(rd('capacitor.config.json'));
const ok = (n, f) => { f(); console.log('PASS ' + n); };

ok('CSP: blocks plugins, base-tag, forms, frames and foreign scripts', () => {
  const m = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, 'CSP meta present');
  const csp = m[1];
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-src 'none'", "frame-ancestors 'none'"]) assert.ok(csp.includes(d), d);
  const script = csp.match(/script-src ([^;]+)/)[1];
  assert.doesNotMatch(script, /https?:|\*|unsafe-eval/, 'script-src must not allow remote hosts or eval');
});

ok('inline-handler JSON is attribute-safe (no entity breakout)', () => {
  const esc = eval(html.match(/const esc=[^\n]+/)[0].replace('const esc=', ''));
  const jattr = eval(html.match(/const jattr=[^\n]+/)[0].replace('const jattr=', ''));
  const evil = { name: 'x&quot;+alert(1)+&quot;', n2: "a'b", n3: '</script><img onerror=1>' };
  const out = jattr(evil);
  assert.doesNotMatch(out, /[<>"']/, 'no raw delimiters');
  // simulate HTML entity decoding exactly once, as the browser does for an attribute value
  const decoded = out.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[e]));
  assert.deepEqual(JSON.parse(decoded.replace(/\\u003c/g, '\\u003c')), evil);
  assert.doesNotMatch(html, /JSON\.stringify\(\w+\)\.replace\(\/'\/g,"&#39;"\)/, 'old unsafe pattern gone');
  assert.doesNotMatch(html, /onclick='[^']*\$\{JSON\.stringify/, 'no raw JSON.stringify inside single-quoted handlers');
});

ok('Capacitor: no mixed content, no remote debugging, no logging', () => {
  assert.equal(cap.android.allowMixedContent, false);
  assert.equal(cap.android.webContentsDebuggingEnabled, false);
  assert.equal(cap.loggingBehavior, 'none');
});

ok('Main window: FLAG_SECURE and tapjacking filter', () => {
  assert.match(main, /FLAG_SECURE/);
  assert.match(main, /setFilterTouchesWhenObscured\(true\)/);
});

ok('Keystore: v2 key requires device authentication, AAD-bound, StrongBox preferred, v1 migrated', () => {
  assert.match(plugin, /setUserAuthenticationRequired\(true\)/);
  assert.match(plugin, /setUserAuthenticationParameters\(AUTH_WINDOW_SEC, KeyProperties\.AUTH_DEVICE_CREDENTIAL\)/);
  assert.match(plugin, /setIsStrongBoxBacked\(true\)/);
  assert.match(plugin, /updateAAD\(alias/);
  assert.match(plugin, /KeyPermanentlyInvalidatedException/);
  assert.match(plugin, /startsWith\(V2\)/);
  assert.match(plugin, /purgeLegacyKeyIfUnused/);
  assert.match(plugin, /handleOnPause\(\) \{ unlockedUntilElapsed = 0L; \}/);
});

ok('open(): rejects userinfo URLs, cross-origin loginUrl and scheme-bearing paths', () => {
  assert.match(plugin, /hasUserInfo\(base\) \|\| hasUserInfo\(start\)/);
  assert.match(plugin, /sameOrigin\(base, loginUrl0\)/);
  assert.match(plugin, /path0\.contains\(":\/\/"\)/);
});

ok('WebView: SSL errors cancelled, external hosts leave the app, data wiped on close', () => {
  assert.match(act, /onReceivedSslError[\s\S]*h\.cancel\(\)/);
  assert.doesNotMatch(act, /handler\.proceed|h\.proceed/);
  assert.match(act, /boolean isTrusted\(Uri u\)/);
  assert.match(act, /if \(isTrusted\(r\.getUrl\(\)\)\) return false;/);
  assert.match(act, /setSafeBrowsingEnabled\(true\)/);
  assert.match(act, /setAllowUniversalAccessFromFileURLs\(false\)/);
  assert.match(act, /onRenderProcessGone/);
  assert.match(act, /removeAllCookies/);
  assert.match(act, /WebStorage\.getInstance\(\)\.deleteAllData\(\)/);
  assert.match(act, /user = null; pass = null;/);
  assert.doesNotMatch(act, /addJavascriptInterface/);
});

ok('Network security config trusts system CAs only; no backup/transfer extraction', () => {
  const n = rd('native/network_security_config.xml');
  assert.match(n, /<certificates src="system"\s*\/>/);
  assert.doesNotMatch(n, /src="user"/);
  const d = rd('native/data_extraction_rules.xml');
  assert.match(d, /<cloud-backup>/); assert.match(d, /<device-transfer>/);
});

ok('Workflow: least-privilege token, NSC wired into manifest, signing key removed', () => {
  assert.match(wf, /permissions:\s*\n\s+contents: read/);
  assert.match(wf, /persist-credentials: false/);
  assert.match(prep, /networkSecurityConfig/);
  assert.match(prep, /dataExtractionRules/);
  assert.match(wf, /python scripts\/prepare-android\.py/);
  assert.match(wf, /rm -f android\/release-key\.jks/);
  assert.match(prep, /allowBackup/);
});
