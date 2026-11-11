/* Site Manager 4.0 — real diagnostics and encrypted configuration backup. */
(function () {
  'use strict';
  const tr = (s) => window.SMB_I18N?.t(s) || s;
  const status = (kind, label) => `<span class="uc-status ${kind || ''}">${esc(label)}</span>`;
  const row = (icon, title, detail, state, label) => `<div class="ultimate-row"><div class="uc-icon">${icon}</div><div class="uc-copy"><b>${esc(title)}</b><small>${esc(detail)}</small></div>${status(state, label)}</div>`;

  let centerRequest = 0;
  window.openUltimateCenter = async function () {
    const requestId = ++centerRequest;
    shell('مرکز کنترل حرفه‌ای', '<div class="ld">در حال بررسی وضعیت واقعی برنامه و سایت…</div>', 'hub()');
    const host = $('#v');
    const checks = await Promise.allSettled([api('/site-health'), api('/updates')]);
    if (requestId !== centerRequest || $('#v') !== host) return;
    const health = checks[0].status === 'fulfilled' ? checks[0].value : null;
    const updates = checks[1].status === 'fulfilled' ? checks[1].value : null;
    const native = isNative();
    const secure = String(S?.url || '').startsWith('https://');
    const language = window.SMB_I18N?.language || 'fa';
    const theme = document.documentElement.dataset.theme || 'light';
    const online = navigator.onLine !== false;
    const healthCount = health?.items?.length || 0;
    const updateCount = (updates?.core?.length || 0) + (updates?.plugins?.length || 0) + (updates?.themes?.length || 0);
    const healthState = health ? ((health.items || []).some(x => x.ok === false) ? 'warn' : '') : 'warn';
    const healthLabel = health ? (healthState ? 'نیازمند بررسی' : 'پاسخ دریافت شد') : 'دسترسی نامشخص';
    const updateLabel = updates ? (updateCount ? `${fa(updateCount)} مورد` : 'به‌روز') : 'دسترسی نامشخص';
    $('#v').innerHTML = `
      <section class="ultimate-hero"><div class="uc-kicker">SITE MANAGER · PROFESSIONAL EDITION</div><h2>مرکز فرماندهی سایت‌ها</h2><div style="opacity:.86;font-size:12px">نمای زنده از اتصال فعلی، محیط اجرا و ابزارهای نگهداری</div><div class="wp-meta"><span>${esc(S?.name || 'سایت انتخاب‌شده')}</span><span>${secure ? 'HTTPS' : 'HTTP / نامشخص'}</span><span>${native ? 'Android Native' : 'Web Preview'}</span></div></section>
      <div class="ultimate-grid">
        <div class="ultimate-stat"><small>سایت‌های ثبت‌شده</small><b>${fa(sites.length)}</b></div>
        <div class="ultimate-stat"><small>وضعیت اینترنت</small><b>${online ? 'متصل' : 'آفلاین'}</b></div>
        <div class="ultimate-stat"><small>وضعیت سلامت API</small><b>${health ? `${fa(healthCount)} شاخص` : 'نامشخص'}</b></div>
        <div class="ultimate-stat"><small>به‌روزرسانی‌ها</small><b>${esc(updateLabel)}</b></div>
      </div>
      <section class="cd"><h3>وضعیت محیط و امنیت</h3>
        ${row('🔗','اتصال سایت',S?.url || '—',secure ? '' : 'warn',secure ? 'رمزنگاری‌شده' : 'HTTPS توصیه می‌شود')}
        ${row('📱','محیط اجرا',native ? 'اپلیکیشن اندروید' : 'مرورگر / پیش‌نمایش',native ? '' : 'warn',native ? 'بومی' : 'وب')}
        ${row('🌐','زبان رابط',language.toUpperCase(),'',language === 'fa' ? 'فارسی' : language === 'ar' ? 'عربی' : 'انگلیسی')}
        ${row('🎨','پوسته رابط',theme,'',theme === 'dark' ? 'تیره' : 'روشن')}
        ${row('🩺','بررسی سلامت وردپرس',health ? 'Endpoint پاسخ داده است' : 'بررسی در دسترس نیست',healthState,healthLabel)}
        ${row('⬆️','بررسی نسخه‌ها',updates ? 'اطلاعات به‌روزرسانی دریافت شد' : 'بررسی در دسترس نیست',updates ? '' : 'warn',updateLabel)}
      </section>
      <h3>ابزارهای حرفه‌ای</h3>
      <div class="uc-actions">
        <button class="b" onclick="siteHealth()">🩺 سلامت سایت</button>
        <button class="b" onclick="securityKeys()">🔐 امنیت و نشست‌ها</button>
        <button class="b" onclick="updatesView()">⬆️ به‌روزرسانی‌ها</button>
        <button class="b" onclick="activityView()">📋 گزارش فعالیت</button>
      </div>
      <h3>پشتیبان‌گیری امن</h3>
      <div class="cd"><p class="m">از فهرست سایت‌ها، کلیدهای اصلی اتصال و تنظیمات ظاهری یک فایل رمزگذاری‌شده می‌سازیم. توکن‌های نشست دستگاه منتقل نمی‌شوند و پس از بازیابی دوباره صادر می‌شوند. فایل فقط با گذرواژه‌ای که انتخاب می‌کنید باز می‌شود.</p><div class="uc-actions"><button class="b p" onclick="SMB40.exportBackup()">🔒 ساخت پشتیبان رمزگذاری‌شده</button><button class="b" onclick="SMB40.chooseImport()">📥 بازیابی پشتیبان</button></div></div>
      <div class="uc-note"><b>شفافیت نسخه:</b> این مرکز وضعیت قابلیت‌های قابل دسترس را نشان می‌دهد؛ داشبورد تجمیعی چندفروشگاهی، دستیار AI و گردش تأیید نیازمند تکمیل Bridge سمت وردپرس و اتصال سرویس مربوطه هستند و در این صفحه به‌صورت ساختگی نمایش داده نمی‌شوند.</div>
      <button class="b" style="width:100%;margin-top:12px" onclick="openUltimateCenter()">↻ بازآزمایی وضعیت</button>`;
  };

  const download = (name, content) => {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const askPassword = (title, action) => sheet(`<div class="row"><b class="sp">${title}</b>${X()}</div><label class="l">گذرواژه پشتیبان (حداقل ۱۲ نویسه)</label><input id="uc_pass" type="password" autocomplete="new-password" minlength="12"><label class="l">تکرار گذرواژه</label><input id="uc_pass2" type="password" autocomplete="new-password" minlength="12"><p class="m">این گذرواژه در سرور یا برنامه ذخیره نمی‌شود. آن را در جای امن نگه دارید؛ بدون آن بازیابی ممکن نیست.</p><button class="b p" style="width:100%" onclick="${action}()">ادامه</button>`);

  window.SMB40 = {
    async exportBackup() {
      askPassword('ساخت پشتیبان رمزگذاری‌شده', 'SMB40.confirmExport');
    },
    async confirmExport() {
      const pass = $('#uc_pass')?.value || '', confirmPass = $('#uc_pass2')?.value || '';
      if (pass.length < 12) return toast('گذرواژه باید حداقل ۱۲ نویسه باشد');
      if (pass !== confirmPass) return toast('تکرار گذرواژه یکسان نیست');
      try {
        const entries = [];
        for (const original of sites) {
          const s = { ...original };
          if (isNative() && s.secure) {
            if (!await hydrateSiteKey(s)) throw new Error(`کلید سایت «${s.name}» در ذخیره‌ساز امن در دسترس نیست`);
          }
          if (!s.key) throw new Error(`کلید اصلی سایت «${s.name}» قابل بازیابی نیست؛ اتصال را دوباره با کلید اصلی برقرار کنید`);
          entries.push({ id: siteId(s), name: String(s.name || '').slice(0, 120), url: s.url, http: !!s.http, secure: !!s.secure, credentials: { key: s.key || '' } });
        }
        if (!entries.length || entries.length > 100) throw new Error('تعداد سایت‌ها باید بین ۱ تا ۱۰۰ باشد');
        const payload = { app: 'Site Manager Android', format: 'smb-config', version: 1, createdAt: new Date().toISOString(), currentIndex: cur, sites: entries, uiPrefs: { theme: uiPrefs.theme || 'system', language: uiPrefs.language || 'fa', fontSize: Number(uiPrefs.fontSize || 15) } };
        const envelope = await window.SMB_BACKUP_CRYPTO.encrypt(payload, pass);
        download(`site-manager-backup-${new Date().toISOString().slice(0,10)}.smbbackup`, JSON.stringify(envelope));
        closeSheet(); toast('پشتیبان رمزگذاری‌شده ساخته شد');
      } catch (e) { toast(`ساخت پشتیبان ناموفق بود: ${e.message}`); }
    },
    chooseImport() {
      sheet(`<div class="row"><b class="sp">بازیابی پشتیبان</b>${X()}</div><p class="m">فایل پشتیبان رمزگذاری‌شده را انتخاب کنید. سایت‌های تکراری با اتصال‌های فعلی ادغام می‌شوند و اعتبارنامه‌های فعلی بازنویسی نمی‌شوند.</p><input id="uc_file" type="file" accept=".smbbackup,.json,application/json"><label class="l">گذرواژه پشتیبان</label><input id="uc_import_pass" type="password" autocomplete="current-password"><button class="b p" style="width:100%" onclick="SMB40.importBackup()">رمزگشایی و بازیابی</button>`);
    },
    async importBackup() {
      const file = $('#uc_file')?.files?.[0], pass = $('#uc_import_pass')?.value || '';
      const createdAliases = [];
      if (!file) return toast('ابتدا فایل پشتیبان را انتخاب کنید');
      if (file.size > 8 * 1024 * 1024) return toast('حجم فایل از سقف ۸ مگابایت بیشتر است');
      if (pass.length < 12) return toast('گذرواژه معتبر نیست');
      try {
        const envelope = JSON.parse(await file.text());
        const payload = await window.SMB_BACKUP_CRYPTO.decrypt(envelope, pass);
        if (payload?.format !== 'smb-config' || payload.version !== 1 || !Array.isArray(payload.sites) || payload.sites.length > 100) throw new Error('ساختار پشتیبان معتبر نیست');
        const additions = [];
        const updates = [];
        let containsHttp = false;
        for (const entry of payload.sites) {
          const normalized = normalizeSiteUrl(entry.url);
          if (normalized.error) throw new Error(`نشانی سایت در فایل معتبر نیست: ${entry.name || entry.url}`);
          if (normalized.http) containsHttp = true;
          const c = entry.credentials || {};
          if (typeof c.key !== 'string' || c.key.length < 8 || c.key.length > 8192) throw new Error(`کلید اتصال سایت «${entry.name || normalized.url}» معتبر نیست`);
          const duplicate = sites.find(s => String(s.url).replace(/\/$/, '').toLowerCase() === normalized.url.replace(/\/$/, '').toLowerCase());
          if (duplicate) {
            if (isNative() && duplicate.secure && !hasCredentials(duplicate)) await hydrateSiteKey(duplicate);
            if (hasCredentials(duplicate)) continue;
            const target = { ...duplicate, key: c.key, accessToken: '', refreshToken: '', accessExpiresAt: 0, deviceId: '', secure: false };
            updates.push({ index: sites.indexOf(duplicate), site: target });
            continue;
          }
          const s = { id: 'restore-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)), name: String(entry.name || normalized.url).slice(0,120), url: normalized.url, http: normalized.http, key: String(c.key || ''), accessToken: '', refreshToken: '', accessExpiresAt: 0, deviceId: '', secure: false };
          additions.push(s);
        }
        if (containsHttp && !confirm('این پشتیبان شامل یک یا چند سایت HTTP بدون رمزنگاری انتقال است. با مسئولیت خودتان بازیابی شود؟')) return;
        if (isNative()) {
          await ensureDeviceUnlock();
          for (const item of updates) { await persistSiteKey(item.site); createdAliases.push(secretAlias(item.site)); }
          for (const s of additions) { await persistSiteKey(s); createdAliases.push(secretAlias(s)); }
        }
        for (const item of updates) sites[item.index] = item.site;
        sites.push(...additions);
        if (payload.uiPrefs && typeof payload.uiPrefs === 'object') {
          uiPrefs = { ...uiPrefs, theme: ['system','light','dark'].includes(payload.uiPrefs.theme) ? payload.uiPrefs.theme : 'system', language: ['fa','en','ar'].includes(payload.uiPrefs.language) ? payload.uiPrefs.language : 'fa', fontSize: Math.max(14, Math.min(21, Number(payload.uiPrefs.fontSize) || 15)) };
          localStorage.setItem('smb_ui_prefs', JSON.stringify(uiPrefs)); applyUiPrefs();
        }
        if (!sites.length) throw new Error('هیچ سایتی برای بازیابی پیدا نشد');
        cur = Math.max(0, Math.min(sites.length - 1, Number(cur) || 0)); save(); closeSheet(); toast(`${fa(additions.length + updates.length)} سایت بازیابی شد یا اتصالش تکمیل شد؛ موارد دارای اتصال حفظ شدند`); openUltimateCenter();
      } catch (e) {
        if (isNative() && createdAliases.length) { try { for (const alias of createdAliases) await nativeAdmin().deleteSecret({ alias }); } catch (_) {} }
        toast(`بازیابی ناموفق بود: ${e.message}`);
      }
    }
  };
})();
