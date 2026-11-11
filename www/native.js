/* ===== Native WordPress screens (v3.10): profile, permalinks, privacy, patterns, export, cron, roles, network =====
   Needs Site Manager Bridge >= 3.10.0 (includes/native.php). Everything here is admin-key only on the server. */
const wnEsc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let WN_PROFILE=null,WN_PERM=null,WN_PRIV=null,WN_PAT=[],WN_CRON=[],WN_ROLES=null,WN_NET=null,WN_NETQ="",WN_NETP=1,WN_PATQ="",WN_PATP=1;

/* A missing route means an older bridge: say so instead of showing a raw REST error. */
function wnErr(e){const m=String(e?.message||e||"");return /no route|rest_no_route|پاسخ نامعتبر/i.test(m)?"این بخش به افزونهٔ Site Manager Bridge نسخهٔ ۳.۱۰.۰ یا بالاتر نیاز دارد؛ افزونه را به‌روزرسانی کنید.":m}
async function wnApi(path,body){try{return await api(path,body)}catch(e){throw new Error(wnErr(e))}}
function wnFail(e){$("#v").innerHTML=`<div class="cd">${wnEsc(e.message)}</div><button class="b" onclick="wordpressHome()">بازگشت</button>`}
const wnBack="wordpressHome()";
const wnV=id=>document.getElementById(id)?.value??"";
function wnAgo(sec){const a=Math.abs(sec);const u=a<3600?[Math.round(a/60),"دقیقه"]:a<86400?[Math.round(a/3600),"ساعت"]:[Math.round(a/86400),"روز"];return `${fa(u[0])} ${u[1]} ${sec<0?"پیش":"دیگر"}`}

/* ---------- profile + application passwords ---------- */
async function wnProfile(){
  shell("پروفایل من",null,wnBack);loading();
  try{WN_PROFILE=await wnApi("/profile");wnProfileDraw()}catch(e){wnFail(e)}}
function wnProfileDraw(){
  const p=WN_PROFILE;
  $("#v").innerHTML=`<div class="cd row"><div class="img" style="width:64px;height:64px;border-radius:50%;background-image:url('${wnEsc(p.avatar)}')"></div><div class="sp"><div class="t">${wnEsc(p.display_name)}</div><div class="m ltr">${wnEsc(p.login)}</div><div class="m">${wnEsc((p.roles||[]).join("، "))} · عضویت ${wnEsc(p.registered)}</div></div></div>
  <div class="two"><div><label class="l">نام</label><input id="wp_fn" value="${wnEsc(p.first_name)}"></div><div><label class="l">نام خانوادگی</label><input id="wp_ln" value="${wnEsc(p.last_name)}"></div></div>
  <label class="l">نام مستعار</label><input id="wp_nn" value="${wnEsc(p.nickname)}">
  <label class="l">نامی که عمومی نمایش داده شود</label><select id="wp_dn">${(p.display_options||[]).map(x=>`<option ${x===p.display_name?"selected":""}>${wnEsc(x)}</option>`).join("")}</select>
  <label class="l">ایمیل</label><input id="wp_em" class="ltr" type="email" value="${wnEsc(p.email)}">
  <label class="l">وب‌سایت</label><input id="wp_url" class="ltr" value="${wnEsc(p.url)}" placeholder="https://">
  <label class="l">دربارهٔ من</label><textarea id="wp_bio" rows="3">${wnEsc(p.description)}</textarea>
  <label class="l">رمز عبور جدید (خالی = بدون تغییر، دست‌کم ۱۲ نویسه)</label><input id="wp_pw" class="ltr" type="password" autocomplete="new-password">
  <button class="b p" style="width:100%;margin-top:12px" onclick="wnProfileSave()">ذخیرهٔ پروفایل</button>
  <h3>رمزهای برنامه (Application Passwords)</h3>
  ${p.apps_available?`<div class="cd"><p class="m">برای اتصال برنامه‌های دیگر به REST وردپرس. رمز ساخته‌شده فقط یک‌بار نشان داده می‌شود.</p>
  <div class="row"><input id="wp_an" class="sp" placeholder="نام برنامه"><button class="b p" onclick="wnAppCreate()">ساخت</button></div></div>
  ${(p.apps||[]).map((a,i)=>`<div class="cd row"><div class="sp"><div class="t">${wnEsc(a.name)}</div><div class="m">ساخت ${wnEsc(a.created)}${a.last_used?` · آخرین استفاده ${wnEsc(a.last_used)}`:" · هرگز استفاده نشده"}</div></div><button class="b d" onclick="wnAppRevoke(${i})">ابطال</button></div>`).join("")||`<div class="ld">رمز برنامه‌ای ثبت نشده</div>`}`
  :`<div class="cd m">رمز برنامه برای این سایت یا حساب غیرفعال است (نیازمند HTTPS و اجازهٔ سایت).</div>`}`;
}
async function wnProfileSave(){
  const p=WN_PROFILE,b={first_name:wnV("wp_fn"),last_name:wnV("wp_ln"),nickname:wnV("wp_nn"),display_name:wnV("wp_dn"),url:wnV("wp_url"),description:wnV("wp_bio")};
  const em=wnV("wp_em").trim(),pw=wnV("wp_pw");
  if(em&&em.toLowerCase()!==String(p.email).toLowerCase()){if(!confirm("ایمیل حساب وردپرس تغییر کند؟ بازیابی رمز به ایمیل جدید می‌رود."))return;b.email=em;b.confirm=true}
  if(pw){if(!confirm("رمز عبور حساب وردپرس تغییر کند؟"))return;b.pass=pw;b.confirm=true}
  try{WN_PROFILE=await wnApi("/profile",b);toast("ذخیره شد ✓");wnProfileDraw()}catch(e){toast(e.message)}}
