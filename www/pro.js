/* ===== Pro tools (v3.11): maintenance, security, auto-updates, redirects, search-replace, bulk actions, top report, stock =====
   Needs Site Manager Bridge >= 3.11.0 (includes/pro.php). Helpers wnEsc/wnApi/wnFail/wnV/wnBack come from native.js. */
let PR_AUDIT=null,PR_LOG=null,PR_AUTO=null,PR_RED=null,PR_SEL=new Set(),PR_BP=[],PR_BO=[],PR_ST=null;

function prRing(score){const c=score>=80?"#16a34a":score>=55?"#d97706":"#dc2626",r=42,L=2*Math.PI*r;
  return `<svg viewBox="0 0 100 100" width="112" height="112" role="img" aria-label="امتیاز امنیت ${score}"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--br,#ddd)" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(L*score/100).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" font-size="24" font-weight="800" style="fill:var(--tx,#111)">${fa(score)}</text></svg>`}
const prIcon={ok:"✓",warn:"!",bad:"✕"};
function prHub(){
  shell("ابزارهای حرفه‌ای",null,wnBack);
  const wc=info.wc;
  $("#v").innerHTML=`<h3>امنیت و نگهداری</h3><div class="hub">${T("🛡️","ممیزی امنیتی","prSecurity()","#dc2626","#f87171")}${T("🚧","حالت تعمیر","prMaint()","#d97706","#fbbf24")}${T("🔐","ورود ناموفق","prLoginLog()","#7c3aed","#a78bfa")}${T("🔄","به‌روزرسانی خودکار","prAuto()","#0e7490","#22d3ee")}</div>
  <h3>محتوا و سئو</h3><div class="hub">${T("↪️","ریدایرکت و ۴۰۴","prRedirects()","#0b7a62","#14b88f")}${T("🔎","جایگزینی متن","prSR()","#3b82f6","#60a5fa")}${T("☑️","عملیات گروهی محتوا","prBulkPosts()","#8b5cf6","#a78bfa")}</div>
  ${wc?`<h3>فروشگاه</h3><div class="hub">${T("🏆","پرفروش‌ها و مشتریان","prTop()","#ef4444","#f87171")}${T("📦","موجودی کم","prStock('low')","#f97316","#fdba74")}${T("☑️","عملیات گروهی سفارش","prBulkOrders()","#14b8a6","#5eead4")}</div>`:""}`;
}

/* ---------- maintenance ---------- */
async function prMaint(){
  shell("حالت تعمیر",null,"prHub()");loading();
  try{const m=await wnApi("/maintenance");
   $("#v").innerHTML=`<div class="cd"><div class="row"><div class="sp"><b>${m.enabled?"🚧 فعال است":"سایت در دسترس است"}</b><div class="m">${m.enabled?"بازدیدکنندگان صفحهٔ تعمیر (کد ۵۰۳) می‌بینند":"حالت تعمیر خاموش است"}</div></div></div></div>
   <label class="l">عنوان صفحه</label><input id="pm_t" value="${wnEsc(m.title)}"><label class="l">پیام</label><textarea id="pm_m" rows="3">${wnEsc(m.message)}</textarea>
   <label class="l">زمان پیشنهادی بازگشت برای موتور جست‌وجو (دقیقه)</label><input id="pm_r" type="number" min="1" max="1440" class="ltr" value="${m.retry}">
   <p class="m">${wnEsc(m.note)}</p>
   <button class="b p" style="width:100%;margin-top:10px" onclick="prMaintSave(${m.enabled?"true":"false"},false)">فقط ذخیرهٔ متن</button>
   <button class="b ${m.enabled?"":"d"}" style="width:100%;margin-top:8px" onclick="prMaintSave(${m.enabled?"false":"true"},true)">${m.enabled?"خاموش‌کردن حالت تعمیر":"فعال‌کردن حالت تعمیر"}</button>`
  }catch(e){wnFail(e)}}
async function prMaintSave(en,toggle){
  const b={title:wnV("pm_t"),message:wnV("pm_m"),retry:Number(wnV("pm_r")||30)};
  if(toggle){if(en&&!confirm("سایت برای همهٔ بازدیدکنندگان (به‌جز مدیران واردشده) بسته می‌شود. ادامه؟"))return;b.enabled=en;b.confirm=true}
  try{await wnApi("/maintenance",b);toast("ذخیره شد ✓");prMaint()}catch(e){toast(e.message)}}

