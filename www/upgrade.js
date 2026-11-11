/* Site Manager 4.3 — "Quick Pro" upgrade layer. Additive and dependency-free.
   Features: command palette (Ctrl/Cmd+K + top-bar button), offline banner, scroll-to-top,
   per-tab scroll memory, swipe-down to close sheets, pull-to-refresh, light haptics. */
(function(){
  "use strict";
  /* ---------- pure helpers (unit-tested in Node) ---------- */
  const DIGITS={"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
  function normalize(s){
    return String(s==null?"":s).toLowerCase()
      .replace(/[\u064A\u0649]/g,"\u06CC").replace(/\u0643/g,"\u06A9")
      .replace(/[\u200c\u200d\u064B-\u065F\u0640]/g,"")
      .replace(/[۰-۹٠-٩]/g,d=>DIGITS[d]||d)
      .replace(/\s+/g," ").trim();
  }
  /* Score: 3 = prefix of label, 2 = word prefix / substring, 1 = keyword hit, 0 = no match. */
  function score(q,item){
    const n=normalize(q);if(!n)return 1;
    const label=normalize(item.label),kw=normalize(item.keywords||"");
    if(label.startsWith(n))return 3;
    if(label.split(" ").some(w=>w.startsWith(n)))return 2.5;
    if(label.includes(n))return 2;
    if(kw.includes(n))return 1;
    const parts=n.split(" ").filter(Boolean);
    if(parts.length>1&&parts.every(p=>label.includes(p)||kw.includes(p)))return 1.5;
    return 0;
  }
  function rank(q,items,recent){
    const rec=new Map((recent||[]).map((id,i)=>[id,i]));
    return items.map(it=>({it,s:score(q,it)})).filter(x=>x.s>0)
      .sort((a,b)=>b.s-a.s||(rec.has(b.it.id)?1:0)-(rec.has(a.it.id)?1:0)||(rec.get(a.it.id)??99)-(rec.get(b.it.id)??99))
      .map(x=>x.it);
  }
  function pullDecision(startY,curY,scrollTop,threshold){
    const t=threshold||80;
    if(scrollTop>0)return "none";
    const d=curY-startY;
    return d>=t?"refresh":d>8?"pulling":"none";
  }
  function swipeCloses(startY,endY,dt,scrollTop){
    if(scrollTop>0)return false;
    const d=endY-startY;
    return d>110||(d>50&&dt<260&&d/Math.max(dt,1)>0.45);
  }
  function greeting(h){h=Number(h);return h<5?"شب بخیر":h<12?"صبح بخیر":h<17?"ظهر بخیر":h<20?"عصر بخیر":"شب بخیر"}
  function trend(days){
    const e=Object.entries(days||{}).map(([k,v])=>[k,Number(v)||0]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    if(e.length<2)return null;
    const values=e.map(x=>x[1]),last=values[values.length-1],prev=values.slice(0,-1),avg=prev.reduce((a,b)=>a+b,0)/prev.length;
    const deltaPct=avg>0?Math.round((last-avg)/avg*100):null;
    return{values,last,avg,deltaPct,dir:deltaPct==null||deltaPct===0?"flat":deltaPct>0?"up":"down"};
  }
  function sparkPath(values,w,h,pad){
    pad=pad==null?4:pad;const n=values.length;if(n<2)return"";
    const mn=Math.min(...values),mx=Math.max(...values),span=mx-mn;
    return values.map((v,i)=>{
      const x=pad+i*(w-2*pad)/(n-1),y=span===0?h/2:h-pad-(v-mn)/span*(h-2*pad);
      return(i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);
    }).join(" ");
  }
  function focusCards(d){
    if(!d||typeof d!=="object")return[];
    const c=d.counts||{};
    return[
      {id:"processing",icon:"⚙️",title:"سفارش در حال انجام",n:c["wc-processing"],act:"orders",tone:"info"},
      {id:"onhold",icon:"⏳",title:"سفارش در انتظار بررسی",n:c["wc-on-hold"],act:"orders",tone:"warn"},
      {id:"comments",icon:"💬",title:"دیدگاه در انتظار تأیید",n:d.comments_access?d.comments:0,act:"comments",tone:"info"},
      {id:"updates",icon:"🧩",title:"به‌روزرسانی افزونه",n:d.updates,act:"plugins",tone:"warn"},
      {id:"stock",icon:"📦",title:"محصول ناموجود",n:d.product_access?d.out_of_stock:0,act:"products",tone:"danger"}
    ].filter(x=>Number(x.n)>0);
  }
  /* Android back button: decide what one "back" press should do. */
  function backAction(st){
    if(st.sheetOpen)return"close-sheet";
    if(st.hasBack)return"back-button";
    if(st.tab&&st.tab!=="home")return"home";
    return"arm-exit";
  }
  const THEMES=["system","light","dark"];
  function nextTheme(cur){const i=THEMES.indexOf(cur||"system");return THEMES[(Math.max(i,0)+1)%THEMES.length]}
  function fontStep(cur,delta){return Math.max(14,Math.min(21,(Number(cur)||15)+delta))}
  const api={backAction,normalize,score,rank,pullDecision,swipeCloses,greeting,trend,sparkPath,focusCards,nextTheme,fontStep};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(typeof document==="undefined")return;

  /* ---------- app glue ---------- */
  const $=s=>document.querySelector(s);
  const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reduced=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(_){return false}};
  const RECENT_KEY="smb_palette_recent";
  const call=(name,...a)=>{const f=window[name];if(typeof f==="function")return f(...a);try{toast("این بخش در دسترس نیست")}catch(_){}};
  const curTab=()=>{try{return typeof tab!=="undefined"?tab:"home"}catch(_){return"home"}};
  const curInfo=()=>{try{return typeof info!=="undefined"?info:null}catch(_){return null}};
  const prefs=()=>{try{return typeof uiPrefs!=="undefined"?uiPrefs:null}catch(_){return null}};

  function catalog(){
    const i0=curInfo(),wc=!!(i0&&i0.wc);
    const L=[
      {id:"home",icon:"⌂",label:"خانه",keywords:"داشبورد dashboard home",run:()=>call("go","home")},
      {id:"wp",icon:"◈",label:"مدیریت وردپرس",keywords:"wordpress وردپرس",run:()=>call("wordpressHome")},
      {id:"hub",icon:"☷",label:"همه بخش‌ها",keywords:"بیشتر hub منو",run:()=>call("hub")},
      {id:"posts",icon:"📝",label:"مقاله‌ها",keywords:"نوشته پست post blog",run:()=>call("section","post")},
      {id:"pages",icon:"📄",label:"برگه‌ها",keywords:"صفحه page",run:()=>call("section","page")},
      {id:"media",icon:"🖼️",label:"رسانه",keywords:"تصویر عکس فایل media upload",run:()=>call("media")},
      {id:"comments",icon:"💬",label:"دیدگاه‌ها",keywords:"نظر comments spam",run:()=>call("comments")},
      {id:"plugins",icon:"🧩",label:"افزونه‌ها",keywords:"پلاگین plugin update به‌روزرسانی",run:()=>call("pluginsView")},
      {id:"themes",icon:"🎨",label:"پوسته‌ها",keywords:"قالب theme appearance ظاهر",run:()=>call("themes")},
      {id:"settings",icon:"⚙️",label:"تنظیمات اصلی",keywords:"settings options",run:()=>call("wpSettings")},
      {id:"menus",icon:"☰",label:"همه منوها",keywords:"menu admin",run:()=>call("adminMenu")},
      {id:"api",icon:"🔌",label:"مدیریت API",keywords:"api rest کلید",run:()=>call("apiManager")},
      {id:"pro",icon:"🚀",label:"ابزارهای حرفه‌ای",keywords:"امنیت security redirect تعمیر maintenance",run:()=>call("prHub")},
      {id:"tools",icon:"🛠️",label:"ابزارهای وردپرس",keywords:"tools ابزار",run:()=>call("toolsPage")},
      {id:"center",icon:"🧭",label:"مرکز کنترل حرفه‌ای",keywords:"control center بکاپ backup سلامت health",run:()=>call("openUltimateCenter")},
      {id:"view",icon:"🌍",label:"مشاهدهٔ سایت",keywords:"view site مرورگر",run:()=>call("viewSite")},
      {id:"switch",icon:"⇄",label:"تغییر سایت",keywords:"switch چندسایتی سایت‌ها site",run:()=>call("switcher")}
    ];
    if(wc)L.push(
      {id:"orders",icon:"🧾",label:"سفارش‌ها",keywords:"orders woocommerce فروش",run:()=>call("go","orders")},
      {id:"products",icon:"📦",label:"محصولات",keywords:"products کالا موجودی",run:()=>call("section","product")},
      {id:"customers",icon:"👥",label:"مشتریان",keywords:"customers مشتری",run:()=>call("customers")},
      {id:"gateways",icon:"💳",label:"پرداخت‌ها",keywords:"payment درگاه gateway",run:()=>call("gateways")},
      {id:"woohub",icon:"🛒",label:"هاب ووکامرس",keywords:"woocommerce فروشگاه shop",run:()=>call("wooHub")},
      {id:"bulkprice",icon:"٪",label:"قیمت گروهی امن",keywords:"تخفیف قیمت bulk price",run:()=>call("bulkPrice")},
      {id:"csv",icon:"📥",label:"ورود/خروج CSV",keywords:"csv import export",run:()=>call("productCsv")}
    );
    const P=prefs()||{};
    L.push(
      {id:"c_theme",icon:"🌓",label:"تغییر تم (خودکار / روشن / تیره)",keywords:"theme dark light حالت شب تاریک روشن",run:()=>{const t=nextTheme(P.theme);savePrefs({theme:t});toast("تم: "+({system:"خودکار",light:"روشن",dark:"تیره"}[t]))}},
      {id:"c_fplus",icon:"A+",label:"بزرگ‌تر کردن متن",keywords:"font size فونت اندازه",run:()=>{const f=fontStep(P.fontSize,1);savePrefs({fontSize:f});toast("اندازه متن: "+f)}},
      {id:"c_fminus",icon:"A−",label:"کوچک‌تر کردن متن",keywords:"font size فونت اندازه",run:()=>{const f=fontStep(P.fontSize,-1);savePrefs({fontSize:f});toast("اندازه متن: "+f)}},
      {id:"c_hc",icon:"◐",label:(P.contrast?"خاموش کردن":"روشن کردن")+" کنتراست بالا",keywords:"contrast accessibility خوانایی دسترس‌پذیری",run:()=>{savePrefs({contrast:!P.contrast});toast("کنتراست بالا "+(P.contrast?"خاموش شد":"روشن شد"))}},
      {id:"c_calm",icon:"🧘",label:(P.calm?"فعال کردن":"کاهش")+" انیمیشن‌ها",keywords:"motion animation calm حرکت",run:()=>{savePrefs({calm:!P.calm});toast(P.calm?"انیمیشن‌ها فعال شد":"انیمیشن‌ها کم شد")}},
      {id:"c_hand",icon:"✋",label:"حالت "+(P.hand==="left"?"راست‌دست":"چپ‌دست")+" (جابه‌جایی دکمه‌های شناور)",keywords:"left right hand one-handed دست یک‌دست",run:()=>{const h=P.hand==="left"?"right":"left";savePrefs({hand:h});toast(h==="left"?"حالت چپ‌دست":"حالت راست‌دست")}},
      {id:"c_haptic",icon:"📳",label:(P.haptics===false?"روشن کردن":"خاموش کردن")+" لرزش لمسی",keywords:"haptic vibration لرزش",run:()=>{const on=P.haptics===false;savePrefs({haptics:on});toast("لرزش لمسی "+(on?"روشن شد":"خاموش شد"))}}
    );
    return L;
  }
  var savePrefs=function(patch){
    try{uiPrefs={...(prefs()||{}),...patch};localStorage.setItem("smb_ui_prefs",JSON.stringify(uiPrefs));if(typeof applyUiPrefs==="function")applyUiPrefs()}catch(_){}
  };
  const recentIds=()=>{try{const r=JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");return Array.isArray(r)?r.slice(0,6):[]}catch(_){return[]}};
  function remember(id){try{const r=[id,...recentIds().filter(x=>x!==id)].slice(0,6);localStorage.setItem(RECENT_KEY,JSON.stringify(r))}catch(_){}}

  let palItems=[],palSel=0,palRemote=[],remoteTimer=null,remoteSeq=0;
  function scheduleRemote(q){
    clearTimeout(remoteTimer);palRemote=[];const seq=++remoteSeq;
    if(normalize(q).length<2||typeof api!=="function")return;
    remoteTimer=setTimeout(async()=>{
      const i=curInfo(),enc=encodeURIComponent(q),jobs=[];
      if(i&&i.wc){
        jobs.push(api(`/orders?page=1&status=&q=${enc}`).then(r=>(r.items||[]).slice(0,4).map(o=>({id:"o"+o.id,icon:"🧾",group:"سفارش‌ها",label:"#"+o.number+" · "+(o.name||"مهمان"),run:()=>call("orderView",o.id)}))).catch(()=>[]));
        jobs.push(api(`/products?page=1&q=${enc}`).then(r=>(r.items||[]).slice(0,4).map(p=>({id:"p"+p.id,icon:"📦",group:"محصولات",label:p.name||("#"+p.id),run:()=>call("productEdit",p.id)}))).catch(()=>[]));
      }
      const res=(await Promise.all(jobs)).flat();
      const box=$("#upl_q");if(seq!==remoteSeq||!box)return;
      palRemote=res;paintPalette(box.value);
    },380);
  }
  function paintPalette(q){
    const all=catalog(),rec=recentIds();
    const local=q?rank(q,all,rec):[...rec.map(id=>all.find(i=>i.id===id)).filter(Boolean),...all.filter(i=>!rec.includes(i.id))];
    palItems=q?[...local,...palRemote]:local;
    palSel=Math.min(palSel,Math.max(0,palItems.length-1));
    const box=$("#upl_list");if(!box)return;
    box.innerHTML=palItems.length?(!q&&rec.length?`<div class="m upl-h">اخیراً استفاده‌شده</div>`:"")+palItems.map((it,i)=>(it.group&&(i===0||palItems[i-1].group!==it.group)?`<div class="m upl-h">${E(it.group)}</div>`:"")+`<button type="button" class="upl-i${i===palSel?" on":""}" role="option" aria-selected="${i===palSel}" data-i="${i}"><i aria-hidden="true">${E(it.icon)}</i><span>${E(it.label)}</span></button>`).join(""):`<div class="ld">نتیجه‌ای پیدا نشد</div>`;
    const on=box.querySelector(".upl-i.on");if(on&&on.scrollIntoView)on.scrollIntoView({block:"nearest"});
  }
  function pick(i){
    const it=palItems[i];if(!it)return;
    remember(it.id);
    if(typeof closeSheet==="function")closeSheet(false);
    setTimeout(()=>{try{it.run()}catch(e){try{toast(e.message)}catch(_){}}},0);
  }
  function openPalette(){
    if(typeof sheet!=="function"||!curInfo())return;
    palSel=0;palRemote=[];remoteSeq++;
    sheet(`<div class="row"><h3 class="sp" style="margin:0">پرش سریع</h3>${typeof X==="function"?X():""}</div>
      <input id="upl_q" type="search" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="بخش موردنظر را بنویسید… (مثلاً سفارش)" aria-label="جست‌وجوی بخش‌ها" role="combobox" aria-controls="upl_list" aria-expanded="true">
      <div id="upl_list" role="listbox" aria-label="بخش‌ها"></div>`);
    paintPalette("");
    const q=$("#upl_q"),list=$("#upl_list");
    if(!q||!list)return;
    q.addEventListener("input",()=>{palSel=0;scheduleRemote(q.value);paintPalette(q.value)});
    q.addEventListener("keydown",e=>{
      if(e.key==="ArrowDown"){e.preventDefault();palSel=Math.min(palItems.length-1,palSel+1);paintPalette(q.value)}
      else if(e.key==="ArrowUp"){e.preventDefault();palSel=Math.max(0,palSel-1);paintPalette(q.value)}
      else if(e.key==="Enter"){e.preventDefault();pick(palSel)}
    });
    list.addEventListener("click",e=>{const b=e.target.closest(".upl-i");if(b)pick(Number(b.dataset.i))});
    setTimeout(()=>{try{q.focus({preventScroll:true})}catch(_){}},60);
  }
  window.openQuickJump=openPalette;

  function injectTopButton(){
    const top=$("#app .top");if(!top||top.querySelector(".upl-btn")||!curInfo())return;
    const b=document.createElement("button");b.type="button";b.className="upl-btn";b.setAttribute("aria-label","جست‌وجوی بخش‌ها و پرش سریع");b.title="جست‌وجوی بخش‌ها و پرش سریع (Ctrl+K)";b.textContent="🔎 جستجو";
    b.addEventListener("click",openPalette);
    const av=top.querySelector(".av");av?top.insertBefore(b,av):top.appendChild(b);
  }
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="k"){e.preventDefault();$("#sh")?(typeof closeSheet==="function"&&closeSheet()):openPalette()}
  });

  /* ---------- connectivity banner ---------- */
  function setOffline(off){
    let b=$("#upl_off");
    if(off){
      if(!b){b=document.createElement("div");b.id="upl_off";b.className="upl-off";b.setAttribute("role","status");b.setAttribute("aria-live","polite");b.textContent="اتصال اینترنت قطع است؛ تغییرات جدید ممکن است ذخیره نشوند.";document.body.appendChild(b)}
    }else if(b){b.remove();try{toast("اتصال برقرار شد")}catch(_){}}
  }
  window.addEventListener("offline",()=>setOffline(true));
  window.addEventListener("online",()=>setOffline(false));
  if(typeof navigator!=="undefined"&&navigator.onLine===false)setOffline(true);

  /* ---------- scroll: to-top button + per-tab memory ---------- */
  const scrollMem={};
  let topBtn=null;
  function ensureTopBtn(){
    if(topBtn&&topBtn.isConnected)return topBtn;
    topBtn=document.createElement("button");topBtn.type="button";topBtn.className="upl-top";topBtn.setAttribute("aria-label","بازگشت به بالا");topBtn.textContent="↑";topBtn.hidden=true;
    topBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:reduced()?"auto":"smooth"}));
    document.body.appendChild(topBtn);return topBtn;
  }
  window.addEventListener("scroll",()=>{const b=ensureTopBtn();b.hidden=(window.scrollY||0)<600;scrollMem[curTab()]=window.scrollY||0},{passive:true});
  document.addEventListener("click",e=>{
    const n=e.target.closest(".nav button");
    if(n&&n.classList.contains("on")&&(window.scrollY||0)>40){window.scrollTo({top:0,behavior:reduced()?"auto":"smooth"})}
  },true);

  /* ---------- haptics ---------- */
  function haptic(ms){
    try{
      if(reduced())return;
      const p=prefs();if(p&&p.haptics===false)return;
      if(navigator.vibrate)navigator.vibrate(ms||8);
    }catch(_){}
  }
  document.addEventListener("click",e=>{if(e.target.closest("button.b,.nav button,.chip,.fab"))haptic(8)},true);

  /* ---------- swipe-down to close sheets ---------- */
  let sw=null;
  document.addEventListener("touchstart",e=>{
    const sh=e.target.closest&&e.target.closest("#sh>div");if(!sh||e.touches.length!==1){sw=null;return}
    if(e.target.closest("input,textarea,select"))return void(sw=null);
    sw={y:e.touches[0].clientY,t:Date.now(),el:sh,last:e.touches[0].clientY};
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    if(!sw)return;const y=e.touches[0].clientY;sw.last=y;const d=y-sw.y;
    if(d>0&&sw.el.scrollTop<=0&&!reduced()){sw.el.style.transform=`translateY(${Math.min(d,240)}px)`;sw.el.style.transition="none"}
  },{passive:true});
  document.addEventListener("touchend",()=>{
    if(!sw)return;const s=sw;sw=null;
    const close=swipeCloses(s.y,s.last,Date.now()-s.t,s.el.scrollTop);
    s.el.style.transition="";s.el.style.transform="";
    if(close){haptic(10);requestCloseSheet()}
  },{passive:true});

  /* ---------- pull to refresh (top-level tabs only) ---------- */
  const PTR_TABS=new Set(["home","orders","products","posts","wordpress"]);
  let ptr=null,ptrEl=null;
  function ptrIndicator(show,ready){
    if(!ptrEl){ptrEl=document.createElement("div");ptrEl.className="upl-ptr";ptrEl.setAttribute("aria-hidden","true");document.body.appendChild(ptrEl)}
    ptrEl.classList.toggle("on",!!show);ptrEl.classList.toggle("ready",!!ready);ptrEl.textContent=ready?"↻ رها کنید":"↓ برای نوسازی بکشید";
  }
  document.addEventListener("touchstart",e=>{
    if($("#sh")||!PTR_TABS.has(curTab())||e.touches.length!==1||(window.scrollY||0)>0||e.target.closest("input,textarea,select,.nav,.sheet")){ptr=null;return}
    ptr={y:e.touches[0].clientY};
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    if(!ptr)return;const d=pullDecision(ptr.y,e.touches[0].clientY,window.scrollY||0);
    if(d==="none")ptrIndicator(false,false);else ptrIndicator(true,d==="refresh");
  },{passive:true});
  document.addEventListener("touchend",e=>{
    if(!ptr)return;const t=e.changedTouches&&e.changedTouches[0];const d=t?pullDecision(ptr.y,t.clientY,window.scrollY||0):"none";
    ptr=null;ptrIndicator(false,false);
    if(d==="refresh"&&typeof window.go==="function"){haptic(12);window.go(curTab())}
  },{passive:true});

  /* ---------- home: today's focus ---------- */
  const loc=()=>(window.SMB_I18N&&window.SMB_I18N.locale)||"fa-IR";
  const nf=n=>Number(n||0).toLocaleString(loc(),{maximumFractionDigits:0});
  const ACTIONS={orders:()=>call("go","orders"),comments:()=>call("comments"),plugins:()=>call("pluginsView"),products:()=>call("section","product")};
  function focusHTML(d){
    const t=d.sales_access?trend(d.days):null,cards=focusCards(d);
    const spark=t?`<svg class="upl-spark" viewBox="0 0 220 56" role="img" aria-label="روند فروش هفت روز اخیر" preserveAspectRatio="none"><path d="${sparkPath(t.values,220,56,5)}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`:"";
    const badge=t&&t.deltaPct!=null?`<span class="upl-trend ${t.dir}" title="فروش امروز نسبت به میانگین روزهای قبل">${t.dir==="up"?"▲":t.dir==="down"?"▼":"■"} ${nf(Math.abs(t.deltaPct))}٪</span>`:"";
    const chips=cards.length?cards.map(c=>`<button type="button" class="upl-chip ${c.tone}" data-act="${E(c.act)}"><i aria-hidden="true">${c.icon}</i><b>${nf(c.n)}</b><span>${E(c.title)}</span></button>`).join(""):`<div class="m upl-ok">✓ فعلاً چیزی نیاز به اقدام ندارد</div>`;
    return`<div class="cd upl-focus" role="region" aria-label="تمرکز امروز"><div class="row"><div class="sp"><div class="t">${greeting(new Date().getHours())} 👋</div><div class="m">تمرکز امروز</div></div>${badge}</div>${spark}<div class="upl-chips">${chips}</div></div>`;
  }
  function injectFocus(){
    const v=$("#v");if(!v||curTab()!=="home"||v.querySelector(".upl-focus"))return;
    const hero=v.querySelector(".hero"),d=window.smbDashCaps;if(!hero||!d)return;
    hero.insertAdjacentHTML("afterend",focusHTML(d));
  }
  document.addEventListener("click",e=>{const b=e.target.closest(".upl-chip");if(b&&ACTIONS[b.dataset.act])ACTIONS[b.dataset.act]()});

  /* ---------- unsaved-changes guard for sheets ---------- */
  const DISCARD="تغییرات ذخیره‌نشده از بین می‌رود؛ بسته شود؟";
  const isDirty=()=>{const sh=$("#sh");return!!(sh&&sh.dataset.dirty)};
  function requestCloseSheet(){
    if(!$("#sh"))return false;
    if(isDirty()&&!confirm(DISCARD))return false;
    if(typeof closeSheet==="function")closeSheet();
    return true;
  }
  const markDirty=e=>{const t=e.target,sh=t&&t.closest&&t.closest("#sh");if(sh&&!(t.matches&&t.matches("[type=search],#upl_q")))sh.dataset.dirty="1"};
  document.addEventListener("input",markDirty,true);
  document.addEventListener("change",markDirty,true);
  document.addEventListener("click",e=>{const sh=$("#sh");if(sh&&e.target===sh&&isDirty()&&!confirm(DISCARD)){e.stopPropagation();e.preventDefault()}},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&isDirty()&&!confirm(DISCARD)){e.stopPropagation();e.preventDefault()}},true);

  /* ---------- Android back button: sheet → page back → home → press twice to exit ---------- */
  let exitArmed=false;
  const rootState=()=>history.state&&history.state.smb==="root";
  function guard(){try{if(!exitArmed&&rootState())history.pushState({smb:"guard"},"")}catch(_){}}
  function onBack(){
    const act=backAction({sheetOpen:!!$("#sh"),hasBack:!!$("#app .top .back"),tab:curTab()});
    if(act==="close-sheet"){if(!requestCloseSheet()){}guard();return}
    if(act==="back-button"){const b=$("#app .top .back");guard();b&&b.click();return}
    if(act==="home"){guard();call("go","home");return}
    if(exitArmed)return; /* second press falls through to the system and exits */
    exitArmed=true;try{toast("برای خروج، دوباره بازگشت را بزنید")}catch(_){}
    setTimeout(()=>{exitArmed=false;guard()},2400);
  }
  function initBack(){
    try{
      if(history.state&&history.state.ed)return;
      history.replaceState({smb:"root"},"");history.pushState({smb:"guard"},"");
      window.addEventListener("popstate",()=>{if(rootState())onBack()});
    }catch(_){}
  }

  /* ---------- comfort & accessibility prefs ---------- */
  function applyComfort(){
    const p=prefs()||{},h=document.documentElement;
    h.classList.toggle("upl-hc",!!p.contrast);
    h.classList.toggle("upl-calm",!!p.calm);
    h.classList.toggle("upl-lefty",p.hand==="left");
  }
  const _save=savePrefs;savePrefs=function(patch){_save(patch);applyComfort()};

  /* ---------- keep focused fields visible above the keyboard ---------- */
  document.addEventListener("focusin",e=>{
    const el=e.target;if(!el||!el.matches||!el.matches("input:not([type=checkbox]):not([type=radio]),textarea,select"))return;
    setTimeout(()=>{try{if(el.isConnected&&document.activeElement===el)el.scrollIntoView({block:"center",behavior:reduced()?"auto":"smooth"})}catch(_){}},280);
  });

  /* ---------- prevent duplicate quick-jump controls ---------- */
  // The top-bar control is the single mobile entry point. Older builds injected a
  // second floating magnifier; that duplicate obscured the dashboard and confused
  // first-time users. Remove stale instances from hot reload / restored WebViews.
  function ensureJumpFab(){document.querySelectorAll(".upl-jump").forEach(b=>b.remove())}

  /* ---------- boot ---------- */
  function boot(){
    const app=$("#app");if(!app)return;
    new MutationObserver(()=>{injectTopButton();injectFocus();ensureJumpFab();guard()}).observe(app,{childList:true,subtree:true});
    injectTopButton();ensureTopBtn();ensureJumpFab();applyComfort();initBack();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