async function wnAppCreate(){
  const name=wnV("wp_an").trim();if(!name)return toast("نام برنامه را بنویسید");
  try{const r=await wnApi("/profile",{action:"app_create",name});WN_PROFILE=r.profile;wnProfileDraw();
   sheet(`<div class="row"><b class="sp">رمز برنامهٔ جدید</b>${X()}</div><p class="m">${wnEsc(r.note)}</p><div class="cd ltr" style="user-select:all;font-family:monospace;word-break:break-all">${wnEsc(r.password)}</div>
   <button class="b p" style="width:100%" onclick="wnCopy(${jsa(r.password)})">کپی</button>`)}catch(e){toast(e.message)}}
function wnCopy(t){const fail=()=>toast("کپی نشد؛ متن را دستی انتخاب کنید");try{navigator.clipboard.writeText(t).then(()=>toast("کپی شد"),fail)}catch(e){fail()}}
async function wnAppRevoke(i){
  const a=(WN_PROFILE.apps||[])[i];if(!a||!confirm(`رمز برنامهٔ «${a.name}» ابطال شود؟ برنامه‌های وابسته دسترسی را از دست می‌دهند.`))return;
  try{const r=await wnApi("/profile",{action:"app_revoke",uuid:a.uuid,confirm:true});WN_PROFILE=r;toast("ابطال شد");wnProfileDraw()}catch(e){toast(e.message)}}

/* ---------- permalinks ---------- */
async function wnPermalinks(){
  shell("پیوندهای یکتا",null,wnBack);loading();
  try{WN_PERM=await wnApi("/permalinks");wnPermDraw()}catch(e){wnFail(e)}}
function wnPermDraw(){
  const p=WN_PERM;
  $("#v").innerHTML=`<div class="cd"><b>ساختار فعلی</b><div class="ltr m" style="margin-top:6px">${wnEsc(p.structure||"ساده (?p=123)")}</div>${p.sample?`<div class="m ltr" style="word-break:break-all;margin-top:4px">${wnEsc(p.sample)}</div>`:""}</div>
  <h3>انتخاب سریع</h3>${p.presets.map((x,i)=>`<label class="cd row" style="cursor:pointer"><input type="radio" name="wn_pp" style="width:auto" value="${i}" ${x[0]===p.structure?"checked":""} onchange="wnPermPick(${i})"><div class="sp"><div class="t">${wnEsc(x[1])}</div><div class="m ltr">${wnEsc(x[2])}</div></div></label>`).join("")}
  <label class="l">ساختار سفارشی</label><input id="wn_ps" class="ltr" value="${wnEsc(p.structure)}" placeholder="/%postname%/">
  <p class="m">برچسب‌های مجاز: %year% %monthnum% %day% %hour% %minute% %second% %post_id% %postname% %category% %author% — حداقل یکی از %postname% یا %post_id% لازم است.</p>
  <div class="two"><div><label class="l">پیشوند دسته‌ها</label><input id="wn_cb" class="ltr" value="${wnEsc(p.category_base)}" placeholder="category"></div><div><label class="l">پیشوند برچسب‌ها</label><input id="wn_tb" class="ltr" value="${wnEsc(p.tag_base)}" placeholder="tag"></div></div>
  <button class="b p" style="width:100%;margin-top:12px" onclick="wnPermSave()">ذخیره</button>
  <button class="b" style="width:100%;margin-top:8px" onclick="wnPermFlush()">بازسازی قوانین بازنویسی (رفع خطای ۴۰۴)</button>`;
}
function wnPermPick(i){document.getElementById("wn_ps").value=WN_PERM.presets[i][0]}
async function wnPermSave(){
  const s=wnV("wn_ps").trim();
  if(s!==WN_PERM.structure&&!confirm("تغییر ساختار پیوندها آدرس همهٔ مطالب را عوض می‌کند و لینک‌های قدیمی ممکن است از کار بیفتند (ریدایرکت خودکار نیست). ادامه؟"))return;
  try{WN_PERM=await wnApi("/permalinks",{structure:s,category_base:wnV("wn_cb"),tag_base:wnV("wn_tb"),confirm:true});toast("ذخیره شد ✓");wnPermDraw()}catch(e){toast(e.message)}}
