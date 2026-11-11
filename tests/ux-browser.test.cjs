// آزمون واقعی مرورگر (Chromium بدون سر): ورود با http، میانبرهای صفحهٔ اول، گروه‌های تاشو.
// اگر playwright در دسترس نباشد آزمون «SKIP» می‌شود (CI پروژه آن را نصب نمی‌کند).
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIP: playwright نصب نیست'); process.exit(0); }
const path = require('path'), assert = require('assert');
const URL_INDEX = 'file://' + path.join(__dirname, '..', 'www', 'index.html');
const stub = p => {
  if (p === '/ping') return { name: 'دمو', wp: '7.1', theme: 'demo', wc: true, statuses: { 'wc-processing': 'در حال انجام' }, currency: 'IRT', bridge: '5.0.0' };
  if (p === '/types') return [];
  if (p === '/dash') return { today: 0, today_orders: 0, month: 0, days: {}, counts: {}, posts: 3, comments: 2, updates: 1, out_of_stock: 0, comments_access: true, content_write_access: true, coupons_access: true, media_write_access: true, orders_access: true, orders_create_access: true, page_write_access: true, plugins_access: true, product_write_access: true, settings_access: true, updates_access: true, users_access: true };
  if (p === '/orders') return { items: [], pages: 1 };
  if (p === '/admin-catalog') return { modules: { woocommerce: true }, types: [], taxonomies: [], counts: {}, site: { name: 'دمو', wp: '7.1' } };
  if (p === '/admin-menu') return { items: [] };
  if (p === '/beano/sections' || p === '/sections') return null;
  return {};
};
let n = 0; const ok = (m) => { n++; console.log('PASS ' + m); };
// هر ویژگی onclick/onchange/... باید به‌عنوان کد جاوااسکریپت قابل‌کامپایل باشد (باگ «ویژگی بریده‌شده» را می‌گیرد).
const badHandlers = page => page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[onclick],[onchange],[oninput],[onkeydown]').forEach(el => ['onclick', 'onchange', 'oninput', 'onkeydown'].forEach(a => {
    const v = el.getAttribute(a); if (!v) return; try { new Function('event', v); } catch (e) { out.push(a + ': ' + v.slice(0, 60)); }
  }));
  return out;
});
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 420, height: 900 } }), page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const hits = [];
  await page.route('http://demo.test/**', route => {
    const u = new URL(route.request().url()), rest = u.searchParams.get('rest_route') || '', p = rest.replace('/smb/v3', '');
    hits.push(p); const body = stub(p);
    if (body === null) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'no route' }) });
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) });
  });
  await page.goto(URL_INDEX);
  await page.waitForSelector('#u');
  await page.fill('#u', 'example.com'); assert.ok((await page.locator('#uh').getAttribute('class')).includes('ok')); await page.fill('#u', 'ftp://x.com'); assert.ok((await page.locator('#uh').getAttribute('class')).includes('bad')); await page.fill('#u', 'http://x.com'); assert.ok((await page.locator('#uh').getAttribute('class')).includes('warn')); ok('راهنمای زندهٔ آدرس: HTTPS امن / HTTP هشدار / پروتکل نامعتبر خطا');
  assert.strictEqual(await page.locator('#k').getAttribute('type'), 'password'); await page.click('.kt'); assert.strictEqual(await page.locator('#k').getAttribute('type'), 'text'); await page.click('.kt'); assert.strictEqual(await page.locator('#k').getAttribute('type'), 'password'); ok('نمایش/پنهان‌کردن کلید اتصال');
  let dialogMsg = ''; page.on('dialog', d => { dialogMsg = d.message(); d.accept(); });
  await page.fill('#u', 'http://demo.test'); await page.fill('#k', 'test-key-123'); await page.click('text=اتصال امن');
  await page.waitForSelector('.qa-b', { timeout: 8000 });
  assert.ok(dialogMsg.includes('HTTPS ندارد'), 'هشدار HTTP نمایش داده نشد'); ok('ورود با http:// با هشدار تأیید و اتصال به /ping');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sites3'))[0]); assert.strictEqual(saved.url, 'http://demo.test'); assert.strictEqual(saved.http, true); ok('سایت با نشانهٔ http ذخیره شد');
  assert.strictEqual(await page.locator('.qa-b').count(), 8); assert.ok((await page.locator('.qa-b').first().textContent()).includes('سفارش‌ها')); ok('هشت میانبر صفحهٔ اول، اولی «سفارش‌ها»');
  await page.click('text=ویرایش میانبرها'); await page.waitForSelector('.uxq');
  await page.locator('.uxq[value="newpost"]').uncheck(); await page.click('text=ذخیره چیدمان'); await page.waitForFunction(() => document.querySelectorAll('.qa-b').length === 7);
  ok('ویرایش میانبرها: حذف یکی ← ۷ میانبر و ماندگار'); await page.reload(); await page.waitForSelector('.qa-b'); assert.strictEqual(await page.locator('.qa-b').count(), 7); ok('انتخاب میانبرها بعد از بازکردن دوباره حفظ شد');
  await page.click('text=ویرایش میانبرها'); await page.waitForSelector('.qa-sort'); const first0 = await page.locator('.qa-sort').first().getAttribute('data-id');
  await page.locator('.qa-sort').first().locator('button[aria-label="پایین بردن"]').click(); const first1 = await page.locator('.qa-sort').first().getAttribute('data-id'); assert.notStrictEqual(first0, first1);
  await page.click('text=ذخیره چیدمان'); await page.waitForFunction(() => document.querySelectorAll('.qa-b').length === 7);
  const firstTile = await page.locator('.qa-b').first().getAttribute('onclick'); assert.ok(!firstTile.includes('go(\'orders\')'), 'ترتیب جدید اعمال نشد'); ok('سازمان‌دهی داشبورد: جابه‌جایی با فلش و ذخیرهٔ ترتیب');
  await page.click('text=ویرایش میانبرها'); await page.waitForSelector('#uxq_cnt'); assert.ok((await page.locator('.sheet').innerText()).includes('سازمان‌دهی داشبورد')); assert.ok(!(await page.locator('.sheet').innerText()).includes('SMART')); assert.ok((await page.locator('#uxq_cnt').innerText()).includes('از')); const c0 = await page.locator('#uxq_cnt').innerText(); await page.locator('.uxq:checked').first().uncheck(); assert.notStrictEqual(c0, await page.locator('#uxq_cnt').innerText()); await page.keyboard.press('Escape'); await page.evaluate(() => closeSheet()); ok('سازمان‌دهنده: عنوان فارسی و شمارندهٔ زندهٔ انتخاب');
  assert.strictEqual(await page.locator(`.qa-b[onclick*="postEdit(0,'post')"]`).count(), 0); ok('میانبر حذف‌شده («نوشتهٔ جدید») دیگر نمایش داده نمی‌شود');
  await page.click(`.qa-b[onclick*="go('orders')"]`); await page.waitForSelector('.top h1:has-text("سفارش")'); assert.strictEqual(await page.locator('.qa').count(), 0); ok('دکمهٔ میانبر «سفارش‌ها» صفحهٔ سفارش‌ها را باز می‌کند');
  await page.click('.nav button:has-text("بیشتر")'); await page.waitForSelector('details.hg');
  const total = await page.locator('details.hg').count(), open = await page.locator('details.hg[open]').count(); assert.ok(total >= 4 && open === 1, `groups=${total} open=${open}`); ok(`صفحهٔ «بیشتر»: ${total} گروه تاشو، فقط اولی باز`);
  await page.fill('#hq', 'افزونه'); const vis = await page.locator('details.hg:visible').count(); assert.ok(vis >= 1 && vis < total); assert.ok(await page.locator('details.hg[open]:visible').count() >= 1); ok('جست‌وجوی دکمه‌ها گروه‌های نامرتبط را پنهان می‌کند');
  await page.fill('#hq', ''); assert.deepStrictEqual(await badHandlers(page), []); ok('همهٔ هندلرهای inline صفحهٔ «بیشتر» قابل‌اجرایند');
  await page.click('.nav button:has-text("وردپرس")'); await page.waitForSelector('#wp_feature_groups .wp-group-title');
  const grids = await page.locator('#wp_feature_groups .wp-grid').count(), col = await page.locator('#wp_feature_groups .wp-grid.wp-collapsed').count(); assert.ok(grids > 2 && col === grids - 2, `grids=${grids} collapsed=${col}`); ok('صفحهٔ «وردپرس»: دو گروه اول باز، بقیه بسته');
  assert.deepStrictEqual(await badHandlers(page), []); ok('همهٔ ۴۸ کارت «وردپرس» هندلر سالم دارند (باگ ویژگی بریده‌شده)');
  hits.length = 0; await page.locator('#wp_feature_groups .wp-card[onclick*="\\"themes\\""], #wp_feature_groups .wp-card:has-text("پوسته")').first().evaluate(e => e.click()); await page.waitForTimeout(700); assert.ok(hits.includes('/themes'), 'کلیک کارت پوسته‌ها API را صدا نزد: ' + hits.join(',')); ok('کلیک روی کارت «پوسته‌ها» واقعاً صفحه و API را باز می‌کند');
  await page.click('.nav button:has-text("وردپرس")'); await page.waitForSelector('#wp_feature_groups .wp-group-title');
  await page.locator('#wp_feature_groups .wp-group-title').nth(2).click(); assert.strictEqual(await page.locator('#wp_feature_groups .wp-grid.wp-collapsed').count(), col - 1); ok('کلیک روی عنوان گروه آن را باز می‌کند');
  await page.fill('#wp_global_q', 'کاربر'); assert.strictEqual(await page.locator('#wp_feature_groups .wp-grid.wp-collapsed').count(), 0); await page.fill('#wp_global_q', ''); ok('جست‌وجو همهٔ گروه‌ها را باز می‌کند و پاک‌کردن آن‌ها را برمی‌گرداند');
  assert.deepStrictEqual(errors, [], 'خطای جاوااسکریپت: ' + errors.join(' | ')); ok('هیچ خطای جاوااسکریپتی در جریان رخ نداد');
  await b.close(); console.log(`\n${n} آزمون مرورگر موفق بود.`);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
