const assert = require('assert');
const { plusDelta, plusChart, plusShareParse, plusLinkHtml } = require('../www/plus.js');

// نمودار: به تعداد روزها میله می‌سازد، اسکریپت تزریق نمی‌کند و روی داده خالی خروجی خالی می‌دهد.
const series = Array.from({ length: 30 }, (_, i) => ({ d: `2026-10-${String(i + 1).padStart(2, '0')}`, sales: i * 1000, orders: i }));
const svg = plusChart(series, 'sales');
assert.equal((svg.match(/<rect /g) || []).length, 30, 'برای هر روز یک میله');
assert.ok(svg.startsWith('<svg') && !svg.includes('<script'), 'خروجی SVG امن باشد');
assert.equal(plusChart([], 'sales'), '', 'داده خالی نمودار نسازد');
const evil = plusChart([{ d: '2026-01-01"><script>x</script>', sales: 5 }], 'sales');
assert.ok(!evil.includes('<script>'), 'تاریخ مخرب پاک‌سازی شود');

// مقایسه با دورهٔ قبل.
assert.deepEqual(plusDelta(150, 100), { pct: 50, dir: 'up' });
assert.deepEqual(plusDelta(50, 100), { pct: 50, dir: 'down' });
assert.equal(plusDelta(10, 0), null, 'بدون دورهٔ قبل مقایسه نشود');

// دریافت متن اشتراکی: عنوان، لینک و فرار HTML.
const p = plusShareParse({ subject: '', text: 'عنوان خبر\nخط دوم <b>x</b>\nhttps://example.com/a?b=1' });
assert.equal(p.title, 'عنوان خبر');
assert.equal(p.url, 'https://example.com/a?b=1');
assert.ok(p.html.includes('&lt;b&gt;') && !p.html.includes('<b>'), 'HTML ورودی escape شود');
assert.ok(p.html.includes('<a href="https://example.com/a?b=1">'), 'لینک حفظ شود');
assert.equal(plusShareParse({ subject: 'S', text: 'T' }).title, 'S');

// لینک داخلی.
const links = [{ title: 'الف', url: 'https://x.test/a' }, { title: 'ب<', url: 'https://x.test/b' }];
assert.ok(plusLinkHtml(links, 'end').startsWith('<h3>'), 'حالت انتها زیرعنوان دارد');
assert.ok(plusLinkHtml(links, 'cursor').includes('، '), 'حالت درون‌خطی با ویرگول فارسی');
assert.ok(plusLinkHtml(links, 'end').includes('ب&lt;'), 'عنوان لینک escape شود');
assert.equal(plusLinkHtml([], 'end'), '');
console.log('آزمون منطق Plus (نمودار، مقایسه، اشتراک‌گذاری، لینک داخلی) با موفقیت پایان یافت.');