async function wnPermFlush(){try{WN_PERM=await wnApi("/permalinks",{flush:true});toast("بازسازی شد ✓");wnPermDraw()}catch(e){toast(e.message)}}

/* ---------- privacy ---------- */
async function wnPrivacy(){
  shell("حریم خصوصی",null,wnBack);loading();
  try{WN_PRIV=await wnApi("/privacy");wnPrivDraw()}catch(e){wnFail(e)}}
function wnPrivDraw(){
  const p=WN_PRIV;
  $("#v").innerHTML=`${p.can_manage?`<div class="cd"><b>برگهٔ سیاست حریم خصوصی</b>
  <select id="wn_pg" style="margin-top:8px"><option value="0">— انتخاب نشده —</option>${p.pages.map(x=>`<option value="${x.id}" ${x.id===p.page_id?"selected":""}>${wnEsc(x.title)}${x.status!=="publish"?` (${wnEsc(st(x.status))})`:""}</option>`).join("")}</select>
  <button class="b p" style="width:100%;margin-top:8px" onclick="wnPrivPage()">ذخیرهٔ برگه</button>${p.page_url?`<a class="b" style="display:block;text-align:center;text-decoration:none;color:var(--tx);margin-top:8px" href="${wnEsc(safeHref(p.page_url))}" target="_blank" rel="noopener noreferrer">مشاهدهٔ برگه</a>`:""}</div>`:""}
  ${p.can_export||p.can_erase?`<div class="cd"><b>درخواست جدید دادهٔ شخصی</b><label class="l">ایمیل کاربر</label><input id="wn_rq" class="ltr" type="email">
  <div class="row" style="margin-top:8px">${p.can_export?`<button class="b sp" onclick="wnPrivNew('export_personal_data')">برون‌بری داده</button>`:""}${p.can_erase?`<button class="b d sp" onclick="wnPrivNew('remove_personal_data')">پاک‌سازی داده</button>`:""}</div>
  <p class="m">ایمیل تأیید برای کاربر ارسال می‌شود؛ اجرای نهایی (دانلود/پاک‌سازی) را از پنل وردپرس انجام دهید.</p></div>`:""}
  <h3>درخواست‌ها</h3>${p.requests.map((x,i)=>`<div class="cd row"><div class="sp"><div class="t ltr">${wnEsc(x.email)}</div><div class="m">${wnEsc(x.type_label)} · ${wnEsc(x.date)}</div></div><span class="pill">${wnEsc(x.status_label)}</span><button class="b d" onclick="wnPrivDel(${i})">✕</button></div>`).join("")||`<div class="ld">درخواستی ثبت نشده</div>`}
  <button class="b" style="width:100%;margin-top:10px" onclick="panel('tools.php?page=export_personal_data',true,'درخواست‌های حریم خصوصی')">باز کردن پنل کامل درخواست‌ها</button>`;
}
async function wnPrivPage(){try{WN_PRIV=await wnApi("/privacy",{action:"set_page",page_id:Number(wnV("wn_pg"))});toast("ذخیره شد ✓");wnPrivDraw()}catch(e){toast(e.message)}}
async function wnPrivNew(type){
  const email=wnV("wn_rq").trim();if(!email)return toast("ایمیل را وارد کنید");
  const erase=type==="remove_personal_data";
  if(!confirm(erase?"درخواست پاک‌سازی دادهٔ شخصی برای این ایمیل ثبت و ایمیل تأیید ارسال شود؟":"درخواست برون‌بری دادهٔ شخصی ثبت و ایمیل تأیید ارسال شود؟"))return;
  try{WN_PRIV=await wnApi("/privacy",{action:"create_request",type,email,confirm:true});toast("درخواست ثبت شد");wnPrivDraw()}catch(e){toast(e.message)}}
