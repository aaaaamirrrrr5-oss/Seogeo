/* ===== Plus (v3.9): smart SEO, advanced SEO, nightly auto-SEO, notifications, sales chart, share-in ===== */
const PLUS_NOTIFY_KEY="smb_notify_v1";
let PS=null,PR=null,PA=null,PLUS_PREFILL=null,PLUS_PENDING_SHARE=null,PLUS_BADGE={orders:0,comments:0,low:[]},_plusNT=0,_plusBusy=false,_plusFails=0;
const plusEsc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- pure helpers (unit-tested in node) ---------- */
function plusDelta(cur,prev){cur=+cur||0;prev=+prev||0;if(!prev)return null;const p=(cur-prev)/prev*100;return{pct:Math.round(Math.abs(p)),dir:p>=0?"up":"down"}}
function plusChart(series,key,fmt){
  fmt=fmt||(x=>String(Math.round(x)));const n=(series||[]).length;if(!n)return"";
  const W=600,H=170,P=22,max=Math.max(1,...series.map(x=>+x[key]||0)),bw=(W-P*2)/n,gap=Math.min(4,bw*.25);
  const clean=d=>String(d).replace(/[^0-9-]/g,"");
  const label=d=>{try{return new Intl.DateTimeFormat((window.SMB_I18N?.language==="fa"?"fa-IR-u-ca-persian":(window.SMB_I18N?.locale||"en-US")),{month:"short",day:"numeric"}).format(new Date(clean(d)+"T12:00:00"))}catch(e){return clean(d)}};
  const bars=series.map((x,i)=>{const v=+x[key]||0,h=Math.round((H-P*2)*v/max),xx=P+i*bw+gap/2,yy=H-P-h;
    return `<rect x="${xx.toFixed(1)}" y="${yy}" width="${Math.max(1,bw-gap).toFixed(1)}" height="${Math.max(v?2:0,h)}" rx="3" style="fill:var(--a,#0b7a62);opacity:${v?1:.25}"><title>${clean(x.d)}: ${fmt(v)}</title></rect>`}).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="نمودار"><line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" style="stroke:var(--br,#ddd)"/>${bars}<text x="${P}" y="${H-5}" font-size="11" style="fill:var(--mu,#888)">${label(series[0].d)}</text><text x="${W-P}" y="${H-5}" font-size="11" text-anchor="end" style="fill:var(--mu,#888)">${label(series[n-1].d)}</text><text x="${W-P}" y="12" font-size="11" text-anchor="end" style="fill:var(--mu,#888)">${fmt(max)}</text></svg>`}
function plusShareParse(r){
  const subject=String(r?.subject||"").trim(),text=String(r?.text||"").trim();
  const m=text.match(/https?:\/\/[^\s<>"']+/),url=m?m[0]:"";
  let body=url?text.replace(url,"").trim():text,title=subject;
  const lines=body.split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
  if(!title&&lines.length){title=lines.shift().slice(0,120)}
  const html=lines.map(l=>`<p>${plusEsc(l)}</p>`).join("")+(url?`<p><a href="${plusEsc(url)}">${plusEsc(url)}</a></p>`:"");
  return{title,html,url}}
function plusLinkHtml(list,mode){
  const a=l=>`<a href="${plusEsc(l.url)}">${plusEsc(l.title)}</a>`;
  if(!list.length)return"";
  return mode==="end"?`<h3>بیشتر بخوانید</h3><ul>${list.map(l=>`<li>${a(l)}</li>`).join("")}</ul>`:list.map(a).join("، ")}

/* ---------- editor: smart suggestions + advanced SEO ---------- */
function plusEditorInject(){
  if(!document.getElementById("ed")||document.getElementById("plus_sg"))return;
  const html=`<details class="ec" id="plus_s"><summary>🧠 پیشنهادهای هوشمند سئو</summary><div class="cb"><p class="m">کلمهٔ کلیدی، لینک داخلی، برچسب، چگالی، خوانایی و تکراری‌بودن کلمهٔ کلیدی را تحلیل می‌کند. چیزی بدون تأیید شما تغییر نمی‌کند.</p><button class="b p" style="width:100%" onclick="plusSuggest()">دریافت پیشنهادها</button><div id="plus_sg"></div></div></details>
  <details class="ec" id="plus_a" ontoggle="plusAdvOpen(this)"><summary>🔧 سئوی پیشرفته (canonical، robots، OG)</summary><div class="cb" id="plus_adv"><div class="ld">…</div></div></details>`;
  const cards=[...document.querySelectorAll("#ed details.ec")],last=cards[cards.length-1];
  if(last)last.insertAdjacentHTML("beforebegin",html);else(document.querySelector("#ed .in")||document.getElementById("ed")).insertAdjacentHTML("beforeend",html);
  if(PLUS_PREFILL&&!ED.id){const p=PLUS_PREFILL;PLUS_PREFILL=null;const t=document.querySelector(ED.kind==="product"?"#p_name":"#e_title");
    if(t){t.value=p.title||"";t.style.height="auto";t.style.height=t.scrollHeight+"px"}if(p.html)edSetHtml(p.html);ED.dirty=true;edTick();toast("متن اشتراکی در پیش‌نویس جدید قرار گرفت")}}
async function plusSuggest(){
  if(!ED)return;const box=document.getElementById("plus_sg");
  if(ED.dirty||!ED.id){box.innerHTML=`<div class="ld">ذخیرهٔ پیش‌نویس…</div>`;const ok=await edSave(null,true);if(!ok){box.innerHTML="";return}}
  box.innerHTML=`<div class="ld">در حال تحلیل…</div>`;
  try{PS=await api("/seo/suggest?id="+ED.id);plusSuggestDraw()}catch(e){box.innerHTML=`<div class="cd">${plusEsc(e.message)}</div>`}}
function plusSuggestDraw(){
  const r=PS,rd=r.readability,box=document.getElementById("plus_sg"),col=rd.score>=80?"ok":rd.score>=50?"y":"bad";
  box.innerHTML=`<h4 style="margin:14px 0 6px">کلمهٔ کلیدی پیشنهادی</h4><div class="tg">${r.keywords.map((k,i)=>`<button class="chip" onclick="plusKw(${i})">${plusEsc(k.kw)} <small>${fa(k.count)}×${k.in_title?" ✓عنوان":""}</small></button>`).join("")||`<span class="m">متن کافی نیست</span>`}</div>
  ${r.density.length?`<h4 style="margin:14px 0 6px">چگالی کلمهٔ کلیدی</h4>${r.density.map(d=>`<div class="chk ${d.state==="ok"?"ok":"no"}"><i>${d.state==="ok"?"✓":"!"}</i><div><b>${plusEsc(d.kw)}</b> — ${fa(d.count)} بار (${fa(d.pct)}٪) ${d.state==="low"?"· کم است؛ ۰٫۵ تا ۲٫۵٪ مناسب است":d.state==="high"?"· زیاد است؛ تکرار را کم کنید":""}</div></div>`).join("")}`:""}
  ${r.duplicates.length?`<div class="cd" style="border-color:#dc2626"><b>⚠️ این کلمهٔ کلیدی در مطالب دیگر هم هست</b>${r.duplicates.map(x=>`<div class="m">${plusEsc(x.title)}</div>`).join("")}<div class="m">دو مطلب با یک کلمهٔ کلیدی با هم رقابت می‌کنند.</div></div>`:""}
  <h4 style="margin:14px 0 6px">خوانایی <span class="sc2 ${col==="ok"?"g":col==="y"?"y":"r"}">${fa(rd.score)}</span></h4>
  <div class="m">میانگین ${fa(rd.avg_sentence)} کلمه در هر جمله · ${fa(rd.long_sentences)} جملهٔ بلند · ${fa(rd.long_paragraphs)} پاراگراف بلند · ${fa(rd.headings)} زیرعنوان · ${fa(rd.minutes)} دقیقه مطالعه</div>
  <h4 style="margin:14px 0 6px">لینک داخلی پیشنهادی</h4>${r.links.map((l,i)=>`<label class="row" style="padding:6px 0"><input type="checkbox" class="pl_ck" data-i="${i}" style="width:auto"> <div class="sp ell">${plusEsc(l.title)} <small class="m">(${plusEsc(l.type)})</small></div></label>`).join("")||`<span class="m">مطلب مرتبطی پیدا نشد</span>`}
  ${r.links.length?`<div class="dz"><button class="b" onmousedown="saveRange()" onclick="plusLinks('cursor')">درج در مکان نشانگر</button><button class="b" onclick="plusLinks('end')">افزودن «بیشتر بخوانید»</button></div>`:""}
  ${r.tags.length?`<h4 style="margin:14px 0 6px">برچسب پیشنهادی</h4><div class="tg">${r.tags.map((t,i)=>`<button class="chip" onclick="plusTag(${i})">＋ ${plusEsc(t)}</button>`).join("")}</div>`:""}`}
function plusKw(i){const e=document.getElementById("e_sk"),k=PS.keywords[i].kw,a=e.value.split(",").map(x=>x.trim()).filter(Boolean);if(!a.includes(k))a.push(k);e.value=a.join(", ");edDirty();edTick()}
function plusTag(i){edTag(PS.tags[i])}
function plusLinks(mode){
  const sel=[...document.querySelectorAll(".pl_ck:checked")].map(x=>PS.links[+x.dataset.i]);if(!sel.length)return toast("لینکی انتخاب نشده");
  const ro=document.getElementById("e_html")?.readOnly;
  if(ro){const h=plusLinkHtml(sel,"end");try{navigator.clipboard.writeText(h)}catch(e){}return toast("این مطلب بلوکی است؛ کد HTML کپی شد تا در پنل وردپرس درج کنید")}
  const h=plusLinkHtml(sel,mode);
  if(mode==="end"){if(ED.html)document.getElementById("e_html").value+="\n"+h;else document.getElementById("e_body").insertAdjacentHTML("beforeend",h)}else insHtml(h);
  edDirty();toast("لینک‌ها درج شد")}
async function plusAdvOpen(d){
  if(!d.open||d.dataset.loaded)return;const box=document.getElementById("plus_adv");
  if(!ED.id){box.innerHTML=`<p class="m">این بخش پس از اولین ذخیره فعال می‌شود.</p>`;return}
  try{const a=await api("/seo/advanced?id="+ED.id);d.dataset.loaded="1";
   box.innerHTML=`<p class="m">${a.engine?`افزونهٔ سئو: ${plusEsc(a.engine)}`:"افزونهٔ سئو شناسایی نشد؛ مقادیر ذخیره می‌شوند اما اعمال آن‌ها به افزونه بستگی دارد."}</p>
   <label class="l">آدرس canonical</label><input id="pa_c" class="ltr" value="${plusEsc(a.canonical)}" placeholder="https://...">
   ${srow("noindex (حذف از نتایج گوگل)","pa_ni",a.noindex,"","با احتیاط روشن کنید")}${srow("nofollow","pa_nf",a.nofollow,"")}
   <label class="l">عنوان شبکه‌های اجتماعی (OG)</label><input id="pa_t" value="${plusEsc(a.og_title)}"><label class="l">توضیح شبکه‌های اجتماعی</label><textarea id="pa_d" rows="2">${plusEsc(a.og_desc)}</textarea>
   <button class="b p" style="width:100%;margin-top:10px" onclick="plusAdvSave()">ذخیرهٔ سئوی پیشرفته</button>`}catch(e){box.innerHTML=`<div class="cd">${plusEsc(e.message)}</div>`}}
async function plusAdvSave(){
  const g=id=>document.getElementById(id);
  if(g("pa_ni").checked&&!confirm("با noindex این صفحه از نتایج گوگل حذف می‌شود. ادامه می‌دهید؟"))return;
  try{await api("/seo/advanced",{id:ED.id,canonical:g("pa_c").value.trim(),noindex:g("pa_ni").checked,nofollow:g("pa_nf").checked,og_title:g("pa_t").value,og_desc:g("pa_d").value});toast("ذخیره شد ✓")}catch(e){toast(e.message)}}

/* ---------- sales report with chart ---------- */
async function reports(d=30){
  shell("گزارش‌ها",null,"wooHub()");loading();
  try{const [r,s]=await Promise.all([api("/reports?days="+d),api("/reports/series?days="+d).catch(()=>null)]);PR={r,s,k:"sales",d};plusRepDraw()}catch(e){fail(e)}}
function plusRepDraw(){
  const {r,s,k,d}=PR,dl=s?plusDelta(s.total,s.prev_total):null,dlo=s?plusDelta(s.orders,s.prev_orders):null;
  const tag=x=>x?`<span class="st ${x.dir==="up"?"ok":"no"}">${x.dir==="up"?"▲":"▼"} ${fa(x.pct)}٪ نسبت به دورهٔ قبل</span>`:"";
  $("#v").innerHTML=`<div class="chips">${[[7,"۷ روز"],[30,"۳۰ روز"],[90,"۹۰ روز"],[365,"سال"]].map(a=>`<button class="chip ${a[0]===r.days?"on":""}" onclick="reports(${a[0]})">${a[1]}</button>`).join("")}</div>
  <div class="hero"><small>مجموع فروش</small><div class="big">${money(r.total)}</div><small>${fa(r.orders)} سفارش · میانگین ${money(r.avg)}</small><div style="margin-top:8px">${tag(dl)}</div></div>
  ${s?`<div class="cd"><div class="chips"><button class="chip ${k==="sales"?"on":""}" onclick="PR.k='sales';plusRepDraw()">فروش روزانه</button><button class="chip ${k==="orders"?"on":""}" onclick="PR.k='orders';plusRepDraw()">تعداد سفارش</button></div><div style="direction:ltr">${plusChart(s.series,k,k==="sales"?(x=>fa(x)):(x=>fa(x)))}</div>${s.truncated?`<div class="m">به‌دلیل حجم زیاد، فقط ۵۰۰۰ سفارش اخیر شمرده شد.</div>`:""}</div>
  <div class="sbar"><span class="st">${fa(s.new_customers)} مشتری جدید</span>${tag(dlo)}${Object.entries(s.statuses).filter(x=>x[1]>0).map(x=>`<span class="st">${esc(st(x[0]))}: ${fa(x[1])}</span>`).join("")}</div>`:""}
  <h3>پرفروش‌ترین محصولات</h3>${r.top.map((x,i)=>`<div class="cd row"><b style="width:24px">${fa(i+1)}</b><div class="sp t ell">${esc(x.name)}</div><div class="m">${fa(x.qty)} عدد</div><b>${fa(x.total)}</b></div>`).join("")||`<div class="ld">داده‌ای نیست</div>`}
  <h3>به تفکیک روش پرداخت</h3>${Object.entries(r.pay).map(([a,v])=>`<div class="cd row"><div class="sp">${esc(a)}</div><b>${money(v)}</b></div>`).join("")}`}

/* ---------- nightly safe auto-SEO ---------- */
async function autoNight(){tab="hub";shell("خودکارسازی شبانه",null,"hub()");loading();try{PA=await api("/automation");plusAutoDraw()}catch(e){fail(e)}}
function plusAutoDraw(){
  const r=PA,o=r.settings,ty=[["post","مقاله‌ها"],["page","برگه‌ها"],["product","محصولات"]],fd=t=>t?new Date(t*1000).toLocaleString((window.SMB_I18N?.locale||"fa-IR")):"—";
  $("#v").innerHTML=`<div class="cd"><div class="t">تکمیل امن سئو هر شب</div><p class="m">هر شب چند مطلب با امتیاز سئوی پایین را بررسی می‌کند و فقط فیلدهای <b>خالی</b> را پر می‌کند: کلمهٔ کلیدی، توضیح متا، خلاصه و تصویر شاخص از اولین عکس متن. متن اصلی و فیلدهای پرشده هرگز تغییر نمی‌کنند و هر کار در گزارش زیر قابل بازگردانی است.</p>
   ${srow("فعال","au_en",o.enabled,"")}<label class="l">حداکثر مطلب در هر شب</label><select id="au_li">${[5,10,20,30,50].map(n=>`<option ${n===+o.limit?"selected":""}>${n}</option>`).join("")}</select>
   <label class="l">فقط مطالب با امتیاز زیر</label><select id="au_th">${[60,70,80,90].map(n=>`<option ${n===+o.threshold?"selected":""}>${n}</option>`).join("")}</select>
   <label class="l">نوع محتوا</label>${ty.map(t=>`<label class="row" style="padding:5px 0"><input type="checkbox" class="au_ty" value="${t[0]}" style="width:auto" ${o.types.includes(t[0])?"checked":""}> ${t[1]}</label>`).join("")}
   <div class="m" style="margin:8px 0">اجرای بعدی: ${fd(r.next)}</div><div class="dz"><button class="b p" onclick="plusAutoSave()">ذخیره</button><button class="b" onclick="plusAutoRun()">اجرای همین حالا (۱۰ مطلب)</button></div></div>
  <h3>گزارش تغییرات</h3>${r.log.map(e=>`<div class="cd row"><div class="sp"><div class="t ell">${esc(e.title)}</div><div class="m">${e.labels.map(esc).join("، ")} · ${fd(e.time)}</div></div>${e.undone?`<span class="st">بازگردانی شد</span>`:`<button class="b" onclick="plusAutoUndo('${plusEsc(e.id)}')">بازگردانی</button>`}</div>`).join("")||`<div class="ld">هنوز تغییری ثبت نشده</div>`}
  ${r.log.length?`<button class="b d" style="width:100%" onclick="plusAutoClear()">پاک‌کردن گزارش</button>`:""}`}
async function plusAutoPost(b,msg){try{const r=await api("/automation",b);PA=r;plusAutoDraw();if(msg)toast(typeof msg==="function"?msg(r):msg)}catch(e){toast(e.message)}}
function plusAutoSave(){plusAutoPost({action:"save",enabled:document.getElementById("au_en").checked,limit:+document.getElementById("au_li").value,threshold:+document.getElementById("au_th").value,types:[...document.querySelectorAll(".au_ty:checked")].map(x=>x.value)},"ذخیره شد ✓")}
function plusAutoRun(){toast("در حال اجرا…");plusAutoPost({action:"run"},r=>`${fa((r.ran||[]).length)} مطلب تکمیل شد`)}
function plusAutoUndo(id){plusAutoPost({action:"undo",log:id},r=>r.undone?"بازگردانی شد ✓":"بازگردانی ممکن نبود")}
function plusAutoClear(){if(confirm("گزارش پاک شود؟ (بازگردانی‌ها از بین می‌روند)"))plusAutoPost({action:"clear"},"پاک شد")}

/* ---------- notifications (foreground polling + optional local notifications) ---------- */
const notifyOn=()=>localStorage.getItem(PLUS_NOTIFY_KEY)==="1";
function plusLocal(title,body){const L=window.Capacitor?.Plugins?.LocalNotifications;try{if(L)L.schedule({notifications:[{id:Date.now()%2147483000,title,body}]})}catch(e){}if(navigator.vibrate)navigator.vibrate(30)}
function notifyStart(){clearInterval(_plusNT);_plusFails=0;if(!notifyOn()||typeof S==="undefined"||!S)return;_plusNT=setInterval(notifyPoll,60000);notifyPoll()}
async function notifyPoll(force){
  if(_plusBusy||(document.hidden&&!force)||typeof S==="undefined"||!S||!notifyOn())return;_plusBusy=true;
  try{const key="smb_notify_since:"+S.url,since=+localStorage.getItem(key)||0,r=await api("/notify?since="+since);localStorage.setItem(key,String(r.now));_plusFails=0;
   PLUS_BADGE={orders:r.pending_orders||0,comments:r.comments||0,low:r.low_stock||[]};plusPaintBadge();
   if(since){(r.orders||[]).slice(0,3).forEach(o=>{const m=`سفارش جدید #${fa(o.id)} — ${money(o.total)}${o.name?" — "+o.name:""}`;toast("🧾 "+m);plusLocal("سفارش جدید",m)});
    if((r.orders||[]).length>3)toast(`🧾 ${fa(r.orders.length)} سفارش جدید`);
    (r.new_comments||[]).slice(0,2).forEach(c=>{toast("💬 دیدگاه جدید از "+c.author);plusLocal("دیدگاه جدید",`${c.author} — ${c.post}`)})}}
  catch(e){if(++_plusFails>=3){clearInterval(_plusNT);toast("اعلان‌ها متوقف شد؛ سطح کلید یا اتصال را بررسی کنید")}}
  finally{_plusBusy=false}}
function plusPaintBadge(){
  const nav=document.querySelector(".nav");if(!nav)return;nav.querySelectorAll(".nb").forEach(x=>x.remove());
  const add=(go,n)=>{if(!n)return;const b=[...nav.querySelectorAll("button")].find(x=>(x.getAttribute("onclick")||"").includes(`'${go}'`));if(b)b.insertAdjacentHTML("beforeend",`<b class="nb">${fa(n)}</b>`)};
  add("orders",PLUS_BADGE.orders);add("posts",PLUS_BADGE.comments);add("products",PLUS_BADGE.low.length)}
function plusHomeAlerts(){
  const v=document.getElementById("v");if(!v||document.getElementById("plus_al"))return;const b=PLUS_BADGE,rows=[];
  if(b.low.length)rows.push(`<div class="chk no" onclick="prodEditor(${b.low[0].id})"><i>📦</i><div><b>${fa(b.low.length)} محصول کم‌موجود یا ناموجود</b><div class="m">${b.low.slice(0,3).map(x=>esc(x.name)+" ("+fa(x.stock)+")").join("، ")}</div></div></div>`);
  if(b.comments)rows.push(`<div class="chk no" onclick="comments()"><i>💬</i><div><b>${fa(b.comments)} دیدگاه در انتظار تأیید</b></div></div>`);
  if(rows.length)v.insertAdjacentHTML("afterbegin",`<div class="cd" id="plus_al">${rows.join("")}</div>`)}
async function notifySettings(){
  tab="hub";shell("اعلان‌ها",null,"hub()");const on=notifyOn();
  $("#v").innerHTML=`<div class="cd"><div class="t">اعلان سفارش، دیدگاه و موجودی کم</div><p class="m">اپ هر دقیقه (فقط وقتی باز است) سفارش‌ها و دیدگاه‌های جدید را بررسی می‌کند و پیام می‌دهد. اعلان پس‌زمینه‌ی واقعی با بسته بودن اپ به سرویس push نیاز دارد که در این نسخه نیست. این قابلیت کلید سطح «مدیر» می‌خواهد.</p>${srow("فعال","nt_on",on,"")}<div class="dz"><button class="b p" onclick="notifySave()">ذخیره</button><button class="b" onclick="notifyTest()">آزمایش</button></div></div><div id="nt_b"></div>`;
  if(on){await notifyPoll(true);plusNotifyBody()}}
function plusNotifyBody(){const b=PLUS_BADGE,e=document.getElementById("nt_b");if(!e)return;
  e.innerHTML=`<div class="sbar"><span class="st">${fa(b.orders)} سفارش در حال پردازش</span><span class="st">${fa(b.comments)} دیدگاه در انتظار</span></div>${b.low.map(x=>`<div class="cd row" onclick="prodEditor(${x.id})"><div class="sp t ell">${esc(x.name)}</div><span class="${x.stock<=0?"pill r":"pill y"}">${fa(x.stock)} عدد</span></div>`).join("")||`<div class="ld">موجودی همه‌چیز مناسب است</div>`}`}
async function notifySave(){
  const on=document.getElementById("nt_on").checked;localStorage.setItem(PLUS_NOTIFY_KEY,on?"1":"0");
  if(on){try{await window.Capacitor?.Plugins?.LocalNotifications?.requestPermissions()}catch(e){}localStorage.removeItem("smb_notify_since:"+S.url);notifyStart();toast("اعلان‌ها فعال شد")}else{clearInterval(_plusNT);toast("اعلان‌ها خاموش شد")}}
function notifyTest(){toast("🔔 آزمایش اعلان");plusLocal("مدیریت سایت","این یک اعلان آزمایشی است")}

/* ---------- share-in (Android "Share → Site Manager") ---------- */
async function plusShareCheck(){
  const A=window.Capacitor?.Plugins?.Admin;if(!A||!A.getShared)return;
  try{const r=await A.getShared();if(r&&(r.text||r.subject)){PLUS_PENDING_SHARE=r;plusShareFlush()}}catch(e){}}
function plusShareFlush(){
  if(!PLUS_PENDING_SHARE||typeof S==="undefined"||!S||typeof info==="undefined"||!info)return;const r=PLUS_PENDING_SHARE;PLUS_PENDING_SHARE=null;
  const p=plusShareParse(r);
  sheet(`<div class="row"><div class="sp t" style="font-size:18px">ساخت پیش‌نویس از متن اشتراکی</div>${X()}</div><div class="cd"><b>${plusEsc(p.title||"(بدون عنوان)")}</b><div class="m ell">${plusEsc(p.url||"")}</div></div><div class="dz"><button class="b p" onclick="plusShareMake('post')">مقالهٔ جدید</button><button class="b" onclick="plusShareMake('page')">برگهٔ جدید</button></div>`);
  window.PLUS_LAST_SHARE=p}
function plusShareMake(type){closeSheet();PLUS_PREFILL=window.PLUS_LAST_SHARE;postEditor(0,type)}

/* ---------- wiring (browser only) ---------- */
if(typeof window!=="undefined"&&typeof edDraw==="function"){
  const _d=edDraw;edDraw=function(){_d.apply(this,arguments);try{plusEditorInject()}catch(e){console.warn(e)}};
  const _s=shell;shell=function(){_s.apply(this,arguments);try{plusPaintBadge()}catch(e){}};
  const _h=home;home=async function(){await _h.apply(this,arguments);try{plusHomeAlerts()}catch(e){}};
  const _hub=hub;hub=function(){_hub.apply(this,arguments);try{document.getElementById("v").insertAdjacentHTML("beforeend",`<h3>خودکارسازی و اعلان‌ها</h3><div class="hub">${T("🌙","خودکار شبانه سئو","autoNight()","#0e7490","#22d3ee")}${T("🔔","اعلان‌ها","notifySettings()","#f59e0b","#fbbf24")}</div>`)}catch(e){}};
  const _g=go;go=function(t){_g(t);if(!_plusNT&&notifyOn())notifyStart();plusShareFlush()};
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){notifyPoll();plusShareCheck()}});
  document.addEventListener("resume",()=>{plusShareCheck();notifyPoll()});
  setTimeout(()=>{plusShareCheck();if(notifyOn())notifyStart()},2500);
}
if(typeof module!=="undefined"&&module.exports)module.exports={plusDelta,plusChart,plusShareParse,plusLinkHtml};