/* ---------- security ---------- */
async function prSecurity(){
  shell("ممیزی امنیتی",null,"prHub()");loading();
  try{PR_AUDIT=await wnApi("/security/audit");prAuditDraw()}catch(e){wnFail(e)}}
function prAuditDraw(){
  const a=PR_AUDIT,order={bad:0,warn:1,ok:2},items=[...a.items].sort((x,y)=>order[x.status]-order[y.status]);
  $("#v").innerHTML=`<div class="cd row"><div>${prRing(a.score)}</div><div class="sp"><div class="t">امتیاز امنیت ${fa(a.score)} از ۱۰۰</div><div class="m">${fa(a.items.filter(x=>x.status==="bad").length)} مورد جدی · ${fa(a.items.filter(x=>x.status==="warn").length)} هشدار</div><div class="m">${wnEsc(a.time)}</div></div></div>
  ${items.map(x=>`<div class="chk ${x.status==="ok"?"ok":"no"}"><i>${prIcon[x.status]}</i><div><b>${wnEsc(x.label)}</b>${x.detail?`<div class="m" style="white-space:pre-line">${wnEsc(x.detail)}</div>`:""}</div></div>`).join("")}
  <div class="cd"><b>تطبیق فایل‌های هسته با نسخهٔ رسمی</b><p class="m">فایل‌های وردپرس با چک‌سام wordpress.org مقایسه می‌شوند تا دستکاری یا آلودگی پیدا شود. چند ثانیه طول می‌کشد.</p><button class="b p" style="width:100%" onclick="prVerify()">اجرای بررسی</button><div id="pr_v"></div></div>
  <button class="b" style="width:100%" onclick="prLoginLog()">گزارش ورودهای ناموفق</button>`;
}
async function prVerify(){
  const box=$("#pr_v");box.innerHTML=`<div class="ld">در حال مقایسهٔ فایل‌ها…</div>`;
  try{const r=await wnApi("/security/audit",{action:"verify_core"}),bad=r.modified_count+r.missing_count+r.extra_php.length;
   const list=(t,a,n)=>a.length?`<div class="m" style="margin-top:8px"><b>${t} (${fa(n)})</b></div><div class="ltr m" style="white-space:pre-line;word-break:break-all">${a.map(wnEsc).join("\n")}</div>`:"";
   box.innerHTML=`<div class="chk ${bad?"no":"ok"}" style="margin-top:8px"><i>${bad?"!":"✓"}</i><div><b>${bad?"مغایرت پیدا شد":"همهٔ فایل‌های هسته سالم‌اند"}</b><div class="m">${fa(r.checked)} فایل نسخهٔ ${wnEsc(r.version)} بررسی شد</div></div></div>${list("فایل‌های تغییرکرده",r.modified,r.modified_count)}${list("فایل‌های گم‌شده",r.missing,r.missing_count)}${list("فایل PHP ناشناخته",r.extra_php,r.extra_php.length)}${bad?`<p class="m">تغییر فایل‌های هسته می‌تواند نشانهٔ هک باشد؛ پیش از هر اقدام نسخهٔ پشتیبان بگیرید و فایل‌ها را با نسخهٔ رسمی جایگزین کنید.</p>`:""}`
  }catch(e){box.innerHTML=`<div class="cd">${wnEsc(e.message)}</div>`}}
async function prLoginLog(){
  shell("ورودهای ناموفق",null,"prHub()");loading();
  try{PR_LOG=await wnApi("/security/login-log");const l=PR_LOG;
   $("#v").innerHTML=`<div class="bento"><div class="tile"><b>${fa(l.last24h)}</b><span>۲۴ ساعت اخیر</span></div><div class="tile"><b>${fa(l.total)}</b><span>کل ثبت‌شده</span></div></div>
   ${l.top_users.length?`<div class="cd"><b>پرتکرارترین نام‌های کاربری</b>${l.top_users.map(x=>`<div class="row"><span class="sp ltr">${wnEsc(x.user)}</span><span class="pill">${fa(x.count)}</span></div>`).join("")}</div>`:""}
   ${l.items.map(x=>`<div class="cd row"><div class="sp"><div class="t ltr">${wnEsc(x.user||"—")}</div><div class="m">${wnEsc(x.time)}</div></div><span class="m ltr">${wnEsc(x.ip)}</span></div>`).join("")||`<div class="ld">ورود ناموفقی ثبت نشده</div>`}
   <p class="m">${wnEsc(l.note)}</p>${l.total?`<button class="b d" style="width:100%" onclick="prLogClear()">پاک‌کردن گزارش</button>`:""}`
  }catch(e){wnFail(e)}}