async function wnPrivDel(i){const x=WN_PRIV.requests[i];if(!x||!confirm("این درخواست برای همیشه حذف شود؟"))return;
  try{WN_PRIV=await wnApi("/privacy",{action:"delete_request",id:x.id,confirm:true});toast("حذف شد");wnPrivDraw()}catch(e){toast(e.message)}}

/* ---------- block patterns ---------- */
function wnPatterns(){
  WN_PATQ="";WN_PATP=1;WN_PAT=[];
  shell("الگوهای بلوکی",`<input id="wn_patq" placeholder="جستجو…" onchange="WN_PATQ=this.value;WN_PATP=1;WN_PAT=[];wnPatLoad()"><div id="wn_patl"></div><div id="wn_patm" style="text-align:center"></div><button class="fab" onclick="wnPatEdit(0)">＋</button>`,wnBack);
  wnPatLoad()}
async function wnPatLoad(){
  const first=WN_PATP===1,box=$("#wn_patl");if(!box)return;if(first)box.innerHTML=`<div class="ld">…</div>`;
  try{const r=await wnApi(`/patterns?page=${WN_PATP}&q=${encodeURIComponent(WN_PATQ)}`);const base=WN_PAT.length;WN_PAT=WN_PAT.concat(r.items);
   const h=r.items.map((x,i)=>`<div class="cd row" onclick="wnPatEdit(${x.id})"><div class="sp"><div class="t ell">${wnEsc(x.title)}</div><div class="m">${wnEsc(x.date)} · ${fa(x.words)} واژه · ${x.synced?"همگام":"مستقل"}</div></div><span class="${pc(x.status)}">${wnEsc(st(x.status))}</span></div>`).join("");
   if(first)box.innerHTML=h||`<div class="ld">الگویی نیست</div>`;else box.insertAdjacentHTML("beforeend",h);
   $("#wn_patm").innerHTML=r.pages>WN_PATP?`<button class="b" onclick="WN_PATP++;wnPatLoad()">بیشتر…</button>`:""}catch(e){box.innerHTML=`<div class="cd">${wnEsc(e.message)}</div>`}}
async function wnPatEdit(id){
  sheet(`<div class="ld">…</div>`);
  try{const p=id?await wnApi("/patterns?id="+id):{id:0,title:"",content:"",status:"publish",synced:true};
   sheet(`<div class="row"><b class="sp">${id?"ویرایش الگو":"الگوی جدید"}</b>${X()}</div>
   <label class="l">عنوان</label><input id="wn_pt" value="${wnEsc(p.title==="(بدون عنوان)"?"":p.title)}">
   <label class="l">محتوا (بلوک‌ها / HTML)</label><textarea id="wn_pc" class="ltr" rows="10" style="font-family:monospace">${wnEsc(p.content)}</textarea>
   <label class="l">وضعیت</label><select id="wn_ps2">${[["publish","منتشر شده"],["draft","پیش‌نویس"],["private","خصوصی"]].map(a=>`<option value="${a[0]}" ${a[0]===p.status?"selected":""}>${a[1]}</option>`).join("")}</select>
   <label class="row" style="padding:8px 0"><input type="checkbox" id="wn_psy" style="width:auto" ${p.synced?"checked":""}> <span>همگام (تغییر یک‌جا، همه‌جا اعمال شود)</span></label>
   <p class="m">کامنت‌های بلوک (&lt;!-- wp:… --&gt;) را دست نزنید تا الگو در ویرایشگر وردپرس سالم بماند.</p>
   <div class="row"><button class="b p sp" onclick="wnPatSave(${id})">ذخیره</button>${id?`<button class="b d" onclick="wnPatDel(${id})">انتقال به زباله‌دان</button>`:""}</div>`)
  }catch(e){closeSheet();toast(e.message)}}
