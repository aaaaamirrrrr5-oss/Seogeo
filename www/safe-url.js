/* Site Manager — URL safety (4.9): allow-list for links built from site data + global click guard for script-bearing URLs. */
(function (root) {
  'use strict';
  const strip = s => String(s == null ? '' : s).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  /* Only absolute http(s) URLs are usable as hrefs built from remote data; anything else becomes '#'. */
  function safeHref(u) {
    const raw = String(u == null ? '' : u).trim();
    if (/^https?:\/\/[^\s]+$/i.test(raw) && !/^https?:\/\/[^/]*@/i.test(raw)) return raw;
    return '#';
  }
  /* Blocks javascript:/vbscript:/data:text/html hidden behind whitespace, control chars or mixed case. */
  function isScriptUrl(u) {
    const s = strip(u).toLowerCase();
    return s.startsWith('javascript:') || s.startsWith('vbscript:') || s.startsWith('data:text/html') || s.startsWith('data:application/xhtml');
  }
  root.SMB_SAFEURL = Object.freeze({ safeHref, isScriptUrl });
  root.safeHref = safeHref;
  if (root.document && root.document.addEventListener) {
    root.document.addEventListener('click', e => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a && isScriptUrl(a.getAttribute('href'))) {
        e.preventDefault(); e.stopPropagation();
        if (typeof root.toast === 'function') root.toast('پیوند ناامن مسدود شد');
      }
    }, true);
  }
})(typeof window !== 'undefined' ? window : globalThis);