async function prLogClear(){if(!confirm("گزارش ورودهای ناموفق پاک شود؟"))return;try{await wnApi("/security/login-log",{action:"clear",confirm:true});toast("پاک شد");prLoginLog()}catch(e){toast(e.message)}}

/* ---------- auto updates ---------- */
async function prAuto(){
  shell("به‌روزرسانی خودکار",null,"prHub()");loading();
  try{PR_AUTO=await wnApi("/autoupdates");prAutoDraw()}catch(e){wnFail(e)}}
function prAutoDraw(){
  const a=PR_AUTO,opts=[["default","پیش‌فرض وردپرس"],["off","خاموش"],["minor","فقط امنیتی/جزئی"],["major","همهٔ نسخه‌ها (پرخطر)"]];
  $("#v").innerHTML=`<div class="cd"><b>هستهٔ وردپرس</b>${a.core_locked?`<p class="m">مقدار WP_AUTO_UPDATE_CORE در wp-config.php تنظیم شده و بر این گزینه غلبه دارد.</p>`:""}
  <select id="pa_core" onchange="prAutoCore(this.value)" style="margin-top:8px">${opts.map(o=>`<option value="${o[0]}" ${o[0]===a.core?"selected":""}>${o[1]}</option>`).join("")}</select></div>
  <h3>افزونه‌ها</h3>${a.plugins.map((x,i)=>`<div class="cd row"><div class="sp"><div class="t ell">${wnEsc(x.name)}</div><div class="m">${wnEsc(x.version)}${x.active?"":" · غیرفعال"}</div></div>${sw("pa_p"+i,x.enabled,`prAutoItem('plugin',${i},this)`)}</div>`).join("")}
  <h3>پوسته‌ها</h3>${a.themes.map((x,i)=>`<div class="cd row"><div class="sp"><div class="t ell">${wnEsc(x.name)}</div><div class="m">${wnEsc(x.version)}</div></div>${sw("pa_t"+i,x.enabled,`prAutoItem('theme',${i},this)`)}</div>`).join("")}`;
}
async function prAutoCore(m){
  if(m==="major"&&!confirm("به‌روزرسانی خودکار نسخهٔ اصلی ممکن است افزونه یا پوسته را بشکند. مطمئنید؟")){prAutoDraw();return}
  try{PR_AUTO=await wnApi("/autoupdates",{core:m,confirm:true});toast("ذخیره شد ✓")}catch(e){toast(e.message);prAuto()}}
async function prAutoItem(type,i,el){
  const x=(type==="plugin"?PR_AUTO.plugins:PR_AUTO.themes)[i],on=el.checked;
  try{PR_AUTO=await wnApi("/autoupdates",{type,id:x.id,enabled:on});toast(on?"فعال شد":"خاموش شد")}catch(e){el.checked=!on;toast(e.message)}}

/* ---------- redirects + 404 ---------- */
async function prRedirects(prefill){
  shell("ریدایرکت و ۴۰۴",null,"prHub()");loading();
  try{PR_RED=await wnApi("/redirects");prRedDraw(typeof prefill==="string"?prefill:"")}catch(e){wnFail(e)}}