async function wnPatSave(id){
  try{await wnApi("/patterns",{id,title:wnV("wn_pt"),content:wnV("wn_pc"),status:wnV("wn_ps2"),synced:document.getElementById("wn_psy").checked});closeSheet();toast("ذخیره شد ✓");wnPatterns()}catch(e){toast(e.message)}}
async function wnPatDel(id){if(!confirm("این الگو به زباله‌دان منتقل شود؟ صفحه‌هایی که از آن استفاده می‌کنند ممکن است تغییر کنند."))return;
  try{await wnApi("/patterns",{id,delete:true});closeSheet();toast("منتقل شد");wnPatterns()}catch(e){toast(e.message)}}

/* ---------- export (WXR) ---------- */
function wnExport(){
  shell("برون‌بری محتوا",null,wnBack);
  const opts=[["all","همهٔ محتوا"],["post","نوشته‌ها"],["page","برگه‌ها"],["attachment","رسانه (فقط اطلاعات)"],...(types||[]).map(t=>[t.name,t.label])];
  $("#v").innerHTML=`<div class="cd"><p class="m">یک فایل XML استاندارد وردپرس (WXR) ساخته می‌شود که با «درون‌ریزی» وردپرس قابل بارگذاری است. فایل‌های رسانه خودشان داخل خروجی نیستند، فقط نشانی آن‌ها. حداکثر حجم ۶ مگابایت.</p>
  <label class="l">چه چیزی؟</label><select id="wn_ex">${opts.map(a=>`<option value="${wnEsc(a[0])}">${wnEsc(a[1])}</option>`).join("")}</select>
  <button class="b p" style="width:100%;margin-top:12px" onclick="wnExportRun()">ساخت و ذخیرهٔ فایل</button><div id="wn_exm" class="m" style="margin-top:8px"></div></div>
  <div class="cd"><b>درون‌ریزی</b><p class="m">درون‌ریزی به افزونهٔ WordPress Importer و بارگذاری فایل نیاز دارد و روی گوشی امن/پایدار نیست؛ از پنل کامل وردپرس انجام می‌شود.</p><button class="b" onclick="panel('import.php',true,'درون‌ریزی')">باز کردن درون‌ریزی</button></div>`;
}
async function wnExportRun(){
  const c=wnV("wn_ex"),box=$("#wn_exm");box.textContent="در حال ساخت خروجی…";
  try{const r=await wnApi("/export?content="+encodeURIComponent(c));
   const blob=new Blob([r.xml],{type:"text/xml"}),file=new File([blob],r.filename,{type:"text/xml"});
   box.textContent=`${r.filename} · ${fa(Math.round(r.size/1024))} کیلوبایت`;
   if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:r.filename});return}catch(e){if(e&&e.name==="AbortError")return}}
   const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=r.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast("فایل ذخیره شد")
  }catch(e){box.textContent="";toast(e.message)}}

/* ---------- WP-Cron ---------- */
async function wnCron(){
  shell("رویدادهای زمان‌بندی‌شده",null,wnBack);loading();
  try{const r=await wnApi("/cron");wnCronDraw(r)}catch(e){wnFail(e)}}
function wnCronDraw(r){
  WN_CRON=r.items||[];
  $("#v").innerHTML=`<div class="cd"><b>${fa(WN_CRON.length)} رویداد</b><div class="m">اکنون ${wnEsc(r.now)}${r.disabled?" · WP-Cron در تنظیمات سرور غیرفعال است (باید cron واقعی تنظیم شده باشد)":""}</div></div>
  <input id="wn_cq" placeholder="جستجوی نام رویداد…" oninput="wnCronFilter(this.value)">
  ${WN_CRON.map((x,i)=>`<div class="cd wn-cron" data-q="${wnEsc(x.hook.toLowerCase())}"><div class="row"><div class="sp"><div class="t ltr ell">${wnEsc(x.hook)}</div><div class="m">${wnEsc(x.schedule_label)} · ${wnEsc(x.next)} (${wnAgo(x.in)})${x.overdue?" · ⚠ عقب‌افتاده":""}</div></div></div>
  <div class="row" style="margin-top:6px"><button class="b sp" onclick="wnCronAct(${i},'run')">اجرای فوری</button><button class="b d" onclick="wnCronAct(${i},'delete')">حذف</button></div></div>`).join("")||`<div class="ld">رویدادی نیست</div>`}`;
}
function wnCronFilter(q){const v=String(q||"").toLowerCase().trim();document.querySelectorAll(".wn-cron").forEach(x=>x.style.display=!v||x.dataset.q.includes(v)?"":"none")}
async function wnCronAct(i,act){
  const x=WN_CRON[i];if(!x)return;
  if(!confirm(act==="run"?`رویداد «${x.hook}» همین حالا اجرا شود؟ بعضی رویدادها سنگین‌اند یا ایمیل می‌فرستند.`:`رویداد «${x.hook}» حذف شود؟ افزونهٔ مربوط ممکن است دوباره آن را بسازد.`))return;
  try{const r=await wnApi("/cron",{action:act,hook:x.hook,timestamp:x.timestamp,sig:x.sig,confirm:true});toast(act==="run"?"اجرا شد ✓":"حذف شد");wnCronDraw(r)}catch(e){toast(e.message)}}

