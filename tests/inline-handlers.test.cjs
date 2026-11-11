// Guards two bug classes found in v3.9.0 (no dependencies, runs anywhere):
//  1) an inline handler (onclick="foo()") calls a function that is never defined (e.g. togglePin);
//  2) the name is shadowed by a property of `document` / the element, so the browser calls that
//     instead of our function (e.g. document.plugins made onclick="plugins()" throw).
const fs = require('fs'), path = require('path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'www');
const files = ['index.html', 'plus.js', 'editor.js', 'native.js', 'pro.js', 'ux.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8'));
const all = files.join('\n');
const SHADOW = new Set(['plugins','forms','images','links','scripts','anchors','embeds','applets','all','title','body','head','domain',
  'cookie','referrer','location','dir','URL','fonts','styleSheets','characterSet','designMode','open','close','write','writeln','clear',
  'select','submit','reset','focus','blur','click','remove','name','value','type','form','children','parentNode']);
const BUILTIN = new Set(['alert','confirm','prompt','event','if','return','typeof','void','new','function','await','async','parseInt','parseFloat',
  'encodeURIComponent','setTimeout','Number','String','Array','Object','Date','Math','JSON','Set','Map','Promise','fetch','this']);
const defined = new Set();
for (const m of all.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of all.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
for (const m of all.matchAll(/(?:window\.)?([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);
for (const m of all.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
const calls = new Set();
for (const m of all.matchAll(/\bon(?:click|change|input|submit|keydown|keyup|blur|focus)=\\?["']([^"']*?)\\?["']/g))
  for (const c of m[1].matchAll(/(?:^|[;{(\s,!&|?:])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const i = c.index + c[0].indexOf(c[1]); if (m[1][i - 1] === '.') continue; calls.add(c[1]);
  }
const bad = [];
for (const n of calls) {
  if (BUILTIN.has(n)) continue;
  if (SHADOW.has(n) && defined.has(n)) bad.push(`${n}: نام تابع با ویژگی document/عنصر هم‌نام است و در onclick اجرا نمی‌شود`);
  else if (!defined.has(n)) bad.push(`${n}: در هندلر inline صدا زده شده ولی تعریف نشده`);
}
if (bad.length) { console.error('خطا:\n' + bad.join('\n')); process.exit(1); }
console.log(`هندلرهای inline سالم‌اند (${calls.size} تابع بررسی شد).`);
