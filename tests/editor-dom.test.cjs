const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function main() {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://example.test',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const w = dom.window;

  try {
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    w.document.execCommand = () => true;
    w.confirm = () => true;
    w.toast = () => {};

    // Run the page and app scripts in one shared global lexical environment.
    // This mirrors a browser page and keeps top-level let/const bindings shared.
    const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]);
    assert.ok(blocks.length > 0, 'اسکریپت اصلی رابط پیدا شود');
    const editor = fs.readFileSync(path.join(__dirname, '../www/editor.js'), 'utf8');
    const plus = fs.readFileSync(path.join(__dirname, '../www/plus.js'), 'utf8');
    const sources = [...blocks.map(s => s.replace(/\bboot\(\);\s*$/, '')), editor, plus];
    sources.push(`
      window.__setEditorDomTestState = (state) => {
        if (Object.prototype.hasOwnProperty.call(state, 'S')) S = state.S;
        if (Object.prototype.hasOwnProperty.call(state, 'info')) info = state.info;
        if (Object.prototype.hasOwnProperty.call(state, 'types')) types = state.types;
        if (Object.prototype.hasOwnProperty.call(state, 'L')) L = state.L;
      };
    `);
    w.eval(sources.join('\n;\n'));

    assert.equal(typeof w.openSec, 'function', 'بازکردن بخش‌های پوسته تعریف شده باشد');
    assert.equal(typeof w.postEditor, 'function', 'تابع بازکردن ویرایشگر بارگذاری شود');
    assert.equal(typeof w.edSave, 'function', 'تابع ذخیره بارگذاری شود');
    assert.equal(typeof w.lBulk, 'function', 'عملیات گروهی بارگذاری شود');
    assert.equal(typeof w.autoAll, 'function', 'بهینه‌سازی گروهی بارگذاری شود');

    const block = '<!-- wp:paragraph --><p>متن بلوکی</p><!-- /wp:paragraph -->';
    const fixture = {
      id: 42, title: 'مقاله آزمون', type: 'post', status: 'draft', content: block, excerpt: '', slug: 'test-post',
      cats: [], all_cats: [], all_tags: [], tags: '', parent: 0, template: '', menu_order: 0,
      author_id: 1, format: 'standard', custom_fields: {}, date_raw: '2026-11-08T12:00', future: false,
      sticky: false, comment_status: 'open', thumb_id: 0, thumb: '', link: '', seo: { title: '', desc: '', kw: '', engine: '' },
      modified_gmt: '2026-11-08 10:00:00', words: 2, checks: []
    };
    let saved = null;
    w.api = async (url, body) => {
      if (url.startsWith('/posts/42') && body) {
        saved = body;
        return { ...fixture, ...body, id: 42, status: body.status || 'draft' };
      }
      if (url.startsWith('/posts/42')) return fixture;
      throw new Error(`درخواست پیش‌بینی‌نشده در آزمون: ${url}`);
    };
    w.__setEditorDomTestState({
      S: { url: 'https://example.test', key: 'test-key' },
      info: { wc: false, currency: 'تومان', statuses: {} },
      types: []
    });

    await w.edOpen('post', 42, 'post');
    assert.ok(w.document.querySelector('#plus_sg'), 'کارت پیشنهادهای هوشمند سئو در ویرایشگر تزریق شود');
    assert.ok(w.document.querySelector('#plus_adv'), 'کارت سئوی پیشرفته در ویرایشگر تزریق شود');
    assert.equal(typeof w.autoNight, 'function', 'صفحهٔ خودکارسازی شبانه تعریف شود');
    assert.equal(typeof w.reports, 'function', 'گزارش نمودار تعریف شود');
    assert.equal(w.document.querySelector('#e_html').value, block, 'محتوای Gutenberg بدون حذف کامنت‌ها بارگیری شود');
    assert.equal(w.document.querySelector('#e_html').readOnly, true, 'منبع Gutenberg در حالت امن فقط‌خواندنی باشد');
    assert.equal(w.edHtml(), block, 'خروجی ذخیره‌سازی Gutenberg عیناً حفظ شود');
    const ok = await w.edSave(null, true);
    assert.equal(ok, true, 'ذخیرهٔ مقاله آزمون با موفقیت برگردد');
    assert.ok(saved, 'درخواست ذخیره به API ارسال شده باشد');
    assert.equal(saved.content, block, 'ذخیره، کامنت‌های wp را دست‌نخورده نگه دارد');

    // Set the lexical L binding used by editor.js, not merely window.L.
    w.__setEditorDomTestState({
      L: { kind: 'post', type: 'post', page: 1, sel: new Set([42]), selecting: true, items: [] }
    });
    let bulkPayload = null;
    w.api = async (url, body) => {
      assert.equal(url, '/bulk');
      bulkPayload = body;
      return { done: 0, changes: [] };
    };
    w.lLoad = () => {};
    await w.lBulk('delete');
    assert.equal(bulkPayload.confirm, true, 'حذف گروهی فقط با تأیید صریح درخواست شود');

    console.log('آزمون DOM ویرایشگر، حفظ Gutenberg، ذخیره و تأیید حذف گروهی با موفقیت پایان یافت.');
  } finally {
    // edOpen installs a 40-second autosave interval. Always clear it so a
    // failed assertion cannot leave the GitHub Actions runner hanging.
    try {
      if (w.ED && w.ED.auto) w.clearInterval(w.ED.auto);
      if (typeof w.edClose === 'function' && w.ED) w.edClose(true);
    } catch (_) {}
    dom.window.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
