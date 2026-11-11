/* Site Manager Shield 4.7: Undo window for destructive actions, action journal, panic lock (shake), idle auto-lock. */
(function (root) {
  'use strict';
  const JKEY = 'smb_shield_journal', PKEY = 'smb_shield_prefs', MAX = 200, UNDO_MS = 8000;
  const PATH_RE = /(delete|trash|remove|destroy|refund|uninstall|deactivate|wipe|purge)/i;
  const ACT_RE = /^(delete|trash|remove|refund|purge|uninstall|deactivate|spam)$/i;
  const store = () => { try { return root.localStorage; } catch (_) { return null; } };
  const DEF = { undo: true, shake: true, idle: 5 };
  const IDLE_CHOICES = [0, 1, 2, 5, 15];
  const prefs = () => { try { const p = { ...DEF, ...JSON.parse(store().getItem(PKEY) || '{}') }; if (!IDLE_CHOICES.includes(p.idle)) p.idle = 0; return p; } catch (_) { return { ...DEF }; } };
  const setPref = (k, v) => { try { store().setItem(PKEY, JSON.stringify({ ...prefs(), [k]: k === 'idle' ? (IDLE_CHOICES.includes(+v) ? +v : 0) : !!v })); } catch (_) {} if (k === 'idle' && root.__smbIdleRearm) root.__smbIdleRearm(); };

  function isDestructive(path, body) {
    if (!body || typeof body !== 'object') return false;
    const p = String(path || '').split('?')[0];
    if (p.startsWith('/auth/')) return false;
    if (PATH_RE.test(p)) return true;
    if (ACT_RE.test(String(body.action || ''))) return true;
    return ['trash', 'delete'].includes(String(body.status || ''));
  }
  /* The journal keeps metadata only: never field values, keys, tokens or content. */
  function summarize(path, body) {
    const o = { path: String(path || '').split('?')[0].slice(0, 80) };
    if (body && typeof body === 'object') {
      o.fields = Object.keys(body).slice(0, 12);
      if (Array.isArray(body.ids)) o.n = body.ids.length;
      if (typeof body.action === 'string') o.action = body.action.slice(0, 30);
    }
    return o;
  }
  const readJ = () => { try { const a = JSON.parse(store().getItem(JKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  const addJ = e => { try { store().setItem(JKEY, JSON.stringify([...readJ(), e].slice(-MAX))); } catch (_) {} };
  const hostOf = () => { try { return new URL(S.url).host; } catch (_) { return ''; } };

  function makeShakeDetector(onShake, now = () => Date.now()) {
    let last = 0, first = 0, count = 0;
    return function (e) {
      const a = e && e.accelerationIncludingGravity; if (!a) return;
      const m = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      if (Math.abs(m - 9.8) < 22) return;
      const n = now(); if (n - last < 150) return;
      if (n - first > 1500) { count = 0; first = n; }
      last = n; count++;
      if (count >= 3) { count = 0; onShake(); }
    };
  }


  /* ---- Idle auto-lock: no touch/key/scroll for N minutes -> same lock as panic ---- */
  function makeIdleLock(onIdle, getMin, timers = { set: (f, ms) => { const h = setTimeout(f, ms); if (h && typeof h.unref === 'function') h.unref(); return h; }, clear: clearTimeout }, now = () => Date.now()) {
    let t = null, lastAct = now();
    const check = () => {
      t = null; const m = getMin(); if (!m) return;
      const left = m * 60000 - (now() - lastAct);
      if (left <= 500) onIdle(); else t = timers.set(check, left);
    };
    const arm = () => {
      if (t) { timers.clear(t); t = null; }
      const m = getMin(); if (!m) return;
      lastAct = now(); t = timers.set(check, m * 60000);
    };
    const touch = () => { lastAct = now(); if (!t) arm(); };
    return { arm, touch, stop() { if (t) timers.clear(t); t = null; } };
  }

  /* ---- Undo window ---- */
  function askUndo() {
    return new Promise(resolve => {
      const d = root.document; if (!d || !d.body) return resolve(true);
      let left = Math.ceil(UNDO_MS / 1000), done = false;
      const bar = d.createElement('div'), txt = d.createElement('span'), btn = d.createElement('button');
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:99;background:#1d2a25;color:#fff;border-radius:18px;padding:12px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px #0007';
      txt.style.cssText = 'flex:1'; btn.textContent = 'بازگردانی'; btn.type = 'button';
      btn.style.cssText = 'font:inherit;font-weight:700;border:0;border-radius:12px;padding:8px 14px;background:#ff7a59;color:#fff';
      bar.append(txt, btn); d.body.appendChild(bar);
      const finish = ok => { if (done) return; done = true; clearInterval(t); d.removeEventListener('visibilitychange', onHide); bar.remove(); resolve(ok); };
      const onHide = () => { if (d.hidden) finish(false); }; /* app left foreground: safest is to cancel */
      const tick = () => { txt.textContent = 'عملیات حساس تا ' + left + ' ثانیهٔ دیگر اجرا می‌شود'; if (left-- <= 0) finish(true); };
      const t = setInterval(tick, 1000); tick();
      btn.onclick = () => finish(false); d.addEventListener('visibilitychange', onHide);
    });
  }

  function install() {
    const orig = root.api; if (typeof orig !== 'function') return;
    root.api = async function (path, body) {
      if (!body) return orig.apply(this, arguments);
      const meta = { t: Date.now(), host: hostOf(), ...summarize(path, body) };
      if (prefs().undo && isDestructive(path, body) && !(await askUndo())) { addJ({ ...meta, r: 'cancelled' }); throw new Error('عملیات لغو شد؛ هیچ تغییری اعمال نشد'); }
      try { const r = await orig.apply(this, arguments); addJ({ ...meta, r: 'ok' }); return r; }
      catch (e) { addJ({ ...meta, r: 'error' }); throw e; }
    };
  }

  /* ---- Panic lock ---- */
  async function panic() {
    try { if (typeof ED !== 'undefined' && ED && ED.dirty && typeof edAutoSave === 'function') await Promise.race([Promise.resolve(edAutoSave()), new Promise(r => setTimeout(r, 1500))]); } catch (_) {}
    try {
      if (typeof nativeUnlocked !== 'undefined') nativeUnlocked = false;
      if (typeof sites !== 'undefined') sites.forEach(s => { if (s.secure) { s.key = ''; s.accessToken = ''; s.refreshToken = ''; } });
      if (typeof save === 'function') save();
      if (typeof nativeAdmin === 'function') { const A = nativeAdmin(); if (A && A.lock) A.lock(); }
      if (typeof apiMemo !== 'undefined') apiMemo.clear();
      if (typeof closeSheet === 'function') closeSheet(false);
    } catch (_) {}
    const d = root.document; if (!d || d.getElementById('smb-panic')) return;
    const o = d.createElement('div'); o.id = 'smb-panic'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.style.cssText = 'position:fixed;inset:0;z-index:999;background:#08130f;color:#fff;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;text-align:center;padding:24px';
    const h = d.createElement('div'), b = d.createElement('button');
    h.textContent = '🔒 برنامه قفل شد'; h.style.cssText = 'font-size:22px;font-weight:800';
    b.textContent = 'بازکردن با قفل دستگاه'; b.type = 'button';
    b.style.cssText = 'font:inherit;font-weight:700;border:0;border-radius:16px;padding:14px 22px;background:#14b88f;color:#fff';
    b.onclick = () => { o.remove(); try { boot(); } catch (_) {} };
    o.append(h, b); d.body.appendChild(o);
  }

  /* ---- UI ---- */
  const E = s => (typeof esc === 'function' ? esc(s) : String(s));
  const fmt = t => { try { return new Date(t).toLocaleString('fa-IR'); } catch (_) { return ''; } };
  root.smbPanic = panic;
  root.smbShieldSet = (k, v) => setPref(k, v);
  root.smbJournal = function () {
    const rows = readJ().slice(-60).reverse();
    const R = { ok: '✓', error: '✕', cancelled: '↩' };
    sheet(`<div class="row"><b class="sp">ژورنال عملیات این گوشی</b>${X()}</div>
      <p class="m">فقط ابرداده ثبت می‌شود (زمان، مسیر، تعداد)؛ هیچ کلید، رمز یا محتوایی ذخیره نمی‌شود.</p>
      <div class="cd">${rows.map(e => `<div class="fld"><div class="row"><b class="sp ltr">${E(R[e.r] || '')} ${E(e.path)}${e.action ? ' · ' + E(e.action) : ''}${e.n ? ' ×' + E(e.n) : ''}</b></div><div class="m">${E(fmt(e.t))} · ${E(e.host)}</div></div>`).join('') || '<div class="m">هنوز عملیاتی ثبت نشده.</div>'}</div>
      <div class="row" style="gap:8px"><button class="b sp" onclick="smbJournalCopy()">کپی گزارش</button><button class="b d sp" onclick="smbJournalClear()">پاک‌کردن</button></div>`);
  };
  root.smbJournalCopy = () => { const t = readJ().map(e => `${fmt(e.t)}\t${e.host}\t${e.r}\t${e.path}\t${e.action || ''}\t${e.n || ''}`).join('\n'); (root.navigator.clipboard ? root.navigator.clipboard.writeText(t).then(() => toast('کپی شد'), () => toast('کپی انجام نشد')) : toast('کپی انجام نشد')); };
  root.smbJournalClear = () => { if (confirm('ژورنال پاک شود؟')) { try { store().removeItem(JKEY); } catch (_) {} closeSheet(); toast('پاک شد'); } };
  root.smbShieldSettings = function () {
    const p = prefs();
    sheet(`<div class="row"><b class="sp">سپر امنیتی</b>${X()}</div>
      ${srow('مهلت بازگردانی ۸ ثانیه‌ای', 'sh_undo', p.undo, "smbShieldSet('undo',this.checked)", 'عملیات حذف/زباله‌دان/بازپرداخت قبل از اجرا ۸ ثانیه برای لغو نگه داشته می‌شود.')}
      ${srow('قفل فوری با تکان‌دادن', 'sh_shake', p.shake, "smbShieldSet('shake',this.checked)", 'سه تکان شدید پشت‌سرهم: پیش‌نویس ذخیره، کلیدها از حافظه پاک و برنامه قفل می‌شود.')}
      <div class="fld"><label>قفل خودکار هنگام بی‌فعالیتی</label><select onchange="smbShieldSet('idle',this.value)">${IDLE_CHOICES.map(m => `<option value="${m}"${p.idle === m ? ' selected' : ''}>${m ? m + ' دقیقه' : 'خاموش'}</option>`).join('')}</select><div class="m">پس از این مدت بدون لمس، همان قفل فوری اعمال می‌شود.</div></div>
      <button class="b p" style="width:100%;margin-top:10px" onclick="closeSheet();smbPanic()">🔒 قفل فوری همین حالا</button>`);
  };
  function addHub() {
    const _hub = root.hub; if (typeof _hub !== 'function') return;
    root.hub = function () {
      _hub.apply(this, arguments);
      try { document.getElementById('v').insertAdjacentHTML('beforeend', `<h3>سپر امنیتی</h3><div class="hub">${T('🔒', 'قفل فوری', 'smbPanic()', '#b91c1c', '#ef4444')}${T('🧾', 'ژورنال عملیات', 'smbJournal()', '#334155', '#64748b')}${T('🛡', 'تنظیمات سپر', 'smbShieldSettings()', '#0b7a62', '#14b88f')}</div>`); } catch (_) {}
    };
  }

  root.SMB_SHIELD = Object.freeze({ isDestructive, summarize, makeShakeDetector, makeIdleLock, journal: readJ, prefs });
  if (typeof addEventListener === 'function') {
    const det = makeShakeDetector(() => { if (prefs().shake) panic(); });
    addEventListener('devicemotion', det);
  }
  if (typeof addEventListener === 'function') {
    const idle = makeIdleLock(() => { if (root.document && !root.document.getElementById('smb-panic')) panic(); }, () => prefs().idle);
    root.__smbIdleRearm = idle.arm;
    ['touchstart', 'pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, idle.touch, { passive: true, capture: true }));
    idle.arm();
  }
  install(); addHub();
})(typeof window !== 'undefined' ? window : globalThis);