function prRedDraw(from){
  const r=PR_RED;
  $("#v").innerHTML=`<div class="cd"><b>قانون جدید</b><label class="l">از مسیر</label><input id="pr_f" class="ltr" value="${wnEsc(from)}" placeholder="/old-page">
  <label class="l">به</label><input id="pr_to" class="ltr" placeholder="/new-page یا https://…"><label class="l">نوع</label><select id="pr_c"><option value="301">۳۰۱ — دائمی (پیشنهادی)</option><option value="302">۳۰۲ — موقت</option><option value="307">۳۰۷ — موقت (حفظ متد)</option><option value="308">۳۰۸ — دائمی (حفظ متد)</option><option value="410">۴۱۰ — حذف‌شده (بدون مقصد)</option></select>
  <button class="b p" style="width:100%;margin-top:10px" onclick="prRedAdd()">افزودن قانون</button></div>
  <h3>قوانین فعال <small class="m">${fa(r.rules.length)}</small></h3>${r.rules.map((x,i)=>`<div class="cd row"><div class="sp"><div class="t ltr ell">${wnEsc(x.from)}</div><div class="m ltr ell">${x.code===410?"410 Gone":`${x.code} → ${wnEsc(x.to)}`}</div></div><button class="b d" onclick="prRedDel(${i})">✕</button></div>`).join("")||`<div class="ld">قانونی نیست</div>`}
  <h3>آدرس‌های ۴۰۴ پربازدید <small class="m">${fa(r.log.length)}</small></h3>${r.log.map((x,i)=>`<div class="cd row"><div class="sp"><div class="t ltr ell">${wnEsc(x.path)}</div><div class="m">${fa(x.hits)} بار · ${wnEsc(x.last)}</div></div><button class="b" onclick="prRedFrom(${i})">ریدایرکت</button></div>`).join("")||`<div class="ld">۴۰۴ ثبت نشده</div>`}
  ${r.log.length?`<button class="b d" style="width:100%" onclick="prRed404Clear()">پاک‌کردن گزارش ۴۰۴</button>`:""}`;
}
function prRedFrom(i){prRedDraw(PR_RED.log[i].path);window.scrollTo(0,0);$("#pr_to")?.focus()}
async function prRedAdd(){
  const code=Number(wnV("pr_c"));
  try{PR_RED=await wnApi("/redirects",{action:"add",from:wnV("pr_f"),to:wnV("pr_to"),code});toast("قانون اضافه شد ✓");prRedDraw("")}catch(e){toast(e.message)}}
async function prRedDel(i){const x=PR_RED.rules[i];if(!x||!confirm("این قانون حذف شود؟"))return;try{PR_RED=await wnApi("/redirects",{action:"delete",from:x.from});prRedDraw("")}catch(e){toast(e.message)}}
async function prRed404Clear(){if(!confirm("گزارش ۴۰۴ پاک شود؟"))return;try{PR_RED=await wnApi("/redirects",{action:"clear_404",confirm:true});prRedDraw("")}catch(e){toast(e.message)}}

/* ---------- search & replace ---------- */
function prSR(){
  shell("جایگزینی متن در محتوا",null,"prHub()");
  const ts=[["post","نوشته‌ها"],["page","برگه‌ها"],...(types||[]).filter(t=>!t.msg).map(t=>[t.name,t.label])];
  $("#v").innerHTML=`<div class="cd"><p class="m">در عنوان، متن یا خلاصهٔ مطالب جست‌وجو و جایگزین می‌کند. ابتدا فقط پیش‌نمایش می‌بینید و آخرین جایگزینی قابل بازگردانی است (تا زمانی که مطلب دوباره ویرایش نشده). پیش از تغییر بزرگ بکاپ بگیرید.</p>
  <label class="l">بخش</label><select id="sr_sc"><option value="post_content">متن</option><option value="post_excerpt">خلاصه</option><option value="post_title">عنوان</option></select>
  <label class="l">انواع محتوا</label><div>${ts.map((t,i)=>`<label class="row" style="padding:4px 0"><input type="checkbox" class="sr_t" style="width:auto" value="${wnEsc(t[0])}" ${i<2?"checked":""}> ${wnEsc(t[1])}</label>`).join("")}</div>
  <label class="l">متن جست‌وجو (دست‌کم ۳ نویسه)</label><input id="sr_s"><label class="l">جایگزین</label><input id="sr_r">
  <button class="b p" style="width:100%;margin-top:10px" onclick="prSRPreview()">پیش‌نمایش</button><div id="sr_out"></div></div>
  <button class="b" style="width:100%" onclick="prSRUndo()">↩ بازگردانی آخرین جایگزینی</button>`;
}
const prSRBody=a=>({action:a,search:wnV("sr_s"),replace:wnV("sr_r"),scope:wnV("sr_sc"),types:[...document.querySelectorAll(".sr_t:checked")].map(x=>x.value)});
async function prSRPreview(){
  const o=$("#sr_out");o.innerHTML=`<div class="ld">…</div>`;
  try{const r=await wnApi("/search-replace",prSRBody("preview"));
   o.innerHTML=r.posts?`<div class="chk no" style="margin-top:8px"><i>!</i><div><b>${fa(r.occurrences)} مورد در ${fa(r.posts)} مطلب</b><div class="m">${r.samples.map(x=>wnEsc(x.title)).join("، ")}${r.posts>r.samples.length?" …":""}</div></div></div><button class="b d" style="width:100%" onclick="prSRRun()">اجرای جایگزینی</button>`:`<div class="ld">موردی پیدا نشد</div>`
  }catch(e){o.innerHTML=`<div class="cd">${wnEsc(e.message)}</div>`}}
