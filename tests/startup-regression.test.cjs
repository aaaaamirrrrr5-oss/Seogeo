const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync(__dirname + '/../www/index.html', 'utf8');
const upgrade = fs.readFileSync(__dirname + '/../www/upgrade.js', 'utf8');
const block = (start, end) => {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `missing block: ${start}`);
  return html.slice(a, b);
};
const boot = block('async function boot(){', 'const TABS=');
assert.match(boot, /try\{\s*const discovered=await api\("\/types"\)/,
  'custom post type discovery is optional and must not block app startup');
assert.match(boot, /catch\(e\)\{types=\[\];console\.warn\("Site Manager: optional \/types endpoint unavailable"/,
  'failed optional metadata discovery falls back to an empty custom type list');
assert.match(boot, /tab="home";\s*go\("home"\);/,
  'successful connection always enters the main dashboard first');
assert.match(boot, /const seq=\+\+bootSeq/,
  'stale concurrent boot requests are ignored');
const home = block('async function home(){', '/* ---------- hub (all sections) ---------- */');
assert.match(home, /let d=\{\},dashError=null/,
  'dashboard failure is isolated from the main application shell');
assert.match(home, /catch\(e\)\{dashError=e\}/,
  'dashboard data errors are captured for an in-app fallback');
assert.match(home, /مدیریت کامل وردپرس/,
  'the WordPress feature catalogue link remains available in fallback dashboard');
assert.match(home, /تلاش دوباره برای آمار/,
  'dashboard data can be retried without leaving the home screen');
assert.match(upgrade, /function ensureJumpFab\(\)\{document\.querySelectorAll\("\.upl-jump"\)\.forEach\(b=>b\.remove\(\)\)\}/,
  'only the top-bar quick-jump remains; stale duplicate floating buttons are removed');
assert.doesNotMatch(upgrade, /className="upl-jump"/,
  'new builds must not create duplicate magnifier buttons');
assert.match(upgrade, /textContent="🔎 جستجو"/,
  'the remaining quick-jump button has a visible label');
console.log('PASS startup regression: home entry survives optional API failures, dashboard fallback, and single quick-jump control');

// boot() نباید پیش از لود اسکریپت‌های بعدی اجرا شود (race: داشبورد بدون میانبرها).
{
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'www', 'index.html'), 'utf8');
  require('assert').ok(html.includes('document.addEventListener("DOMContentLoaded",()=>boot())'), 'boot باید تا DOMContentLoaded صبر کند');
  require('assert').ok(!/\n boot\(\);\n<\/script>/.test(html) && !/\nboot\(\);\n<\/script>/.test(html), 'فراخوانی بی‌قید boot() نباید باقی بماند');
  console.log('PASS boot پس از لود همهٔ اسکریپت‌ها اجرا می‌شود');
}

// انیمیشن ورودی نوار ناوبری نباید وسط‌چین‌کردن (translateX(-50%)) را از بین ببرد.
{
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'www', 'motion.css'), 'utf8');
  const m = css.match(/@keyframes sm-nav-in\{[^\n]*\}/);
  require('assert').ok(m && !/transform:none/.test(m[0]) && m[0].includes('translateX(var(--sm-nav-x,-50%))'), 'keyframes نوار ناوبری باید translateX را حفظ کند');
  console.log('PASS انیمیشن نوار ناوبری موقعیت وسط‌چین را حفظ می‌کند');
}