/* ---------- roles ---------- */
async function wnRoles(){
  shell("نقش‌ها و دسترسی‌ها",null,wnBack);loading();
  try{WN_ROLES=await wnApi("/roles");wnRolesDraw()}catch(e){wnFail(e)}}
function wnRolesDraw(){
  const r=WN_ROLES;
  $("#v").innerHTML=`<button class="b p" style="width:100%" onclick="wnRoleNew()">＋ نقش جدید</button>
  ${r.items.map((x,i)=>`<div class="cd row" onclick="wnRoleView(${i})"><div class="sp"><div class="t">${wnEsc(x.name)} <span class="m ltr">${wnEsc(x.key)}</span></div><div class="m">${fa(x.users)} کاربر · ${fa(x.caps.length)} قابلیت${x.locked?" · قفل":""}</div></div><span>›</span></div>`).join("")}`;
}
function wnRoleView(i){
  const x=WN_ROLES.items[i];
  sheet(`<div class="row"><b class="sp">${wnEsc(x.name)}</b>${X()}</div><div class="m ltr">${wnEsc(x.key)}</div>
  ${x.locked?`<p class="m">نقش مدیر کل از اپ قابل ویرایش نیست.</p>`:`<p class="m">قابلیت‌ها را روشن/خاموش کنید. فقط قابلیت‌هایی را می‌توانید بدهید که حساب خودتان دارد.</p>`}
  <input id="wn_rq2" placeholder="جستجوی قابلیت…" oninput="wnRoleFilter(this.value)">
  <div style="max-height:46vh;overflow:auto" id="wn_caps">${WN_ROLES.all_caps.map(c=>`<label class="row wn-cap" data-q="${wnEsc(c)}" style="padding:5px 0"><input type="checkbox" class="wn_cap" style="width:auto" value="${wnEsc(c)}" ${x.caps.includes(c)?"checked":""} ${x.locked?"disabled":""}> <span class="ltr" style="font-size:12px">${wnEsc(c)}</span></label>`).join("")}</div>
  ${x.locked?"":`<div class="row" style="margin-top:10px"><button class="b p sp" onclick="wnRoleSave(${i})">ذخیرهٔ قابلیت‌ها</button>${!x.core&&!x.users?`<button class="b d" onclick="wnRoleDel(${i})">حذف نقش</button>`:""}</div>`}`);
}
function wnRoleFilter(q){const v=String(q||"").toLowerCase().trim();document.querySelectorAll(".wn-cap").forEach(x=>x.style.display=!v||x.dataset.q.toLowerCase().includes(v)?"":"none")}
async function wnRoleSave(i){
  const x=WN_ROLES.items[i],now=new Set([...document.querySelectorAll(".wn_cap:checked")].map(e=>e.value)),old=new Set(x.caps);
  const add=[...now].filter(c=>!old.has(c)),remove=[...old].filter(c=>!now.has(c));
  if(!add.length&&!remove.length)return toast("تغییری نیست");
  if(!confirm(`${fa(add.length)} قابلیت اضافه و ${fa(remove.length)} قابلیت حذف شود؟ این کار فوراً روی همهٔ کاربران این نقش اثر می‌گذارد.`))return;
  try{WN_ROLES=await wnApi("/roles",{action:"caps",key:x.key,add,remove});closeSheet();toast("ذخیره شد ✓");wnRolesDraw()}catch(e){toast(e.message)}}