async function prSRRun(){
  if(!confirm("جایگزینی روی مطالب پیش‌نمایش‌شده اعمال شود؟"))return;
  try{const b=prSRBody("run");b.confirm=true;const r=await wnApi("/search-replace",b);toast(`${fa(r.changed)} مطلب تغییر کرد`);$("#sr_out").innerHTML=`<div class="chk ok"><i>✓</i><div><b>${fa(r.changed)} مطلب به‌روز شد</b><div class="m">با دکمهٔ بازگردانی می‌توانید برگردانید.</div></div></div>`}catch(e){toast(e.message)}}
async function prSRUndo(){
  if(!confirm("آخرین جایگزینی بازگردانده شود؟ مطالبی که بعداً ویرایش شده‌اند دست نمی‌خورند."))return;
  try{const r=await wnApi("/search-replace",{action:"undo",confirm:true});toast(`${fa(r.restored)} بازگردانده شد${r.skipped?` · ${fa(r.skipped)} رد شد`:""}`)}catch(e){toast(e.message)}}

/* ---------- bulk posts ---------- */
let PR_BPT="post",PR_BPS="";
async function prBulkPosts(type,status){
  PR_BPT=type||PR_BPT;PR_BPS=status??PR_BPS;PR_SEL=new Set();
  shell("عملیات گروهی محتوا",null,"prHub()");loading();
  try{const tl=[["post","نوشته‌ها"],["page","برگه‌ها"],...(types||[]).filter(t=>!t.msg).map(t=>[t.name,t.label])];
   const r=await wnApi(`/posts?type=${encodeURIComponent(PR_BPT)}&status=${PR_BPS}&page=1`);PR_BP=r.items;
   $("#v").innerHTML=`<div class="row"><select class="sp" onchange="prBulkPosts(this.value,PR_BPS)">${tl.map(t=>`<option value="${wnEsc(t[0])}" ${t[0]===PR_BPT?"selected":""}>${wnEsc(t[1])}</option>`).join("")}</select><select class="sp" onchange="prBulkPosts(PR_BPT,this.value)">${[["","همه"],["publish","منتشر شده"],["draft","پیش‌نویس"],["pending","در انتظار"],["private","خصوصی"],["trash","زباله‌دان"]].map(s=>`<option value="${s[0]}" ${s[0]===PR_BPS?"selected":""}>${s[1]}</option>`).join("")}</select></div>
   <div class="row" style="padding:8px 0"><label class="row sp"><input type="checkbox" style="width:auto" onchange="prSelAll(this.checked,'bp')"> انتخاب همه (۲۰ مورد صفحهٔ اول)</label><span id="pr_cnt" class="pill">۰</span></div>
   ${PR_BP.map((x,i)=>`<label class="cd row" style="cursor:pointer"><input type="checkbox" class="pr_ck" style="width:auto" data-id="${x.id}" onchange="prSelTick()"><div class="sp"><div class="t ell">${wnEsc(x.title)}</div><div class="m">${wnEsc(x.date)} · ${wnEsc(x.author)}</div></div><span class="${pc(x.status)}">${wnEsc(st(x.status))}</span></label>`).join("")||`<div class="ld">موردی نیست</div>`}
   <div class="cd" style="position:sticky;bottom:78px"><select id="pr_act" onchange="prBpAct()"><option value="">عملیات…</option><option value="publish">انتشار</option><option value="draft">تبدیل به پیش‌نویس</option><option value="pending">در انتظار بازبینی</option><option value="private">خصوصی</option><option value="trash">انتقال به زباله‌دان</option><option value="restore">بازیابی از زباله‌دان</option><option value="category_add">افزودن به دسته…</option><option value="category_set">جایگزینی دسته…</option><option value="delete">حذف دائمی</option></select><div id="pr_val"></div>
   <button class="b p" style="width:100%;margin-top:8px" onclick="prBpRun()">اجرا روی موارد انتخاب‌شده</button></div>`
  }catch(e){wnFail(e)}}
