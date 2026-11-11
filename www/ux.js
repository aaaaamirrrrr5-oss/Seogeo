/* ===== UX (v3.12.2): ورود HTTP/HTTPS، میانبرهای صفحهٔ اول، گروه‌های تاشوی «بیشتر» و «وردپرس» =====
   فقط لایهٔ نمایش و اعتبارسنجی آدرس است؛ هیچ API جدیدی ندارد و هیچ قابلیت قبلی را حذف نمی‌کند. */

/* ---------- آدرس سایت ---------- */
function normalizeSiteUrl(raw){
  let u=String(raw==null?"":raw).trim().replace(/\s+/g,"");
  if(!u)return{error:"آدرس سایت را وارد کنید"};
  // اصلاح فقط خطای رایج «دامنه,پسوند»؛ URL دارای مسیر/query یا پروتکل دست‌کاری نمی‌شود.
  if(!/^https?:\/\//i.test(u) && /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*,[A-Za-z]{2,24}$/.test(u))u=u.replace(",",".");
  if(!/^https?:\/\//i.test(u) && /^www\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*,[A-Za-z]{2,24}$/.test(u))u=u.replace(",",".");
  if(!/^https?:\/\//i.test(u)){
    if(/^[a-z][a-z0-9+.-]*:\/\//i.test(u))return{error:"فقط آدرس http:// یا https:// پذیرفته می‌شود"};
    u="https://"+u;
  }
  let p;
  try{p=new URL(u)}catch(e){return{error:"آدرس سایت معتبر نیست"}}
  if(!p.hostname)return{error:"آدرس سایت معتبر نیست"};
  // URL accepts punctuation such as commas in hostnames on some runtimes; accept only DNS/IP-shaped hosts.
  const host=p.hostname.toLowerCase(), ipv6=host.startsWith("[")&&host.endsWith("]");
  const dnsHost=/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i.test(host);
  if(!ipv6&&!dnsHost)return{error:"نام دامنه معتبر نیست؛ فقط حروف، عدد، خط تیره و نقطه مجاز است"};
  if(p.username||p.password)return{error:"نام کاربری و رمز نباید داخل آدرس نوشته شود"};
  const path=p.pathname.replace(/\/+$/,"");
  return{url:p.protocol+"//"+p.host+path,http:p.protocol==="http:",host:p.hostname};
}
const UX_HTTP_WARN="این سایت HTTPS ندارد. کلید اتصال و اطلاعات سایت بدون رمزنگاری در شبکه ارسال می‌شوند و در شبکهٔ عمومی (مثل وای‌فای کافه) قابل شنود هستند. فقط برای سایت شخصی/آزمایشی یا شبکهٔ مطمئن ادامه دهید. ادامه می‌دهید؟";

/* ---------- میانبرهای صفحهٔ اول ---------- */
const UX_QUICK=[
  {id:"newpost",i:"✎",t:"نوشتهٔ جدید",a:"postEdit(0,'post')",cap:"content_write_access",g:["#8b5cf6","#a78bfa"]},
  {id:"newpage",i:"📄",t:"برگهٔ جدید",a:"postEdit(0,'page')",cap:"page_write_access",g:["#0b7a62","#14b88f"]},
  {id:"media",i:"🖼️",t:"رسانه",a:"media()",cap:"media_write_access",g:["#ec4899","#f472b6"]},
  {id:"comments",i:"💬",t:"دیدگاه‌ها",a:"comments()",cap:"comments_access",g:["#f97316","#fb923c"]},
  {id:"orders",i:"🧾",t:"سفارش‌ها",a:"go('orders')",wc:1,cap:"orders_access",g:["#3b82f6","#60a5fa"]},
  {id:"neworder",i:"➕",t:"سفارش جدید",a:"orderCreate()",wc:1,cap:"orders_create_access",g:["#14b8a6","#5eead4"]},
  {id:"newproduct",i:"📦",t:"محصول جدید",a:"prodEditor(0)",wc:1,cap:"product_write_access",g:["#ef4444","#f87171"]},
  {id:"coupons",i:"🏷️",t:"کوپن‌ها",a:"coupons()",wc:1,cap:"coupons_access",g:["#f59e0b","#fbbf24"]},
  {id:"plugins",i:"🧩",t:"افزونه‌ها",a:"pluginsView()",cap:"plugins_access",g:["#f59e0b","#fbbf24"]},
  {id:"updates",i:"⬆️",t:"به‌روزرسانی‌ها",a:"updatesView()",cap:"updates_access",g:["#3b82f6","#93c5fd"]},
  {id:"settings",i:"⚙️",t:"تنظیمات",a:"wpSettings()",cap:"settings_access",g:["#475569","#94a3b8"]},
  {id:"users",i:"👥",t:"کاربران",a:"users()",cap:"users_access",g:["#0ea5e9","#38bdf8"]},
  {id:"search",i:"🔎",t:"جست‌وجوی بخش‌ها",a:"wordpressHome()",g:["#0e7490","#22d3ee"]},
  {id:"site",i:"🌍",t:"مشاهدهٔ سایت",a:"viewSite()",g:["#0b7a62","#0e5c58"]}
];
const UX_QUICK_MAX=8;
const UX_DEF=["newpost","newpage","media","comments","plugins","updates","settings","site"];
const UX_DEF_WC=["orders","neworder","newproduct","coupons","newpost","media","comments","plugins"];
/* catalog + ذخیره‌شدهٔ کاربر + وجود ووکامرس ← فهرست نهایی (حداکثر ۸، بدون تکرار، بدون موارد نامعتبر) */
function uxQuickResolve(catalog,saved,wc,caps=null){
  const ok=catalog.filter(x=>(wc||!x.wc)&&(!caps||!x.cap||!!caps[x.cap])),by=new Map(ok.map(x=>[x.id,x]));
  const own=Array.isArray(saved)?saved.filter(id=>by.has(id)):[];
  const ids=own.length?own:(wc?UX_DEF_WC:UX_DEF).filter(id=>by.has(id));
  return [...new Set(ids)].slice(0,UX_QUICK_MAX).map(id=>by.get(id));
}
const uxQuickKey=()=>"smb_quick_"+(typeof S!=="undefined"&&S?(S.id||S.url||"site"):"site");
function uxQuickSaved(){try{return JSON.parse(localStorage.getItem(uxQuickKey())||"null")}catch(e){return null}}
function uxQuick(){
  const items=uxQuickResolve(UX_QUICK,uxQuickSaved(),!!(typeof info!=="undefined"&&info&&info.wc),window.smbDashCaps||null);
  return `<div class="qa-head"><b>دسترسی سریع</b><button class="b" onclick="uxQuickEdit()">ویرایش میانبرها</button></div>
  ${items.length?"":`<div class=\"cd m\">با مجوزهای این حساب میانبری برای نمایش وجود ندارد. از «ویرایش میانبرها» یا دسترسی حساب را بررسی کنید.</div>`}
  <div class="qa">${items.map(x=>`<button class="qa-b" onclick="${x.a}"><span class="ic" style="--g1:${x.g[0]};--g2:${x.g[1]}">${x.i}</span><span>${x.t}</span></button>`).join("")}</div>`;
}
function uxQuickEdit(){
  const wc=!!info.wc,allowed=UX_QUICK.filter(x=>(wc||!x.wc)&&(!window.smbDashCaps||!x.cap||!!window.smbDashCaps[x.cap]));
  const saved=uxQuickSaved(),selected=uxQuickResolve(UX_QUICK,saved,wc,window.smbDashCaps||null),order=[...selected,...allowed.filter(x=>!selected.some(y=>y.id===x.id))];
  sheet(`<div class="row"><b class="sp">سازمان‌دهی داشبورد</b>${X()}</div><div class="m" id="uxq_cnt" aria-live="polite"></div><p class="m">میانبرهای انتخاب‌شده را با کشیدن جابه‌جا کنید؛ برای صفحه‌های لمسی از فلش‌ها استفاده کنید. برداشتن تیک، میانبر را از داشبورد مخفی می‌کند. تنظیمات فقط روی همین اپ ذخیره می‌شوند.</p>
  <div class="qa-sort-list" id="uxq_sort">${order.map(x=>`<div class="qa-sort" draggable="true" data-id="${x.id}"><span class="qa-handle" aria-hidden="true">⠿</span><label class="qa-opt"><input type="checkbox" class="uxq" value="${x.id}" ${selected.some(y=>y.id===x.id)?"checked":""} onchange="uxQuickLimit(this)"><span>${x.i} ${x.t}</span></label><button type="button" class="b" aria-label="بالا بردن" onclick="uxQuickMove(this,-1)">↑</button><button type="button" class="b" aria-label="پایین بردن" onclick="uxQuickMove(this,1)">↓</button></div>`).join("")}</div>
  <div class="row" style="margin-top:12px"><button class="b p sp" onclick="uxQuickSave()">ذخیره چیدمان</button><button class="b" onclick="uxQuickReset()">بازگردانی پیش‌فرض</button></div>`);
  uxQuickBindDrag();uxQuickCount();
}
function uxQuickCount(){const e=document.getElementById("uxq_cnt");if(e)e.textContent=fa(document.querySelectorAll(".uxq:checked").length)+" از "+fa(UX_QUICK_MAX)+" میانبر انتخاب شده"}
function uxQuickMove(button,delta){const row=button?.closest('.qa-sort'),host=row?.parentElement;if(!row||!host)return;const next=delta<0?row.previousElementSibling:row.nextElementSibling;if(!next)return;if(delta<0)host.insertBefore(row,next);else host.insertBefore(next,row)}
function uxQuickBindDrag(){const host=document.getElementById('uxq_sort');if(!host)return;let dragging=null;
  host.addEventListener('dragstart',e=>{const row=e.target.closest('.qa-sort');if(!row)return;dragging=row;row.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',row.dataset.id)}});
  host.addEventListener('dragover',e=>{if(!dragging)return;e.preventDefault();const target=e.target.closest('.qa-sort');if(!target||target===dragging)return;const r=target.getBoundingClientRect();host.insertBefore(dragging,e.clientY<r.top+r.height/2?target:target.nextElementSibling)});
  host.addEventListener('drop',e=>{if(dragging)e.preventDefault()});
  host.addEventListener('dragend',()=>{if(dragging)dragging.classList.remove('dragging');dragging=null});
}
function uxQuickLimit(el){
  const n=document.querySelectorAll(".uxq:checked").length;
  if(n>UX_QUICK_MAX){el.checked=false;toast("حداکثر "+fa(UX_QUICK_MAX)+" میانبر مجاز است")}
  uxQuickCount();
}
function uxQuickSave(){
  const ids=[...document.querySelectorAll("#uxq_sort .qa-sort")].filter(row=>row.querySelector(".uxq")?.checked).map(row=>row.dataset.id);
  if(!ids.length)return toast("دست‌کم یک میانبر انتخاب کنید");
  try{localStorage.setItem(uxQuickKey(),JSON.stringify(ids))}catch(e){return toast("ذخیره نشد؛ حافظهٔ دستگاه پر است")}
  closeSheet();toast("میانبرها ذخیره شد ✓");go("home");
}
function uxQuickReset(){try{localStorage.removeItem(uxQuickKey())}catch(e){}closeSheet();toast("میانبرها به حالت پیش‌فرض برگشت");go("home")}

/* ---------- گروه‌های تاشو در «بیشتر» ---------- */
const UX_HG_KEY="smb_hg_open";
function uxHgOpenSet(){try{const a=JSON.parse(localStorage.getItem(UX_HG_KEY)||"null");return Array.isArray(a)?new Set(a):null}catch(e){return null}}
function uxHgStore(){
  try{localStorage.setItem(UX_HG_KEY,JSON.stringify([...document.querySelectorAll("#v details.hg")].filter(d=>d.open).map(d=>d.dataset.t)))}catch(e){}
}
function uxGroupHub(){
  const v=document.getElementById("v");if(!v)return;
  const saved=uxHgOpenSet();let first=true;
  [...v.children].forEach(h=>{
    const nx=h.nextElementSibling;
    if(h.tagName!=="H3"||!nx||!nx.classList.contains("hub"))return;
    const t=h.textContent.trim(),d=document.createElement("details"),s=document.createElement("summary");
    d.className="hg";d.dataset.t=t;d.open=saved?saved.has(t):first;first=false;
    s.innerHTML=`<span>${esc(t)}</span><small class="m">${fa(nx.children.length)}</small>`;
    d.appendChild(s);v.replaceChild(d,h);d.appendChild(nx);
    d.addEventListener("toggle",uxHgStore);
  });
  if(!document.getElementById("hq"))v.insertAdjacentHTML("afterbegin",`<input id="hq" class="hq" type="search" placeholder="جست‌وجوی دکمه‌ها…" oninput="uxHubFilter(this.value)">`);
}
function uxHubFilter(q){
  const f=String(q||"").toLocaleLowerCase("fa").trim();
  document.querySelectorAll("#v details.hg").forEach(d=>{
    let any=false;
    d.querySelectorAll(".tile").forEach(t=>{const m=!f||t.textContent.toLocaleLowerCase("fa").includes(f);t.style.display=m?"":"none";if(m)any=true});
    d.style.display=any?"":"none";
    if(f&&any)d.open=true;
  });
}

/* ---------- گروه‌های تاشو در «وردپرس» ---------- */
function uxGroupWp(){
  const box=document.getElementById("wp_feature_groups");if(!box)return;
  box.querySelectorAll(":scope>.wp-group-title").forEach((h,i)=>{
    const g=h.nextElementSibling;if(!g||!g.classList.contains("wp-grid"))return;
    h.classList.add("wp-fold");if(i>=2)g.classList.add("wp-collapsed");else h.classList.add("open");
    if(g.classList.contains("wp-collapsed"))h.classList.remove("open");
  });
}
function uxWpToggle(h){
  const g=h.nextElementSibling;if(!g||!g.classList.contains("wp-grid"))return;
  const c=g.classList.toggle("wp-collapsed");h.classList.toggle("open",!c);
}

/* ---------- فرم اتصال: نمایش کلید و راهنمای زندهٔ آدرس ---------- */
function uxUrlHint(v){
  const r=normalizeSiteUrl(v);
  if(!String(v||"").trim())return{cls:"",text:""};
  if(r.error)return{cls:"bad",text:"✖ "+r.error};
  if(r.http)return{cls:"warn",text:"⚠️ بدون رمزنگاری (HTTP) — فقط برای شبکهٔ مطمئن یا سایت آزمایشی"};
  return{cls:"ok",text:"🔒 اتصال امن (HTTPS) · "+r.host};
}
function uxSetupExtras(){
  const u=document.getElementById("u"),k=document.getElementById("k");if(!u||!k||document.getElementById("uh"))return;
  u.insertAdjacentHTML("afterend",`<div id="uh" class="uh" aria-live="polite"></div>`);
  const upd=()=>{const h=uxUrlHint(u.value),e=document.getElementById("uh");e.className="uh "+h.cls;e.textContent=h.text};
  u.addEventListener("input",upd);upd();
  k.insertAdjacentHTML("afterend",`<button type="button" class="b kt" onclick="uxToggleKey()" aria-label="نمایش یا پنهان‌کردن کلید">👁 نمایش کلید</button>`);
}
function uxToggleKey(){
  const k=document.getElementById("k"),b=document.querySelector(".kt");if(!k)return;
  const show=k.type==="password";k.type=show?"text":"password";if(b)b.textContent=show?"🙈 پنهان‌کردن کلید":"👁 نمایش کلید";
}

/* ---------- اتصال به برنامه (فقط در مرورگر/اپ؛ نه در تست Node) ---------- */
if(typeof document!=="undefined"&&typeof window!=="undefined"&&typeof hub==="function"){
  if(typeof setup==="function"){const _su=setup;setup=async function(){const r=await _su.apply(this,arguments);try{uxSetupExtras()}catch(e){}return r}}
  const _hub=hub;hub=function(){_hub.apply(this,arguments);try{uxGroupHub()}catch(e){}};
  if(typeof wordpressHome==="function"){const _wp=wordpressHome;wordpressHome=async function(){const r=await _wp.apply(this,arguments);try{uxGroupWp()}catch(e){}return r}}
  if(typeof wpFilterCards==="function"){
    const _f=wpFilterCards;
    wpFilterCards=function(q){
      const open=!!String(q||"").trim();
      document.querySelectorAll("#wp_feature_groups .wp-grid.wp-collapsed").forEach(g=>{if(open)g.dataset.uxc="1";});
      document.querySelectorAll("#wp_feature_groups .wp-grid").forEach(g=>{if(open)g.classList.remove("wp-collapsed");else if(g.dataset.uxc){g.classList.add("wp-collapsed");delete g.dataset.uxc}});
      return _f.apply(this,arguments);
    };
  }
  document.addEventListener("click",e=>{const h=e.target.closest&&e.target.closest("#wp_feature_groups>.wp-group-title");if(h)uxWpToggle(h)});
  try{uxSetupExtras()}catch(e){} /* boot() پیش از بارگذاری این فایل فرم اتصال را رسم کرده است */
}
if(typeof module!=="undefined"&&module.exports)module.exports={uxUrlHint,normalizeSiteUrl,uxQuickResolve,UX_QUICK,UX_QUICK_MAX,UX_DEF,UX_DEF_WC};