async function wnRoleDel(i){const x=WN_ROLES.items[i];if(!confirm(`نقش «${x.name}» حذف شود؟`))return;
  try{WN_ROLES=await wnApi("/roles",{action:"delete",key:x.key,confirm:true});closeSheet();toast("حذف شد");wnRolesDraw()}catch(e){toast(e.message)}}
function wnRoleNew(){
  sheet(`<div class="row"><b class="sp">نقش جدید</b>${X()}</div><label class="l">نام نمایشی</label><input id="wn_rn"><label class="l">کلید (لاتین، بدون فاصله)</label><input id="wn_rk" class="ltr" placeholder="support_agent">
  <label class="l">کپی قابلیت‌ها از</label><select id="wn_rc"><option value="">فقط مشاهده (read)</option>${WN_ROLES.items.filter(x=>!x.locked).map(x=>`<option value="${wnEsc(x.key)}">${wnEsc(x.name)}</option>`).join("")}</select>
  <button class="b p" style="width:100%;margin-top:12px" onclick="wnRoleCreate()">ساخت نقش</button>`)}
async function wnRoleCreate(){
  const key=wnV("wn_rk").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");if(!key||!wnV("wn_rn").trim())return toast("نام و کلید لاتین لازم است");
  try{WN_ROLES=await wnApi("/roles",{action:"create",key,name:wnV("wn_rn"),clone:wnV("wn_rc")});closeSheet();toast("نقش ساخته شد");wnRolesDraw()}catch(e){toast(e.message)}}

/* ---------- multisite network ---------- */
async function wnNetwork(){
  WN_NETQ="";WN_NETP=1;shell("شبکهٔ چندسایتی",null,wnBack);loading();await wnNetLoad()}
async function wnNetLoad(){
  try{WN_NET=await wnApi(`/network?page=${WN_NETP}&q=${encodeURIComponent(WN_NETQ)}`);wnNetDraw()}catch(e){wnFail(e)}}
function wnNetDraw(){
  const n=WN_NET;
  if(!n.multisite){$("#v").innerHTML=`<div class="cd">${wnEsc(n.message||"این سایت چندسایتی نیست")}</div>`;return}
  $("#v").innerHTML=`<div class="cd"><b>${wnEsc(n.network)}</b><div class="m">${fa(n.sites)} سایت · ${fa(n.users)} کاربر شبکه</div></div>
  <input id="wn_nq" placeholder="جستجوی دامنه یا مسیر…" value="${wnEsc(WN_NETQ)}" onchange="WN_NETQ=this.value;WN_NETP=1;wnNetLoad()">
  ${n.items.map((x,i)=>`<div class="cd"><div class="row"><div class="sp"><div class="t">${wnEsc(x.name||x.domain)}</div><div class="m ltr">${wnEsc(x.domain+x.path)}</div><div class="m">ثبت ${wnEsc(x.registered)}</div></div>
  ${x.main?`<span class="pill">اصلی</span>`:x.archived?`<span class="pill">بایگانی</span>`:x.spam||x.deleted?`<span class="pill">${x.spam?"اسپم":"حذف‌شده"}</span>`:`<span class="pill">فعال</span>`}</div>
  ${x.main?"":`<div class="row" style="margin-top:6px"><button class="b sp" onclick="wnNetToggle(${i})">${x.archived?"بازگردانی از بایگانی":"بایگانی سایت"}</button></div>`}</div>`).join("")||`<div class="ld">سایتی پیدا نشد</div>`}
  <div class="row" style="justify-content:center;margin-top:8px">${WN_NETP>1?`<button class="b" onclick="WN_NETP--;wnNetLoad()">قبلی</button>`:""}${n.pages>WN_NETP?`<button class="b" onclick="WN_NETP++;wnNetLoad()">بعدی</button>`:""}</div>`;
}
async function wnNetToggle(i){
  const x=WN_NET.items[i];if(!x)return;const act=x.archived?"unarchive":"archive";
  if(!confirm(act==="archive"?`سایت «${x.domain+x.path}» بایگانی شود؟ بازدیدکنندگان دیگر آن را نمی‌بینند.`:`سایت «${x.domain+x.path}» از بایگانی خارج شود؟`))return;
  try{WN_NET=await wnApi("/network",{action:act,id:x.id,confirm:true,page:WN_NETP});toast("انجام شد");await wnNetLoad()}catch(e){toast(e.message)}}
