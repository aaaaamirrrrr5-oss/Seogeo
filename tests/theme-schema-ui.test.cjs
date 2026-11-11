const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const checks = [
  ['Theme settings page is reachable from Beano hub', html.includes('مدیریت عمومی تنظیمات پوسته') && html.includes('onclick="themeSchemaView()"')],
  ['Schema endpoint is requested', html.includes("api('/theme/schema')")],
  ['Registered Settings API is used for reading', html.includes("api('/registered-settings')")],
  ['Writes require explicit confirmation', html.includes("confirm('تنظیمات ثبت‌شده انتخاب‌شده ذخیره شوند؟')")],
  ['Writes use the registered-settings endpoint', html.includes("api('/registered-settings',{confirm:true,changes})")],
  ['Boolean control exists', html.includes("f.type==='boolean'")],
  ['Enum control exists', html.includes('f.enum?.length')],
  ['JSON validation exists', html.includes("JSON.parse(el.value)")],
  ['No direct theme file editing endpoint is introduced', !html.includes('/theme/files')],
];
let failed = 0;
for (const [name, ok] of checks) {
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${name}\n`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
