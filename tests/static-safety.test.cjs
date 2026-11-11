const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const WWW = path.join(__dirname, '..', 'www');
const files = fs.readdirSync(WWW).filter(f => /\.(js|html)$/.test(f));
const ok = (n, f) => { f(); console.log('PASS ' + n); };
const hits = re => files.flatMap(f => { const t = fs.readFileSync(path.join(WWW, f), 'utf8'); return [...t.matchAll(re)].map(m => f + ': ' + m[0].slice(0, 60)); });

ok('no eval / new Function / document.write / string timers in web code', () => {
  assert.deepEqual(hits(/\beval\s*\(|new\s+Function\s*\(|document\.write(ln)?\s*\(|set(Timeout|Interval)\s*\(\s*["'`]/g), []);
});
ok('no plain http:// subresources in HTML', () => assert.deepEqual(hits(/(src|href)=["']http:\/\//g), []));
ok('every target=_blank link carries rel=noopener', () => assert.deepEqual(hits(/target=\\?["']_blank\\?["'](?![^>]*noopener)/g), []));
ok('links built from remote data go through safeHref', () => {
  assert.match(fs.readFileSync(path.join(WWW, 'index.html'), 'utf8'), /safeHref\(p\.link\)/);
  assert.match(fs.readFileSync(path.join(WWW, 'native.js'), 'utf8'), /safeHref\(p\.page_url\)/);
});
ok('safe-url.js loads before editor.js and native.js', () => {
  const h = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8'), i = h.indexOf('safe-url.js');
  assert.ok(i > 0 && i < h.indexOf('editor.js') && i < h.indexOf('native.js'));
});

const handlers = [], toasts = [];
const ctx = { console, toast: m => toasts.push(m), document: { addEventListener: (t, f, c) => handlers.push([t, f, c]) } };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(WWW, 'safe-url.js'), 'utf8'), ctx);
const U = ctx.SMB_SAFEURL;
ok('safeHref: allow-list of absolute http(s) only', () => {
  assert.equal(U.safeHref('https://a.io/x?y=1'), 'https://a.io/x?y=1');
  for (const bad of ['javascript:alert(1)', ' JaVa\nScRiPt:alert(1)', 'data:text/html,<script>1</script>', '//evil.io', '/relative', 'https://user:pw@a.io/', 'ftp://a.io', '', null, undefined])
    assert.equal(U.safeHref(bad), '#', String(bad));
});
ok('isScriptUrl catches obfuscated script URLs but not normal links', () => {
  for (const bad of ['javascript:alert(1)', '  JAVASCRIPT:1', 'java\tscript:1', 'java\u200bscript:1', 'vbscript:x', 'data:text/html;base64,AAA'])
    assert.equal(U.isScriptUrl(bad), true, JSON.stringify(bad));
  for (const good of ['https://a.io', 'mailto:a@b.c', 'tel:123', '#top', '/x', 'blob:https://a.io/1', 'data:image/png;base64,AAA'])
    assert.equal(U.isScriptUrl(good), false, good);
});
ok('click guard cancels script-URL links and shows a notice', () => {
  const [t, f, cap] = handlers[0]; assert.equal(t, 'click'); assert.equal(cap, true);
  let prevented = 0; const mk = href => ({ target: { closest: () => ({ getAttribute: () => href }) }, preventDefault: () => prevented++, stopPropagation() {} });
  f(mk('https://a.io')); assert.equal(prevented, 0);
  f(mk('javascript:alert(1)')); assert.equal(prevented, 1); assert.equal(toasts.length, 1);
});
