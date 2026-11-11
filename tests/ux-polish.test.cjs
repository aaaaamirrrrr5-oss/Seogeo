// آزمون ایستا/منطقی بهبودهای ظاهری ۳.۱۳.۲ (راهنمای آدرس، عنوان فارسی، حالت خالی، CSS دسترس‌پذیری)
const assert = require('assert'), fs = require('fs'), path = require('path');
const { uxUrlHint } = require('../www/ux.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let n = 0; const ok = (m, f) => { f(); n++; console.log('PASS ' + m); };
ok('راهنمای آدرس: خالی/امن/ناامن/نامعتبر', () => {
  assert.strictEqual(uxUrlHint('').cls, ''); assert.strictEqual(uxUrlHint('example.com').cls, 'ok'); assert.strictEqual(uxUrlHint('http://10.0.0.5').cls, 'warn'); assert.strictEqual(uxUrlHint('ftp://x.com').cls, 'bad');
});
ok('عنوان سازمان‌دهنده فارسی است و شمارنده دارد', () => { const s = read('www/ux.js'); assert.ok(!s.includes('SMART DASHBOARD')); assert.ok(s.includes('سازمان‌دهی داشبورد') && s.includes('uxq_cnt')); });
ok('حالت خالی میانبرها پیام راهنما دارد', () => { assert.ok(read('www/ux.js').includes('میانبری برای نمایش وجود ندارد')); });
ok('CSS: focus-visible، کاهش حرکت، کاشی تنها تمام‌عرض، متن هیرو بلوکی', () => {
  const c = read('www/ux.css'); ['focus-visible', 'prefers-reduced-motion', 'grid-column:1/-1', '.hero small{display:block'].forEach(k => assert.ok(c.includes(k), k));
});
ok('اعلان‌ها نقش status دارند (صفحه‌خوان)', () => { assert.ok(read('www/index.html').includes('e.setAttribute("role","status")')); });
console.log(`\n${n} آزمون ux-polish موفق بود.`);
