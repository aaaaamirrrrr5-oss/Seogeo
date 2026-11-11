const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const checks = [
  ['scanner UI exists', html.includes('async function capabilityScanner()')],
  ['scanner calls bridge manifest', html.includes("api('/capabilities')")],
  ['scanner renders discovered post types', html.includes('d.post_types')],
  ['scanner renders discovered taxonomies', html.includes('d.taxonomies')],
  ['system inventory uses separate endpoint', html.includes("api('/system')")],
  ['scanner is reachable from WordPress hub', html.includes('capabilityScanner()')],
  ['Beano adapter status is displayed', html.includes('beano_adapter')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`${checks.length} checks; ${failed} failed.`);
process.exit(failed ? 1 : 0);
