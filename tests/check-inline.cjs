const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]);
if (!blocks.length) throw new Error('اسکریپت اصلی در index.html پیدا نشد');
blocks.forEach((code, i) => new vm.Script(code, { filename: `index-inline-${i + 1}.js` }));
console.log(`بررسی نحوی ${blocks.length} بلوک اسکریپت درون‌صفحه‌ای موفق بود.`);
