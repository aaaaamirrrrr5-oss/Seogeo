#!/usr/bin/env node
/* Usage: node scripts/set-version.cjs X.Y.Z  — updates every place that carries the suite version. */
const fs = require('fs'), path = require('path');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('usage: set-version.cjs X.Y.Z'); process.exit(1); }
const R = p => path.join(__dirname, '..', p);
const edit = (p, f) => { const s = fs.readFileSync(R(p), 'utf8'), n = f(s); if (n === s) console.warn('unchanged: ' + p); fs.writeFileSync(R(p), n); };
fs.writeFileSync(R('VERSION'), v + '\n');
edit('package.json', s => s.replace(/("version":\s*")[^"]+/, '$1' + v));
edit('www/version.js', s => s.replace(/(const APP_VERSION = ')[^']+/, '$1' + v).replace(/(suite version )\d+\.\d+\.\d+/, '$1' + v));
const B = 'bridge/site-manager-bridge/site-manager-bridge.php';
if (fs.existsSync(R(B))) { edit(B, s => s.replace(/^(Version: )\S+/m, '$1' + v).replace(/(const VER = ')[^']+/, '$1' + v)); fs.writeFileSync(R('bridge/site-manager-bridge/VERSION'), v + '\n'); }
console.log('set to ' + v + ' — now add CHANGELOG entries and run: npm test');
