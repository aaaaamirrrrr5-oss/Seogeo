// آزمون منطق UX: آدرس سایت (HTTP/HTTPS)، میانبرهای صفحهٔ اول، و سالم‌بودن همهٔ دکمه‌های داشبورد.
const assert = require('assert'), fs = require('fs'), path = require('path');
const { normalizeSiteUrl, uxQuickResolve, UX_QUICK, UX_QUICK_MAX, UX_DEF, UX_DEF_WC } = require('../www/ux.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('PASS ' + name); };

ok('دامنه بدون پروتکل → https', () => { const r = normalizeSiteUrl('example.com'); assert.strictEqual(r.url, 'https://example.com'); assert.strictEqual(r.http, false); });
ok('http پذیرفته و علامت‌گذاری می‌شود', () => { const r = normalizeSiteUrl('http://192.168.1.5/wp/'); assert.strictEqual(r.url, 'http://192.168.1.5/wp'); assert.strictEqual(r.http, true); });
ok('خطای ویرگول در پسوند دامنه اصلاح می‌شود', () => { assert.strictEqual(normalizeSiteUrl('beano-coffee,ir').url, 'https://beano-coffee.ir'); assert.strictEqual(normalizeSiteUrl('www.beano-coffee,ir').url, 'https://www.beano-coffee.ir'); assert.ok(normalizeSiteUrl('https://beano-coffee,ir').error); });
ok('حروف بزرگ و فاصله اصلاح می‌شود', () => { const r = normalizeSiteUrl('  HTTP://Example.COM/  '); assert.strictEqual(r.url, 'http://example.com'); });
ok('پورت حفظ می‌شود', () => { assert.strictEqual(normalizeSiteUrl('example.com:8080').url, 'https://example.com:8080'); assert.strictEqual(normalizeSiteUrl('http://localhost:8888').url, 'http://localhost:8888'); });
ok('query و hash حذف می‌شود', () => { assert.strictEqual(normalizeSiteUrl('https://x.com/blog/?a=1#z').url, 'https://x.com/blog'); });
ok('پروتکل نامعتبر رد می‌شود', () => { assert.ok(normalizeSiteUrl('ftp://x.com').error); assert.ok(normalizeSiteUrl('file:///etc/passwd').error); });
ok('نام کاربری/رمز داخل آدرس رد می‌شود', () => { assert.ok(normalizeSiteUrl('https://user:pw@x.com').error); });
ok('ورودی خالی یا خراب رد می‌شود', () => { assert.ok(normalizeSiteUrl('').error); assert.ok(normalizeSiteUrl('   ').error); assert.ok(normalizeSiteUrl('javascript:alert(1)').error); assert.ok(normalizeSiteUrl('http://').error); });

const ids = UX_QUICK.map(x => x.id);
ok('شناسهٔ میانبرها یکتاست و پیش‌فرض‌ها در فهرست‌اند', () => { assert.strictEqual(new Set(ids).size, ids.length); [...UX_DEF, ...UX_DEF_WC].forEach(i => assert.ok(ids.includes(i), i)); });
ok('بدون ووکامرس، میانبر فروشگاه نمی‌آید', () => { const r = uxQuickResolve(UX_QUICK, null, false); assert.ok(r.length && r.every(x => !x.wc)); });
ok('با ووکامرس پیش‌فرض فروشگاهی است', () => { const r = uxQuickResolve(UX_QUICK, null, true); assert.strictEqual(r[0].id, 'orders'); assert.ok(r.length <= UX_QUICK_MAX); });
ok('میانبرها با مجوز واقعی سرور فیلتر می‌شوند', () => { const caps={orders_access:false,orders_create_access:false,product_write_access:false,coupons_access:false,content_write_access:false,page_write_access:false,media_write_access:false,comments_access:false,plugins_access:false,updates_access:false,settings_access:false,users_access:false}; const r=uxQuickResolve(UX_QUICK,['site','search','orders','newpost'],true,caps); assert.deepStrictEqual(r.map(x=>x.id),['site','search']); });
ok('شناسهٔ نامعتبر و تکراری حذف و سقف ۸ رعایت می‌شود', () => {
  const r = uxQuickResolve(UX_QUICK, ['bogus', 'media', 'media', ...ids], true); assert.ok(!r.some(x => x.id === 'bogus')); assert.strictEqual(new Set(r.map(x => x.id)).size, r.length); assert.ok(r.length <= UX_QUICK_MAX); assert.strictEqual(r[0].id, 'media');
});
ok('انتخاب کاملاً نامعتبر به پیش‌فرض برمی‌گردد', () => { assert.deepStrictEqual(uxQuickResolve(UX_QUICK, ['x', 'y'], false).map(x => x.id), UX_DEF); });

const all = ['index.html', 'plus.js', 'editor.js', 'native.js', 'pro.js', 'ux.js'].map(f => read('www/' + f)).join('\n');
const defined = new Set();
for (const m of all.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
ok('همهٔ اکشن‌های میانبرها تابع تعریف‌شده دارند', () => {
  for (const q of UX_QUICK) { const fn = q.a.match(/^([A-Za-z_$][\w$]*)\(/)[1]; assert.ok(defined.has(fn), `${q.id}: ${fn} تعریف نشده`); }
});
ok('همهٔ شناسه‌های «وردپرس» در wpOpenFeature مسیر دارند', () => {
  const html = read('www/index.html'); const a = html.indexOf('function wpOpenFeature'), b = html.indexOf('async function wordpressHome');
  const body = html.slice(a, b), fe = html.slice(html.indexOf('const WP_FEATURES'), a);
  const dead = [...fe.matchAll(/\{id:'([^']+)'/g)].map(m => m[1]).filter(i => !body.includes("'" + i + "'"));
  assert.deepStrictEqual(dead, []);
});
ok('داشبورد میانبرها را رندر می‌کند و آمار فروش را با مجوز سرور محدود می‌سازد', () => { const h=read('www/index.html'); assert.ok(h.includes('typeof uxQuick==="function"')); assert.ok(h.includes('html+=uxQuick()')); assert.ok(h.includes('sales=!!d.sales_access')); assert.ok(h.includes('ordersOk=!!d.orders_access')); assert.ok(h.includes('productsOk=!!d.product_access')); });
ok('فرم اتصال دیگر فقط-HTTPS نیست', () => { const h = read('www/index.html'); assert.ok(!h.includes('فقط آدرس HTTPS قابل قبول است')); assert.ok(h.includes('normalizeSiteUrl(')); });
ok('بخش بومی http را برای سایت انتخاب‌شده می‌پذیرد، ولی ورود خودکار HTTPS-only می‌ماند', () => {
  const act = read('native/AdminActivity.java'), plg = read('native/AdminPlugin.java');
  assert.ok(act.includes('^https?://') && plg.includes('baseHttp'));
  assert.ok(/!"https"\.equalsIgnoreCase\(cu\.getScheme\(\)\)/.test(act), 'autoLogin باید فقط روی https بماند');
  assert.ok(read('scripts/prepare-android.py').includes('usesCleartextTraffic'));
  assert.ok(read('.github/workflows/build-apk.yml').includes('python scripts/prepare-android.py'));
});
console.log(`\n${n} آزمون ux موفق بود.`);

ok('SMART DASHBOARD ORGANIZER supports touch reorder controls and drag-and-drop order persistence', () => {
  const ux=read('www/ux.js');
  assert.ok(ux.includes('function uxQuickMove('));
  assert.ok(ux.includes('function uxQuickBindDrag('));
  assert.ok(ux.includes('host.insertBefore(dragging'));
  assert.ok(ux.includes('document.querySelectorAll("#uxq_sort .qa-sort")'));
  assert.ok(ux.includes('uxQuickMove(this,-1)') && ux.includes('uxQuickMove(this,1)'));
  assert.ok(ux.includes('prefers-reduced-motion')===false || read('www/ux.css').includes('prefers-reduced-motion'));
});
ok('Android secure session transport stores only encrypted credentials and sends token/device/replay headers', () => {
  const h=read('www/index.html'),native=read('native/AdminPlugin.java');
  assert.ok(h.includes('Authorization="Bearer "+S.accessToken'));
  assert.ok(h.includes('X-SMB-Device') && h.includes('X-SMB-Request-Time') && h.includes('X-SMB-Request-Nonce'));
  assert.ok(h.includes('startDeviceSession') && h.includes('refreshDeviceSession'));
  assert.ok(h.includes('saveSecret({alias:secretAlias(s),value:secretBundle(s)})'));
  assert.ok(native.includes('AndroidKeyStore') && native.includes('AES/GCM/NoPadding'));
  assert.ok(h.includes('const refreshSessionPromises=new WeakMap()'));
  assert.ok(!h.includes('let refreshSessionPromise=null'));
});
console.log('PASS 2 organizer/session client static checks');