async function prBpAct(){
  const a=wnV("pr_act"),box=$("#pr_val");box.innerHTML="";
  if(a.startsWith("category")){try{const c=await api("/terms?tax=category");box.innerHTML=`<select id="pr_cat" style="margin-top:8px">${(c.items||c).map(t=>`<option value="${t.id}">${wnEsc(t.name)}</option>`).join("")}</select>`}catch(e){toast(e.message)}}}
function prSelAll(on,k){document.querySelectorAll(".pr_ck").forEach(x=>x.checked=on);prSelTick()}
function prSelTick(){const n=document.querySelectorAll(".pr_ck:checked").length;const c=$("#pr_cnt");if(c)c.textContent=fa(n)}
const prChecked=()=>[...document.querySelectorAll(".pr_ck:checked")].map(x=>Number(x.dataset.id));
async function prBpRun(){
  const ids=prChecked(),a=wnV("pr_act");if(!ids.length)return toast("موردی انتخاب نشده");if(!a)return toast("عملیات را انتخاب کنید");
  const b={ids,action:a};if(a.startsWith("category"))b.value=Number(wnV("pr_cat"));
  if(!confirm(`${fa(ids.length)} مورد: «${$("#pr_act").selectedOptions[0].text}» اعمال شود؟`))return;
  if(a==="delete"){if(!confirm("حذف دائمی برگشت‌پذیر نیست. ادامه؟"))return;b.confirm=true}
  try{const r=await wnApi("/posts/bulk",b);toast(`${fa(r.ok)} انجام شد${r.failed.length?` · ${fa(r.failed.length)} ناموفق`:""}`);prBulkPosts()}catch(e){toast(e.message)}}

