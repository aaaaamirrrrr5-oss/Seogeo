/* Site Manager suite version 5.1.0 — app and Bridge plugin share one version number.
   Shows a non-blocking notice when the connected Bridge reports a different version. */
(function (root) {
  'use strict';
  const APP_VERSION = '5.1.0';
  const parse = v => { const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || '')); return m ? [+m[1], +m[2], +(m[3] || 0)] : null; };
  /* returns: 'ok' | 'bridge-old' | 'bridge-legacy' | 'app-old' | 'unknown' */
  function bridgeCompat(bridgeVer, appVer) {
    const b = parse(bridgeVer), a = parse(appVer || APP_VERSION);
    if (!b || !a) return 'unknown';
    if (b[0] < 4) return 'bridge-legacy';          /* pre-unification 3.x numbering */
    if (b[0] !== a[0]) return b[0] < a[0] ? 'bridge-old' : 'app-old';
    if (b[1] === a[1]) return 'ok';
    return b[1] < a[1] ? 'bridge-old' : 'app-old';
  }
  const MSG = {
    'bridge-legacy': v => 'افزونهٔ Bridge شما نسخهٔ قدیمی ' + v + ' است؛ برای هماهنگی کامل به ' + APP_VERSION + ' به‌روزرسانی کنید.',
    'bridge-old': v => 'نسخهٔ افزونهٔ Bridge (' + v + ') از اپ (' + APP_VERSION + ') قدیمی‌تر است؛ برخی قابلیت‌ها ممکن است کار نکنند.',
    'app-old': v => 'افزونهٔ Bridge (' + v + ') از اپ (' + APP_VERSION + ') جدیدتر است؛ اپ را به‌روزرسانی کنید.'
  };
  const warned = new Set();
  function install() {
    const orig = root.api; if (typeof orig !== 'function') return;
    root.api = async function (path) {
      const r = await orig.apply(this, arguments);
      try {
        if (String(path).split('?')[0] === '/ping' && r && r.bridge) {
          const k = String((root.S && root.S.url) || '') + '|' + r.bridge, c = bridgeCompat(r.bridge);
          if (MSG[c] && !warned.has(k) && typeof root.toast === 'function') { warned.add(k); root.toast(MSG[c](r.bridge)); }
        }
      } catch (_) {}
      return r;
    };
  }
  root.SMB_VERSION = Object.freeze({ app: APP_VERSION, bridgeCompat, parse });
  install();
})(typeof window !== 'undefined' ? window : globalThis);
