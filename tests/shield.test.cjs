const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/../www/shield.js', 'utf8');
const ok = (n, f) => Promise.resolve(f()).then(() => console.log('PASS ' + n));

function sandbox() {
  const mem = {}, listeners = {}, calls = [];
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, URL, Promise,
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    addEventListener: (t, f) => { listeners[t] = f; },
    S: { url: 'https://example.com' }, esc: s => String(s),
    api: async (p, b) => { calls.push([p, b]); return { ok: true }; },
    hub() {},
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx);
  return { ctx, mem, listeners, calls, SH: ctx.SMB_SHIELD };
}

(async () => {
  await ok('destructive detection: deletes/refunds yes; saves, autofix, auth no', () => {
    const { SH } = sandbox();
    assert.equal(SH.isDestructive('/posts/delete', { id: 1 }), true);
    assert.equal(SH.isDestructive('/orders/5/refund', { amount: 1 }), true);
    assert.equal(SH.isDestructive('/bulk', { action: 'trash', ids: [1] }), true);
    assert.equal(SH.isDestructive('/posts/5', { status: 'trash' }), true);
    assert.equal(SH.isDestructive('/bulk', { action: 'autofix', ids: [1] }), false);
    assert.equal(SH.isDestructive('/posts/5', { title: 'x' }), false);
    assert.equal(SH.isDestructive('/auth/logout', { a: 1 }), false);
    assert.equal(SH.isDestructive('/posts/delete', null), false);
  });

  await ok('journal stores metadata only (no values, keys, tokens) and passes writes through', async () => {
    const { ctx, mem, calls, SH } = sandbox();
    ctx.localStorage.setItem('smb_shield_prefs', JSON.stringify({ undo: false }));
    await ctx.api('/posts/5', { title: 'SECRET TITLE', key: 'TOPSECRET' });
    assert.equal(calls.length, 1);
    const raw = mem.smb_shield_journal;
    assert.doesNotMatch(raw, /SECRET|TOPSECRET/);
    const j = SH.journal();
    assert.equal(j.length, 1); assert.equal(j[0].r, 'ok'); assert.equal(JSON.stringify(j[0].fields), JSON.stringify(['title', 'key'])); assert.equal(j[0].host, 'example.com');
  });

  await ok('reads are not journaled', async () => {
    const { ctx, SH } = sandbox();
    await ctx.api('/ping'); assert.equal(SH.journal().length, 0);
  });

  await ok('failed writes are journaled as error and rethrown', async () => {
    const mem = {};
    const c = { console, setTimeout, clearTimeout, setInterval, clearInterval, URL, Promise, localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem() {} }, addEventListener() {}, S: { url: 'https://a.io' }, api: async () => { throw new Error('boom'); }, hub() {} };
    c.window = c; vm.createContext(c); vm.runInContext(code, c);
    c.localStorage.setItem('smb_shield_prefs', JSON.stringify({ undo: false }));
    await assert.rejects(c.api('/posts/1', { a: 1 }), /boom/);
    assert.equal(c.SMB_SHIELD.journal()[0].r, 'error');
  });

  await ok('shake detector needs 3 strong shakes inside 1.5s; gentle motion ignored', () => {
    const { SH } = sandbox();
    let t = 0, fired = 0;
    const det = SH.makeShakeDetector(() => fired++, () => t);
    const strong = { accelerationIncludingGravity: { x: 30, y: 20, z: 10 } };
    const soft = { accelerationIncludingGravity: { x: 0, y: 9.8, z: 1 } };
    for (let i = 0; i < 10; i++) { t += 200; det(soft); }
    assert.equal(fired, 0);
    t += 1000; det(strong); t += 200; det(strong); assert.equal(fired, 0); t += 200; det(strong); assert.equal(fired, 1);
    t += 5000; det(strong); t += 1600; det(strong); t += 1600; det(strong); assert.equal(fired, 1, 'slow shakes do not trigger');
  });

  await ok('undo window: hidden app cancels destructive write and no request is sent', async () => {
    const { ctx, calls, SH } = sandbox();
    const listeners = [];
    const mk = () => ({ style: {}, setAttribute() {}, append() {}, remove() {}, set textContent(v) {}, set onclick(f) { this._c = f; } });
    ctx.document = { body: { appendChild() {} }, hidden: false, createElement: mk, addEventListener: (t, f) => listeners.push(f), removeEventListener() {}, getElementById: () => null };
    const p = ctx.api('/posts/delete', { id: 3 });
    await new Promise(r => setTimeout(r, 20));
    ctx.document.hidden = true; listeners.forEach(f => f());
    await assert.rejects(p, /لغو شد/);
    assert.equal(calls.length, 0);
    assert.equal(SH.journal()[0].r, 'cancelled');
  });

  await ok('idle lock: fires after N minutes of inactivity, activity postpones it, 0 = off', () => {
    const { SH } = sandbox();
    let now = 0, fired = 0, min = 1; const q = [];
    const timers = { set: (f, ms) => { const h = { f, at: now + ms }; q.push(h); return h; }, clear: h => { const i = q.indexOf(h); if (i >= 0) q.splice(i, 1); } };
    const run = to => { now = to; for (let g = 0; g < 10; g++) { const d = q.filter(h => h.at <= now).sort((a, b) => a.at - b.at)[0]; if (!d) break; q.splice(q.indexOf(d), 1); d.f(); } };
    const L = SH.makeIdleLock(() => fired++, () => min, timers, () => now);
    L.arm(); run(59000); assert.equal(fired, 0);
    now = 50000; L.touch(); run(61000); assert.equal(fired, 0, 'activity postponed the lock');
    run(111000); assert.equal(fired, 1, 'locks 1 min after last activity');
    min = 0; L.arm(); assert.equal(q.length, 0); run(10 ** 7); assert.equal(fired, 1, 'disabled = never fires');
  });

  await ok('idle pref accepts only known values; default is 5 minutes, 0 = off', () => {
    const { ctx, SH } = sandbox();
    assert.equal(SH.prefs().idle, 5, 'secure default');
    ctx.smbShieldSet('idle', 0); assert.equal(SH.prefs().idle, 0);
    ctx.smbShieldSet('idle', 5); assert.equal(SH.prefs().idle, 5);
    ctx.smbShieldSet('idle', 7); assert.equal(SH.prefs().idle, 0, 'unknown value falls back to off');
    ctx.smbShieldSet('undo', false); assert.equal(SH.prefs().undo, false);
  });
})().catch(e => { console.error(e); process.exit(1); });