/* ---------- bulk orders ---------- */
let PR_BOS="wc-processing";
async function prBulkOrders(status){
  PR_BOS=status??PR_BOS;shell("عملیات گروهی سفارش",null,"prHub()");loading();
  try{const r=await wnApi(`/orders?page=1&status=${PR_BOS}`);PR_BO=r.items;
   $("#v").innerHTML=`<select onchange="prBulkOrders(this.value)">${Object.entries(info.statuses).map(([k,v])=>`<option value="${k}" ${k===PR_BOS?"selected":""}>${wnEsc(v)}</option>`).join("")}</select>
   <div class="row" style="padding:8px 0"><label class="row sp"><input type="checkbox" style="width:auto" onchange="prSelAll(this.checked)"> انتخاب همه</label><span id="pr_cnt" class="pill">۰</span></div>
   ${PR_BO.map(o=>`<label class="cd row" style="cursor:pointer"><input type="checkbox" class="pr_ck" style="width:auto" data-id="${o.id}" onchange="prSelTick()"><div class="sp"><div class="t">#${wnEsc(o.number)} · ${wnEsc(o.name||"مهمان")}</div><div class="m">${wnEsc(o.date)}</div></div><div class="t">${money(o.total)}</div></label>`).join("")||`<div class="ld">سفارشی نیست</div>`}
   <div class="cd" style="position:sticky;bottom:78px"><select id="pr_os">${Object.entries(info.statuses).map(([k,v])=>`<option value="${k}">${wnEsc(v)}</option>`).join("")}</select><button class="b p" style="width:100%;margin-top:8px" onclick="prBoRun()">تغییر وضعیت موارد انتخاب‌شده</button></div>`
  }catch(e){wnFail(e)}}
async function prBoRun(){
  const ids=prChecked(),s=wnV("pr_os");if(!ids.length)return toast("سفارشی انتخاب نشده");
  if(!confirm(`وضعیت ${fa(ids.length)} سفارش به «${info.statuses[s]}» تغییر کند؟ ایمیل‌های وضعیت برای مشتریان ارسال می‌شود.`))return;
  try{const r=await wnApi("/orders/bulk",{ids,status:s,confirm:true});toast(`${fa(r.ok)} انجام شد${r.failed.length?` · ${fa(r.failed.length)} ناموفق`:""}`);prBulkOrders()}catch(e){toast(e.message)}}

/* ---------- top report ---------- */
async function prTop(d=30){
  shell("پرفروش‌ها و مشتریان",null,"prHub()");loading();
  try{const r=await wnApi("/reports/top?days="+d),mx=Math.max(1,...r.products.map(x=>x.total));
   $("#v").innerHTML=`<div class="chips">${[7,30,90,365].map(x=>`<button class="chip ${x===d?"on":""}" onclick="prTop(${x})">${fa(x)} روز</button>`).join("")}</div>
   <div class="bento"><div class="tile"><b>${money(r.revenue)}</b><span>فروش ${fa(r.orders)} سفارش</span></div><div class="tile"><b>${money(r.avg)}</b><span>میانگین سفارش</span></div><div class="tile"><b>${money(r.refunds)}</b><span>بازپرداخت‌ها</span></div></div>
   ${r.truncated?`<p class="m">⚠ فقط ۲۰۰۰ سفارش اخیر محاسبه شد.</p>`:""}
   <h3>محصولات برتر</h3>${r.products.map(x=>`<div class="cd"><div class="row"><div class="sp t ell">${wnEsc(x.name)}</div><span class="m">${fa(x.qty)} عدد</span><b>${money(x.total)}</b></div><div style="height:6px;border-radius:3px;background:var(--br);margin-top:6px"><i style="display:block;height:100%;width:${(x.total/mx*100).toFixed(0)}%;border-radius:3px;background:var(--a,#0b7a62)"></i></div></div>`).join("")||`<div class="ld">داده‌ای نیست</div>`}
   <h3>مشتریان برتر</h3>${r.customers.map(x=>`<div class="cd row"><div class="sp"><div class="t">${wnEsc(x.name)}</div><div class="m">${fa(x.orders)} سفارش</div></div><b>${money(x.total)}</b></div>`).join("")||`<div class="ld">داده‌ای نیست</div>`}
   ${r.payments.length?`<h3>روش‌های پرداخت</h3><div class="cd">${r.payments.map(x=>`<div class="row"><span class="sp">${wnEsc(x.name)}</span><span class="pill">${fa(x.count)}</span></div>`).join("")}</div>`:""}
   ${r.coupons.length?`<h3>کوپن‌های پراستفاده</h3><div class="cd">${r.coupons.map(x=>`<div class="row"><span class="sp ltr">${wnEsc(x.code)}</span><span class="pill">${fa(x.count)}</span></div>`).join("")}</div>`:""}`
  }catch(e){wnFail(e)}}

/* ---------- stock ---------- */
async function prStock(f){
  PR_ST=f||PR_ST||"low";shell("مدیریت موجودی",null,"prHub()");loading();
  try{const r=await wnApi("/stock?filter="+PR_ST);
   $("#v").innerHTML=`<div class="chips"><button class="chip ${PR_ST==="low"?"on":""}" onclick="prStock('low')">موجودی کم (≤ ${fa(r.threshold)})</button><button class="chip ${PR_ST==="out"?"on":""}" onclick="prStock('out')">ناموجود</button></div>
   ${r.items.map(x=>`<div class="cd row"><div class="img" style="background-image:url('${wnEsc(x.img)}')"></div><div class="sp"><div class="t ell">${wnEsc(x.name)}</div><div class="m ltr">${wnEsc(x.sku||"—")}${x.managed?"":" · موجودی مدیریت‌نشده"}</div></div><input id="st_${x.id}" type="number" min="0" class="ltr" style="width:80px" value="${x.stock}"><button class="b p" onclick="prStockSave(${x.id})">✓</button></div>`).join("")||`<div class="ld">موردی نیست 🎉</div>`}`
  }catch(e){wnFail(e)}}
async function prStockSave(id){
  const v=wnV("st_"+id);if(v===""||Number(v)<0)return toast("عدد معتبر وارد کنید");
  try{await wnApi("/stock",{id,stock:Number(v)});toast("ذخیره شد ✓");prStock()}catch(e){toast(e.message)}}
