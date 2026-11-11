/* ===== Pro editor, lists & automation (posts / pages / products) ===== */
const PST={publish:"منتشر شده",draft:"پیش‌نویس",pending:"در انتظار بازبینی",private:"خصوصی",future:"زمان‌بندی‌شده",trash:"زباله‌دان","auto-draft":"پیش‌نویس"};
const sb=n=>`<span class="sc2 ${n>=80?"g":n>=50?"y":"r"}">${fa(n)}</span>`;
const sp=s=>`<span class="${pc(s)}">${esc(PST[s]||st(s))}</span>`;
let L=null,ED=null,PK=null,_edT=0;
const openUrl=u=>{const A=window.Capacitor?.Plugins?.Admin;A?A.open({base:S.url,start:u}):window.open(u)};

/* ---------- compress images before upload (auto) ---------- */
function shrink(file){return new Promise(res=>{
  const raw=()=>{const r=new FileReader;r.onload=()=>res({name:file.name,b64:r.result.split(",")[1]});r.readAsDataURL(file)};
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<350000)return raw();
  const im=new Image,u=URL.createObjectURL(file);
  im.onload=()=>{const m=1800,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    const d=c.toDataURL("image/jpeg",.85);res({name:file.name.replace(/\.[^.]+$/,"")+".jpg",b64:d.split(",")[1]})};
  im.onerror=raw;im.src=u})}
async function upload(files){
  for(const f of files){toast("در حال آپلود "+f.name);try{const s=await shrink(f);await api("/media",{name:s.name,data:s.b64})}catch(e){toast(e.message)}}
  toast("آپلود شد");lpReload()}

/* ================= LISTS ================= */
function postList(type="post"){
  L={kind:"post",type,page:1,q:"",f:"",ob:"date",sel:new Set,selecting:false,items:[],counts:{}};
  if(type==="post")tab="posts";lShell()}
function prodList(){L={kind:"product",type:"product",page:1,q:"",f:"",ob:"date",sel:new Set,selecting:false,items:[],counts:{}};if(info.wc)tab="products";lShell()}
function lShell(){
  const P=L.kind==="product",lab=P?"محصولات":L.type==="post"?"مقاله‌ها":L.type==="page"?"برگه‌ها":(types.find(t=>t.name===L.type)||{}).label||L.type;
  shell(lab,`<input id="lq" placeholder="جستجو در ${lab}…" onchange="L.q=this.value;L.page=1;lLoad()">
  <div class="sbar" id="lc"></div><div class="chips" id="lf"></div>
  <div class="row" style="margin:0 0 8px;gap:8px"><select id="lo" style="width:auto;margin:0" class="sp" onchange="L.ob=this.value;L.page=1;lLoad()"><option value="date">جدیدترین</option><option value="modified">آخرین ویرایش</option><option value="title">الفبایی</option></select>
  <button class="b" onclick="lSel()">☑ انتخاب</button><button class="b" onclick="autoCenter()">✨ خودکار</button></div>
  <div id="ll"></div><div id="lm" style="text-align:center"></div><div id="lbulk"></div>
  <button class="fab" onclick="${P?"prodEditor(0)":`postEditor(0,'${L.type}')`}">＋</button>`,L.type==="post"||P?null:"hub()");
  lLoad()}
async function lLoad(){
  const first=L.page===1,P=L.kind==="product";if(first)$("#ll").innerHTML=`<div class="ld">…</div>`;
  let u;if(P){const f=L.f;u=`/products?page=${L.page}&q=${encodeURIComponent(L.q)}&orderby=${L.ob}`+(["publish","draft","trash","pending","private"].includes(f)?`&status=${f}`:"")+(f==="outofstock"?"&stock=outofstock":"")+(f==="sale"?"&sale=1":"")}
  else u=`/posts?type=${L.type}&page=${L.page}&status=${L.f}&q=${encodeURIComponent(L.q)}&orderby=${L.ob}`;
  try{const r=await api(u);if(first)L.items=[];L.items.push(...r.items);L.counts=r.counts||L.counts;L.pages=r.pages;lDraw()}catch(e){$("#ll").innerHTML=`<div class="cd">${esc(e.message)}</div>`}}
function lDraw(){
  if(!$("#ll"))return;const P=L.kind==="product",c=L.counts||{};
  const F=P?[["همه",""],["منتشر شده","publish"],["پیش‌نویس","draft"],["ناموجود","outofstock"],["حراج","sale"],["زباله‌دان","trash"]]:[["همه",""],["منتشر شده","publish"],["پیش‌نویس","draft"],["زمان‌بندی","future"],["در انتظار","pending"],["زباله‌دان","trash"]];
  const n=k=>k===""?"":c[k]!=null?` ${fa(c[k])}`:"";
  $("#lf").innerHTML=F.map(f=>`<button class="chip ${f[1]===L.f?"on":""}" onclick="L.f='${f[1]}';L.page=1;L.sel.clear();lLoad()">${f[0]}${n(f[1])}</button>`).join("");
  const avg=L.items.length?Math.round(L.items.reduce((a,x)=>a+(x.score||0),0)/L.items.length):0;
  $("#lc").innerHTML=L.items.length?`<span class="st ${avg>=80?"ok":"no"}">میانگین سئو ${fa(avg)}</span><span class="st">${fa(L.items.filter(x=>x.score<80).length)} نیازمند بهبود</span>`:"";
  $("#ll").innerHTML=L.items.map((x,i)=>{
    const ck=L.selecting?`<div class="ck ${L.sel.has(x.id)?"on":""}">${L.sel.has(x.id)?"✓":""}</div>`:"";
    const meta=P?`${x.on_sale?`<span class="old">${money(x.regular)}</span>${money(x.sale)}`:x.price?money(x.price):"—"}${x.sku?" · "+esc(x.sku):""}`:`${esc(x.date)} · ${fa(x.words)} کلمه${x.sticky?" · 📌":""}`;
    const tag=P?`<span class="${pc(x.stock_status)}">${x.stock!==null?fa(x.stock)+" عدد":esc(st(x.stock_status))}</span>`:sp(x.status);
    return `<div class="cd row" onclick="lTap(${i})" ontouchstart="lPress(${i})" ontouchend="lRel()" ontouchmove="lRel()">${ck}<div class="img" style="background-image:url('${esc(x.img)}')"></div><div class="sp"><div class="t ell">${esc(P?x.name:x.title)}</div><div class="m">${meta}</div></div>
    <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">${tag}<span>${P&&x.status!=="publish"?sp(x.status)+" ":""}${sb(x.score||0)}</span></div>
    <button class="b" style="padding:6px 10px" onclick="event.stopPropagation();lMenu(${i})">⋯</button></div>`}).join("")||`<div class="ld">موردی نیست</div>`;
  $("#lm").innerHTML=L.pages>L.page?`<button class="b" onclick="L.page++;lLoad()">بیشتر…</button>`:"";
  lBar()}
let _lp=0;function lPress(i){clearTimeout(_lp);_lp=setTimeout(()=>{L.selecting=true;L.sel.add(L.items[i].id);L._skip=1;if(navigator.vibrate)navigator.vibrate(20);lDraw()},480)}
function lRel(){clearTimeout(_lp)}
function lTap(i){if(L._skip){L._skip=0;return}const x=L.items[i];if(L.selecting){L.sel.has(x.id)?L.sel.delete(x.id):L.sel.add(x.id);return lDraw()}L.kind==="product"?prodEditor(x.id):postEditor(x.id,L.type)}
function lSel(){L.selecting=!L.selecting;if(!L.selecting)L.sel.clear();lDraw()}
function lBar(){
  const b=$("#lbulk");if(!b)return;if(!L.selecting){b.innerHTML="";return}
  const P=L.kind==="product",n=L.sel.size,T=L.f==="trash";
  b.innerHTML=`<div class="bbar"><span>${fa(n)} انتخاب</span><button onclick="lAll()">همه</button>${T?`<button onclick="lBulk('restore')">بازگردانی</button><button onclick="lBulk('delete')">حذف دائمی</button>`:
  `<button onclick="lBulk('publish')">انتشار</button><button onclick="lBulk('draft')">پیش‌نویس</button>${P?`<button onclick="lBulk('outofstock')">ناموجود</button><button onclick="lBulk('instock')">موجود</button><button onclick="lPct()">٪ قیمت</button>`:""}<button onclick="lBulk('autofix')">✨ خودکار</button><button onclick="lBulk('trash')">🗑</button>`}<button onclick="lSel()">✕</button></div>`}
function lAll(){L.items.forEach(x=>L.sel.add(x.id));lDraw()}
async function lBulk(act,val){
  const ids=[...L.sel];if(!ids.length)return toast("چیزی انتخاب نشده");
  if(act==="delete"&&!confirm("این موارد برای همیشه حذف شوند؟ این عملیات قابل بازگشت نیست."))return;
  if(act==="trash"&&!confirm("موارد انتخاب‌شده به زباله‌دان منتقل شوند؟"))return;
  toast("در حال انجام…");try{const r=await api("/bulk",{ids,action:act,value:val,confirm:act==="delete"});
    if(act==="autofix"&&Array.isArray(r.changes)&&r.changes.length){const lines=r.changes.flatMap(x=>(x.changes||[]).map(c=>`شناسه ${fa(x.id)}: ${c}`));sheet(`<div class="row"><b class="sp">گزارش بهینه‌سازی</b>${X()}</div><div class="cd"><b>${fa(r.done)} مورد تغییر کرد</b>${lines.map(x=>`<p class="m">${esc(x)}</p>`).join("")||"تغییری ثبت نشد."}</div>`)}
    else toast(`${fa(r.done)} مورد انجام شد`);
    L.sel.clear();L.selecting=false;L.page=1;lLoad()}catch(e){toast(e.message)}}
let BPSEL=null;
function lPct(){if(L.kind!=="product")return toast("تغییر قیمت فقط برای محصولات است");const ids=[...L.sel];if(!ids.length)return toast("ابتدا محصولات را انتخاب کنید");
  sheet(`<div class="row"><div class="sp t" style="font-size:18px">پیش‌نمایش تغییر درصدی قیمت</div>${X()}</div><p class="m">برای ${fa(ids.length)} محصول انتخابی. تا تأیید نهایی هیچ قیمتی تغییر نمی‌کند.</p><input id="pct" type="number" min="-90" max="90" step=".1" class="ltr" placeholder="مثلاً ۱۰ یا -۵"><button class="b p" style="width:100%" onclick="lPctPreview()">تهیه پیش‌نمایش</button><div id="pct_result"></div>`);BPSEL=ids}
async function lPctPreview(){const pct=Number($("#pct").value);if(!pct||Math.abs(pct)>90)return toast("درصد باید بین ۹۰- تا ۹۰ و غیرصفر باشد");try{const r=await api("/bulk/price",{action:"preview",percent:pct,ids:BPSEL});if(!r.token)return toast(r.message||"محصولی پیدا نشد");BP=r;$("#pct_result").innerHTML=`<div class="cd"><b>${fa(r.count)} محصول · ${fa(r.percent)}٪</b>${(r.items||[]).map(x=>`<div class="fld"><b>${esc(x.name)}</b><div class="row"><span class="sp m">${money(x.old_regular)}</span><b>${money(x.new_regular)}</b></div></div>`).join("")}<button class="b p" style="width:100%" onclick="lPctApply()">تأیید و اعمال</button></div>`}catch(e){toast(e.message)}}
async function lPctApply(){if(!BP?.token||!confirm(`تغییر قیمت ${fa(BP.count)} محصول اعمال شود؟`))return;try{const r=await api("/bulk/price",{action:"apply",token:BP.token,confirm:true});BP=null;closeSheet();toast(`${fa(r.done)} قیمت تغییر کرد؛ گزارش در تاریخچه ثبت شد.`);L.sel.clear();L.selecting=false;L.page=1;lLoad()}catch(e){toast(e.message)}}
function lMenu(i){const x=L.items[i],P=L.kind==="product",id=x.id,T=x.status==="trash";
  sheet(`<div class="row"><div class="sp t ell" style="font-size:16px">${esc(P?x.name:x.title)}</div>${X()}</div>
  <div class="cd row" onclick="closeSheet();${P?`prodEditor(${id})`:`postEditor(${id},'${L.type}')`}">✏️ ویرایش</div>
  <div class="cd row" onclick="closeSheet();openUrl('${esc(x.link||S.url+"/?p="+id)}')">👁 مشاهده در سایت</div>
  ${P?`<div class="cd row" onclick="closeSheet();prodQuick(${i})">⚡ ویرایش سریع قیمت و موجودی</div>`:""}
  <div class="cd row" onclick="lOne(${id},'autofix')">✨ بهینه‌سازی خودکار سئو</div>
  <div class="cd row" onclick="lOne(${id},'duplicate')">⧉ کپی</div>
  ${T?`<div class="cd row" onclick="lOne(${id},'restore')">↩️ بازگردانی</div><div class="cd row d" onclick="if(confirm('حذف دائمی؟'))lOne(${id},'delete')">حذف دائمی</div>`:`<div class="cd row d" onclick="lOne(${id},'trash')">🗑 انتقال به زباله‌دان</div>`}`)}
async function lOne(id,act){if(act==="delete"&&!confirm("حذف دائمی و غیرقابل بازگشت انجام شود؟"))return;if(act==="autofix"&&!confirm("فقط فیلدهای خالی این مورد بهینه شوند؟"))return;closeSheet();toast("در حال انجام…");try{const r=await api((L.kind==="product"?"/products/":"/posts/")+id,{action:act,confirm:act==="delete"});
  const changes=Array.isArray(r.changes)?r.changes:[];if(act==="autofix"&&changes.length)sheet(`<div class="row"><b class="sp">گزارش تغییرات</b>${X()}</div><div class="cd">${changes.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`);else toast(act==="autofix"?"چیزی برای بهبود نبود ✓":"انجام شد");L.page=1;lLoad()}catch(e){toast(e.message)}}
function prodQuick(i){const x=L.items[i],m=x.stock!==null,simple=["simple","external"].includes(x.type);
  sheet(`<div class="row"><div class="sp t ell" style="font-size:16px">${esc(x.name)}</div>${X()}</div>
  ${simple?`<div class="two"><div><label class="l">قیمت</label><input id="q1" type="number" class="ltr" value="${esc(x.regular)}"></div><div><label class="l">قیمت حراج</label><input id="q2" type="number" class="ltr" value="${esc(x.sale)}"></div></div>`:`<p class="m">محصول متغیر: قیمت از ویرایشگر کامل.</p>`}
  ${m?`<label class="l">موجودی</label><input id="q3" type="number" class="ltr" value="${x.stock}">`:`<label class="l">وضعیت موجودی</label><select id="q4"><option value="instock" ${x.stock_status==="instock"?"selected":""}>موجود</option><option value="outofstock" ${x.stock_status==="outofstock"?"selected":""}>ناموجود</option><option value="onbackorder" ${x.stock_status==="onbackorder"?"selected":""}>پیش‌سفارش</option></select>`}
  <button class="b p" style="width:100%;margin-top:12px" onclick="prodQuickSave(${x.id},${m},${simple})">ذخیره</button>`)}
async function prodQuickSave(id,m,simple){const b={};if(simple){b.regular=$("#q1").value;b.sale=$("#q2").value}if(m)b.stock=$("#q3").value;else b.stock_status=$("#q4").value;
  try{await api("/products/"+id,b);closeSheet();toast("ذخیره شد");L.page=1;lLoad()}catch(e){toast(e.message)}}
function autoCenter(){const P=L.kind==="product";
  sheet(`<div class="row"><div class="sp t" style="font-size:18px">✨ خودکارسازی</div>${X()}</div>
  <div class="cd"><div class="t">بهینه‌سازی سئوی همه</div><p class="m">همهٔ ${P?"محصولات":"مطالب"} با امتیاز زیر ۸۰ را بررسی می‌کند و خودکار می‌سازد: کلمهٔ کلیدی، توضیح متا، ${P?"توضیح کوتاه":"خلاصه"}، تصویر شاخص از اولین عکس متن و alt تصاویر. چیزی که پر شده باشد دست نمی‌خورد.</p><button class="b p" style="width:100%" onclick="autoAll()">شروع بهینه‌سازی</button></div>
  <div class="cd"><div class="t">انتخاب گروهی</div><p class="m">انگشت را روی یک مورد نگه دارید (یا «انتخاب» را بزنید) تا انتشار، پیش‌نویس، حذف${P?"، موجودی و تغییر درصدی قیمت":""} گروهی فعال شود.</p><button class="b" style="width:100%" onclick="closeSheet();lSel()">فعال‌سازی انتخاب</button></div>
  <div class="cd"><div class="t">خودکارهای هنگام ویرایش</div><p class="m">ذخیرهٔ خودکار پیش‌نویس، فشرده‌سازی عکس‌ها قبل از آپلود، تحلیل زندهٔ سئو و ساخت خودکار خلاصه و متا داخل ویرایشگر.</p></div>`)}
async function autoAll(){
  closeSheet();const P=L.kind==="product";let ids=[],pg=1,pages=1;toast("در حال بررسی…");
  try{do{const r=await api(P?`/products?page=${pg}`:`/posts?type=${L.type}&page=${pg}`);(r.items||[]).filter(x=>Number(x.score)<80).forEach(x=>ids.push(x.id));pages=Number(r.pages)||1;pg++}while(pg<=pages&&pg<=30);
   if(!ids.length)return toast("همه چیز بهینه است ✓");
   if(!confirm(`برای ${fa(ids.length)} مورد امتیاز پایین‌تر از ۸۰، اصلاحات فقط در فیلدهای خالی انجام شود؟ پیش از اعمال، هر تغییر ثبت و گزارش می‌شود.`))return;
   let n=0;const report=[];
   for(let i=0;i<ids.length;i+=15){toast(`بهینه‌سازی ${fa(Math.min(i+15,ids.length))} از ${fa(ids.length)}…`);const r=await api("/bulk",{ids:ids.slice(i,i+15),action:"autofix",confirm:true});n+=r.done||0;(r.changes||[]).forEach(x=>(x.changes||[]).forEach(c=>report.push(`شناسه ${fa(x.id)}: ${c}`)))}
   sheet(`<div class="row"><b class="sp">گزارش بهینه‌سازی خودکار</b>${X()}</div><div class="cd"><b>${fa(n)} مورد بهینه شد</b>${report.map(x=>`<p class="m">${esc(x)}</p>`).join("")||"تغییری لازم نبود."}</div>`);L.page=1;lLoad()}catch(e){toast(e.message)}}

/* ================= MEDIA PICKER ================= */
function pickMedia(cb,multi){
  PK={cb,page:1,q:"",items:[],multi};
  sheet(`<div class="row"><div class="sp t" style="font-size:18px">انتخاب تصویر</div>${X()}</div>
  <label class="b" style="display:block;text-align:center;margin:8px 0">⬆️ آپلود از گوشی (فشرده‌سازی خودکار)<input type="file" accept="image/*" ${multi?"multiple":""} style="display:none" onchange="pkUp(this.files)"></label>
  <input placeholder="جستجو…" onchange="PK.q=this.value;PK.page=1;PK.items=[];pkLoad()"><div class="gal" id="pkg" style="margin-top:8px"></div><div id="pkm" style="text-align:center;margin-top:10px"></div>`);pkLoad()}
async function pkLoad(){try{const r=await api(`/media?mime=image&page=${PK.page}&q=${encodeURIComponent(PK.q)}`);PK.items.push(...r.items);
  $("#pkg").innerHTML=PK.items.map((m,i)=>`<div style="background-image:url('${esc(m.thumb||m.url)}')" onclick="pkPick(${i})"></div>`).join("")||`<div class="ld" style="grid-column:1/-1">تصویری نیست</div>`;
  $("#pkm").innerHTML=r.pages>PK.page?`<button class="b" onclick="PK.page++;pkLoad()">بیشتر…</button>`:""}catch(e){toast(e.message)}}
function pkPick(i){const cb=PK.cb,m=PK.items[i];closeSheet();cb(m)}
async function pkUp(files){const cb=PK.cb;toast("در حال آپلود…");const got=[];
  for(const f of files){try{const s=await shrink(f);const r=await api("/media",{name:s.name,data:s.b64});if(r.new)got.push(r.new)}catch(e){toast(e.message)}}
  closeSheet();got.forEach(m=>cb(m));if(got.length)toast("آپلود شد")}

/* ================= EDITOR ================= */
const edKey=()=>`ed:${S.url}:${ED.kind}:${ED.id||"new"+ED.type}`;
const edSecureDraftAlias=()=>("draft_"+btoa(unescape(encodeURIComponent(edKey()))).replace(/[+/=]/g,"_").slice(0,100));
async function edReadDraft(k){
  if(typeof isNative==="function"&&isNative()){try{const r=await nativeAdmin().getSecret({alias:edSecureDraftAlias()});return r?.exists?r.value:null}catch(e){return null}}
  return localStorage.getItem(k);
}
async function edWriteDraft(k,value){
  if(typeof isNative==="function"&&isNative())return nativeAdmin().saveSecret({alias:edSecureDraftAlias(),value});
  localStorage.setItem(k,value);
}
async function edDeleteDraft(k){
  if(typeof isNative==="function"&&isNative()){try{return await nativeAdmin().deleteSecret({alias:edSecureDraftAlias()})}catch(e){return}}
  localStorage.removeItem(k);
}
const $v=id=>$("#"+id)?.value??"";
function postEditor(id,type){edOpen("post",id,type||"post")}
function prodEditor(id){edOpen("product",id,"product")}
async function edOpen(kind,id,type){
  let d;try{d=await api(kind==="post"?`/posts/${id||0}?type=${type}`:`/products/${id||0}`)}catch(e){return toast(e.message)}
  const raw=(kind==="post"?d.content:d.desc)||"";
  ED={kind,type,id:id||0,d,cats:[...(d.cats||[])],gal:[...(d.gallery||[])],thumb:{id:d.thumb_id||0,url:d.thumb||""},dirty:false,html:false,blocks:/<!--[\s]*wp:/.test(raw),init:raw};
  edDraw();history.pushState({ed:1},"");
  document.execCommand("defaultParagraphSeparator",false,"p");
  const k=edKey(),sv=await edReadDraft(k);
  if(sv){try{const o=JSON.parse(sv);if(o.t!==undefined&&(o.h!==ED.init||o.t!==(kind==="post"?d.title:d.name))&&confirm("پیش‌نویسِ ذخیره‌نشده‌ای از این مطلب پیدا شد. بازیابی شود؟")){$(kind==="post"?"#e_title":"#p_name").value=o.t;edSetHtml(o.h);ED.dirty=true;edTick()}else await edDeleteDraft(k)}catch(e){}}
  ED.auto=setInterval(edAutoSave,40000);edTick()}
addEventListener("online",()=>{if(ED?.dirty)edAutoSave()});
addEventListener("popstate",()=>{if(!ED)return;if(ED.dirty&&!confirm("تغییرات ذخیره‌نشده از بین می‌رود؛ خروج؟")){history.pushState({ed:1},"");return}edClose(true)});
function edClose(pop){if(!ED)return;clearInterval(ED.auto);$("#ed")?.remove();ED=null;if(!pop&&history.state?.ed)history.back();lpReload2()}
function lpReload2(){if(L&&$("#ll")){L.page=1;lLoad()}}
function edExit(){if(ED.dirty&&!confirm("تغییرات ذخیره‌نشده از بین می‌رود؛ خروج؟"))return;ED.dirty=false;edClose()}

const sw=(id,on,fn)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?"checked":""} ${fn?`onchange="${fn}"`:""}><s></s></label>`;
const srow=(t,id,on,fn,sub)=>`<div class="row" style="padding:7px 0"><div class="sp"><div class="t" style="font-size:14px">${t}</div>${sub?`<div class="m">${sub}</div>`:""}</div>${sw(id,on,fn)}</div>`;
function edToolbar(){const B=(t,c,v,l)=>`<button onmousedown="event.preventDefault()" onclick="fmt('${c}'${v?`,'${v}'`:""})" title="${l||""}">${t}</button>`;
  return `<div class="etb">${B("↶","undo")}${B("↷","redo")}<i></i>${B("<b>B</b>","bold")}${B("<i style='font-style:italic'>I</i>","italic")}${B("<u>U</u>","underline")}${B("<s>S</s>","strikeThrough")}<i></i>${B("H2","formatBlock","h2")}${B("H3","formatBlock","h3")}${B("¶","formatBlock","p")}${B("❝","formatBlock","blockquote")}<i></i>${B("•≡","insertUnorderedList")}${B("1.","insertOrderedList")}<i></i>${B("⇤","justifyRight")}${B("≡","justifyCenter")}${B("⇥","justifyLeft")}<i></i><button onmousedown="event.preventDefault()" onclick="edLink()">🔗</button><button onmousedown="event.preventDefault()" onclick="edImg()">🖼</button>${B("―","insertHorizontalRule")}${B("⌫","removeFormat")}<i></i><button id="hbtn" onmousedown="event.preventDefault()" onclick="edMode()">&lt;/&gt;</button></div>`}
function edDraw(){
  const P=ED.kind==="product",d=ED.d,isPub=["publish","future"].includes(d.status);
  const stat=d.status==="auto-draft"?"draft":d.status==="future"?"publish":d.status;
  const cats=d.all_cats||[];
  let h=`<div class="in"><div class="edtop"><button class="back" onclick="edExit()">›</button><div class="sp"><div class="t ell" id="edh">${ED.id?(P?"ویرایش محصول":"ویرایش"):(P?"محصول جدید":"مطلب جدید")}</div><div class="edst" id="edst">${ED.id?sp(d.status):"پیش‌نویس جدید"}</div></div><div id="edbtn" class="row" style="gap:6px"></div></div>`;
  h+=`<textarea id="${P?"p_name":"e_title"}" class="ed-title" rows="1" placeholder="${P?"نام محصول":"عنوان مطلب"}" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'">${esc(P?d.name:d.title)}</textarea>`;
  if(P)h+=`<div class="cd" style="padding:12px"><div class="t" style="font-size:14px">تصاویر</div><div class="thumbbox" style="margin-top:8px"><div class="pv" id="pv" onclick="edThumb()"></div><div class="sp"><div class="m">تصویر اصلی + گالری. عکس‌ها هنگام آپلود فشرده می‌شوند.</div><div class="qa"><button class="b" onclick="edThumb()">انتخاب اصلی</button><button class="b d" onclick="ED.thumb={id:0,url:''};edThumbDraw();edDirty()">حذف</button></div></div></div><div class="galx" id="galx"></div></div>`;
  h+=`${ED.blocks?`<div class="cd m"><b>حالت امن Gutenberg</b><p>ساختار بلوک‌ها و کامنت‌های اصلی بدون تغییر حفظ شده‌اند. محتوای بلوکی در این نسخه فقط‌خواندنی است تا در ذخیره به HTML ساده تبدیل یا خراب نشود.</p><button class="b p" onclick="panel('post.php?post=${ED.id}&action=edit',true,'ویرایشگر بلوکی وردپرس')">بازکردن ویرایشگر واقعی بلوکی</button></div>`:""}
  ${P?`<div class="t" style="margin:12px 4px 0">توضیحات</div>`:""}${edToolbar()}
  <div class="row" style="gap:6px;margin:6px 0" id="edfindrow"><button class="b" onclick="edFindReplace()">جست‌وجو و جایگزینی</button><button class="b" onclick="edEditImage()">ویرایش تصویر انتخابی</button><span class="m" id="edchars"></span></div>
  <div id="e_body" class="eb" contenteditable="true" dir="auto" data-ph="${P?"توضیحات کامل محصول…":"شروع به نوشتن کنید…"}"></div><textarea id="e_html" class="eh"></textarea>
  <div class="estat"><span id="ewc"></span><span id="eas">ذخیرهٔ خودکار فعال</span></div>`;
  if(P)h+=edProdCards();
  h+=`<details class="ec" open><summary>🚀 انتشار</summary><div class="cb">
   <label class="l">وضعیت</label><select id="e_status" onchange="edBar()"><option value="draft" ${stat==="draft"?"selected":""}>پیش‌نویس</option><option value="pending" ${stat==="pending"?"selected":""}>در انتظار بازبینی</option><option value="publish" ${stat==="publish"?"selected":""}>منتشر شده</option><option value="private" ${stat==="private"?"selected":""}>خصوصی</option></select>
   ${P?"":`${srow("زمان‌بندی انتشار","e_sch",d.future,"edSch()","مطلب در زمان انتخابی خودکار منتشر می‌شود")}<input type="datetime-local" id="e_date" class="ltr" value="${esc(d.date_raw||"")}" style="${d.future?"":"display:none"}">
   ${ED.type==="post"?srow("سنجاق‌شده در بالا","e_sticky",d.sticky):""}${srow("اجازهٔ دیدگاه","e_cm",d.comment_status!=="closed")}`}</div></details>`;
  if(!P)h+=`<details class="ec"><summary>🖼 تصویر شاخص</summary><div class="cb"><div class="thumbbox"><div class="pv" id="pv" onclick="edThumb()"></div><div class="sp"><div class="qa"><button class="b" onclick="edThumb()">انتخاب / آپلود</button><button class="b" onclick="edFeaturedAlt()">ویرایش Alt</button><button class="b d" onclick="ED.thumb={id:0,url:''};edThumbDraw();edDirty()">حذف</button></div><p class="m">اگر خالی بماند، «خودکار» اولین عکس متن را انتخاب می‌کند.</p></div></div></div></details>`;
  if(cats.length||P)h+=`<details class="ec"><summary>🗂 دسته‌ها و برچسب‌ها</summary><div class="cb"><div class="tg" id="e_cats"></div><div class="row"><input id="e_nc" class="sp" placeholder="دستهٔ جدید…"><button class="b" onclick="edAddCat()">＋</button></div>
   <label class="l">برچسب‌ها (با کاما)</label><input id="e_tags" value="${esc(d.tags||"")}"><div class="tg" id="e_tsug"></div></div></details>`;
  if(!P)h+=`<details class="ec"><summary>✂️ نامک و خلاصه</summary><div class="cb"><label class="l">نامک (آدرس)</label><div class="row"><input id="e_slug" class="ltr sp" value="${esc(d.slug||"")}" oninput="edTick()"><button class="b" onclick="$('#e_slug').value='';edToast('خالی بماند، وردپرس از عنوان می‌سازد')">خودکار</button></div>
   <label class="l">خلاصه <span class="cnt" id="exc"></span></label><textarea id="e_excerpt" rows="3" oninput="edTick()">${esc(d.excerpt||"")}</textarea><button class="b" onclick="edGenExcerpt('e_excerpt')">✨ ساخت خودکار خلاصه</button></div></details>`;
  if(!P)h+=`<details class="ec"><summary>⚙️ تنظیمات پیشرفته محتوا</summary><div class="cb">
   <label class="l">نویسنده (شناسه کاربر)</label><input id="e_author" type="number" min="1" value="${esc(d.author_id||"")}">
   <label class="l">والد برگه (شناسه)</label><input id="e_parent" type="number" min="0" value="${esc(d.parent||0)}">
   <label class="l">قالب برگه</label><input id="e_template" class="ltr" value="${esc(d.template||"")}" placeholder="default">
   <label class="l">ترتیب نمایش</label><input id="e_order" type="number" value="${esc(d.menu_order||0)}">
   <label class="l">فرمت نوشته</label><select id="e_format">${["standard","aside","image","video","quote","link","gallery","audio","chat","status"].map(x=>`<option value="${x}" ${(d.format||"standard")===x?"selected":""}>${x}</option>`).join("")}</select>
   <label class="l">فیلدهای سفارشی / ACF (JSON)</label><textarea id="e_custom" rows="5" dir="ltr">${esc(JSON.stringify(d.custom_fields||{},null,2))}</textarea>
  </div></details>`;
  h+=`<details class="ec" open><summary>📈 سئو <span id="seob" class="badge"></span></summary><div class="cb">
   <div class="row" style="gap:14px"><div class="ring" id="ring"><b id="rn">۰</b></div><div class="sp"><div class="t" id="rt"></div><div class="m">${d.seo?.engine?`افزونهٔ سئو: ${esc(d.seo.engine)} — `:""}تحلیل زنده هنگام نوشتن</div></div></div>
   <div class="gp"><u id="gu"></u><b id="gt"></b><span id="gd"></span></div>
   <label class="l">عنوان سئو <span class="cnt" id="c1"></span></label><input id="e_st" value="${esc(d.seo?.title||"")}" placeholder="خالی = همان عنوان">
   <label class="l">توضیح متا <span class="cnt" id="c2"></span></label><textarea id="e_sd" rows="3">${esc(d.seo?.desc||"")}</textarea>
   <label class="l">کلمهٔ کلیدی اصلی</label><input id="e_sk" value="${esc(d.seo?.kw||"")}">
   <button class="b p" style="width:100%;margin:10px 0" onclick="edAuto()">✨ بهینه‌سازی خودکار (متا، کلیدی، خلاصه، تصویر، alt)</button><div id="chk"></div></div></details>`;
  h+=`<details class="ec"><summary>🧰 ابزارها</summary><div class="cb"><div class="dz">
   ${ED.id?`<button class="b" onclick="openUrl('${esc(d.link||"")}')">👁 مشاهده در سایت</button><button class="b" onclick="panel('post.php?post=${ED.id}&action=edit')">🖥 ویرایشگر کامل</button><button class="b" onclick="edDup()">⧉ کپی</button><button class="b" onclick="edRevisions()">🕘 تاریخچه</button><button class="b d" onclick="edTrash()">🗑 حذف</button>`:`<span class="m">پس از اولین ذخیره فعال می‌شود</span>`}</div></div></details></div>`;
  const o=document.createElement("div");o.id="ed";o.className="ed";o.innerHTML=h;document.body.appendChild(o);
  edSetHtml(ED.init);
  if(ED.blocks){
    ED.html=true;$("#e_body").style.display="none";$("#e_html").style.display="block";
    $("#e_html").readOnly=true;$("#e_html").setAttribute("aria-label","منبع Gutenberg فقط خواندنی");
    $("#hbtn")?.setAttribute("disabled","disabled");$("#edfindrow")?.remove();
    o.querySelector(".etb")?.remove();
  }
  edThumbDraw();edCatsDraw();edBar();
  o.addEventListener("input",edDirty);o.addEventListener("change",edDirty);
  $("#p_type")?.addEventListener("change",edProductTypeChanged);
  $("#e_body")?.addEventListener("click",ev=>{if(ev.target?.tagName==="IMG"){ED.selectedImage=ev.target;edEditImage()}});
  $("#e_body")?.addEventListener("paste",ev=>{ev.preventDefault();const cd=ev.clipboardData||window.clipboardData;let t=cd?.getData("text/plain")||"";t=t.replace(/\\r\\n?/g,"\\n").replace(/[\\u00a0\\u2007\\u202f]/g," ").replace(/[ \\t]+\\n/g,"\\n").replace(/\\n{3,}/g,"\\n\\n");document.execCommand("insertText",false,t);edDirty()});
  const t=$(P?"#p_name":"#e_title");t.style.height=t.scrollHeight+"px";if(!ED.id)t.focus()}
function edProdCards(){const d=ED.d,simple=["simple","external"].includes(d.type);
  return `<details class="ec" open><summary>💰 قیمت</summary><div class="cb"><div id="p_simple_price" style="${simple?"":"display:none"}">${simple?`<div class="two"><div><label class="l">قیمت (${esc(info.currency||"")})</label><input id="p_reg" type="number" class="ltr" value="${esc(d.regular)}"></div><div><label class="l">قیمت حراج</label><input id="p_sale" type="number" class="ltr" value="${esc(d.sale)}"></div></div>
   ${srow("زمان‌بندی حراج","p_sch",d.sale_from||d.sale_to,"$('#p_dt').style.display=this.checked?'grid':'none'")}<div class="two" id="p_dt" style="${d.sale_from||d.sale_to?"":"display:none"}"><div><label class="l">از</label><input id="p_from" type="date" class="ltr" value="${esc(d.sale_from)}"></div><div><label class="l">تا</label><input id="p_to" type="date" class="ltr" value="${esc(d.sale_to)}"></div></div>`:`<p class="m">محصول ${esc(d.type)}${d.var_count?` با ${fa(d.var_count)} تنوع`:""}: قیمت‌ها از بخش تنوع‌ها یا تنظیمات محصول تغییر می‌کند.</p>`}</div></div></details>
  <details class="ec"><summary>📦 موجودی</summary><div class="cb"><label class="l">SKU (شناسه)</label><input id="p_sku" class="ltr" value="${esc(d.sku)}">
   ${srow("مدیریت موجودی","p_ms",d.manage_stock,"edMs()")}<div id="p_m1" style="${d.manage_stock?"":"display:none"}"><label class="l">تعداد موجودی</label><input id="p_stock" type="number" class="ltr" value="${d.stock??""}"><label class="l">پیش‌سفارش</label><select id="p_bo"><option value="no" ${d.backorders==="no"?"selected":""}>ممنوع</option><option value="notify" ${d.backorders==="notify"?"selected":""}>مجاز با اطلاع به مشتری</option><option value="yes" ${d.backorders==="yes"?"selected":""}>مجاز</option></select></div>
   <div id="p_m2" style="${d.manage_stock?"display:none":""}"><label class="l">وضعیت موجودی</label><select id="p_ss"><option value="instock" ${d.stock_status==="instock"?"selected":""}>موجود</option><option value="outofstock" ${d.stock_status==="outofstock"?"selected":""}>ناموجود</option><option value="onbackorder" ${d.stock_status==="onbackorder"?"selected":""}>پیش‌سفارش</option></select></div>
   ${srow("فروش تکی (هر سفارش یک عدد)","p_si",d.sold_individually)}</div></details>
  <details class="ec"><summary>📝 توضیح کوتاه</summary><div class="cb"><textarea id="p_short" rows="4" oninput="edTick()">${esc(d.short||"")}</textarea><button class="b" onclick="edGenExcerpt('p_short')">✨ ساخت خودکار از توضیحات</button></div></details>
  <details class="ec"><summary>🚚 ارسال</summary><div class="cb"><label class="l">وزن</label><input id="p_w" type="number" class="ltr" value="${esc(d.weight)}"><div class="two" style="margin-top:6px"><div><label class="l">طول</label><input id="p_l" type="number" class="ltr" value="${esc(d.length)}"></div><div><label class="l">عرض</label><input id="p_wd" type="number" class="ltr" value="${esc(d.width)}"></div></div><label class="l">ارتفاع</label><input id="p_h" type="number" class="ltr" value="${esc(d.height)}"></div></details>
  <details class="ec"><summary>⚙️ پیشرفته</summary><div class="cb"><label class="l">نوع محصول</label><select id="p_type" ${ED.id?"disabled":""}>${[["simple","ساده"],["variable","متغیر"],["external","خارجی"],["grouped","گروهی"]].map(([v,l])=>`<option value="${v}" ${(d.type||"simple")===v?"selected":""}>${l}</option>`).join("")}</select><label class="l">نامک</label><input id="p_slug" class="ltr" value="${esc(d.slug)}" oninput="edTick()"><label class="l">نمایش در فروشگاه</label><select id="p_vis"><option value="visible" ${d.visibility==="visible"?"selected":""}>فروشگاه و جستجو</option><option value="catalog" ${d.visibility==="catalog"?"selected":""}>فقط فروشگاه</option><option value="search" ${d.visibility==="search"?"selected":""}>فقط جستجو</option><option value="hidden" ${d.visibility==="hidden"?"selected":""}>پنهان</option></select>${srow("محصول ویژه ⭐","p_ft",d.featured)}
   ${srow("محصول مجازی","p_virtual",d.virtual)}${srow("محصول دانلودی","p_downloadable",d.downloadable)}
   <label class="l">وضعیت مالیات</label><select id="p_tax_status"><option value="taxable" ${d.tax_status==="taxable"?"selected":""}>مشمول</option><option value="shipping" ${d.tax_status==="shipping"?"selected":""}>فقط ارسال</option><option value="none" ${d.tax_status==="none"?"selected":""}>بدون مالیات</option></select>
   <label class="l">کلاس مالیاتی</label><input id="p_tax_class" value="${esc(d.tax_class||"")}"><label class="l">شناسه کلاس ارسال</label><input id="p_shipping_class" type="number" value="${esc(d.shipping_class_id||0)}">
   <label class="l">یادداشت خرید</label><textarea id="p_note" rows="2">${esc(d.purchase_note||"")}</textarea>
   <label class="l">شناسه محصولات فروش مکمل (با کاما)</label><input id="p_upsell" value="${esc((d.upsell_ids||[]).join(", "))}">
   <label class="l">شناسه محصولات فروش متقاطع (با کاما)</label><input id="p_cross" value="${esc((d.cross_sell_ids||[]).join(", "))}">
   <div id="p_external_box" style="${d.type==="external"?"":"display:none"}"><label class="l">آدرس محصول خارجی</label><input id="p_external" class="ltr" value="${esc(d.external_url||"")}"><label class="l">متن دکمه</label><input id="p_button" value="${esc(d.button_text||"")}"></div>
   <div id="p_variable_box" style="${d.type==="variable"?"":"display:none"}"><label class="l">ویژگی‌ها (JSON)</label><textarea id="p_attributes" rows="6" dir="ltr">${esc(JSON.stringify(d.attributes||[],null,2))}</textarea><button class="b" onclick="edVariations()" ${ED.id?"":"disabled"}>مدیریت تنوع‌ها پس از ذخیره محصول</button></div>
  </div></details>`}
function edProductTypeChanged(){const t=$("#p_type")?.value||"simple",simple=$("#p_simple_price"),ext=$("#p_external_box"),vr=$("#p_variable_box");if(simple)simple.style.display=["simple","external"].includes(t)?"block":"none";if(ext)ext.style.display=t==="external"?"block":"none";if(vr)vr.style.display=t==="variable"?"block":"none"}
function edMs(){const on=$("#p_ms").checked;$("#p_m1").style.display=on?"block":"none";$("#p_m2").style.display=on?"none":"block"}
function edSch(){$("#e_date").style.display=$("#e_sch").checked?"block":"none";edBar()}
function edToast(m){toast(m)}
function edDirty(){if(!ED)return;ED.dirty=true;clearTimeout(_edT);_edT=setTimeout(edTick,350)}
function edBar(){if(!ED)return;const pub=["publish","future"].includes(ED.d.status),sc=$("#e_sch")?.checked;
  $("#edbtn").innerHTML=pub?`<button class="b p" onclick="edSave()">به‌روزرسانی</button>`:`<button class="b" onclick="edSave()">ذخیره</button><button class="b p" onclick="edSave('publish')">${sc?"زمان‌بندی":"انتشار"}</button>`}
function edState(t){const e=$("#eas");if(e)e.textContent=t}

/* rich text */
function fmt(c,v){if(ED.html)return;$("#e_body").focus();document.execCommand(c,false,v||null);edDirty()}
function saveRange(){const s=getSelection();if(s.rangeCount&&$("#e_body").contains(s.anchorNode))ED.range=s.getRangeAt(0).cloneRange()}
function restoreRange(){$("#e_body").focus();if(ED.range){const s=getSelection();s.removeAllRanges();s.addRange(ED.range)}}
function insHtml(h){if(ED.html){const t=$("#e_html"),a=t.selectionStart??t.value.length;t.value=t.value.slice(0,a)+h+t.value.slice(t.selectionEnd??a);return}restoreRange();document.execCommand("insertHTML",false,h)}
function edSetHtml(h){$("#e_body").innerHTML=h||"";$("#e_html").value=h||""}
function edHtml(){if(ED.html)return $("#e_html").value;const b=$("#e_body").cloneNode(true);b.removeAttribute("contenteditable");
  return b.innerHTML.replace(/<div>/g,"<p>").replace(/<\/div>/g,"</p>").replace(/<p><br><\/p>/g,"").replace(/&nbsp;/g," ").trim()}
function edMode(){if(ED?.blocks){toast("برای حفظ ساختار Gutenberg، حالت منبع فعال می‌ماند.");return}if(!ED.html){const h=edHtml();ED.html=true;$("#e_html").value=h;$("#e_html").style.display="block";$("#e_body").style.display="none"}else{$("#e_body").innerHTML=$("#e_html").value;ED.html=false;$("#e_html").style.display="none";$("#e_body").style.display="block"}
  $("#hbtn").classList.toggle("on",ED.html);edDirty()}
function edFindReplace(){
  sheet(`<div class="row"><div class="sp t">جست‌وجو و جایگزینی</div>${X()}</div><label class="l">عبارت جست‌وجو</label><input id="ed_find"><label class="l">جایگزین با</label><input id="ed_repl"><button class="b p" style="width:100%" onclick="edFindReplaceGo()">جایگزینی همه</button>`);
}
function edFindReplaceGo(){
  const a=$("#ed_find").value,b=$("#ed_repl").value;if(!a)return toast("عبارت جست‌وجو را وارد کنید");
  const el=ED.html?$("#e_html"):$("#e_body");if(ED.html){el.value=el.value.split(a).join(b)}else{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())n.nodeValue=n.nodeValue.split(a).join(b)}
  closeSheet();edDirty();edTick();toast("جایگزینی انجام شد؛ تغییرات هنوز ذخیره نشده‌اند");
}
function edLink(){saveRange();sheet(`<div class="row"><div class="sp t" style="font-size:18px">افزودن لینک</div>${X()}</div><input id="lk" class="ltr" placeholder="https://..." value="https://"><button class="b p" style="width:100%" onclick="edLinkGo()">افزودن</button>`)}
function edLinkGo(){const u=$("#lk").value.trim();closeSheet();if(!u||u==="https://")return;restoreRange();
  const s=getSelection();if(ED.html)insHtml(`<a href="${esc(u)}">${esc(u)}</a>`);else if(s.isCollapsed)document.execCommand("insertHTML",false,`<a href="${esc(u)}">${esc(u)}</a>`);else document.execCommand("createLink",false,u);edDirty()}
function edImg(){saveRange();pickMedia(m=>{insHtml(`<p><img src="${esc(m.url)}" alt="${esc(m.alt||m.title||"")}"></p>`);edDirty()})}

/* Image metadata and revision history */
function edEditImage(){
  if(!ED||ED.blocks)return toast("برای ایمنی ساختار بلوک، تصویر داخل Gutenberg از پنل وردپرس ویرایش می‌شود.");
  let root=null,img=ED.selectedImage||null;
  if(ED.html){root=document.createElement("div");root.innerHTML=$("#e_html").value;img=root.querySelector("img")}
  if(!img||!img.getAttribute("src"))return toast("ابتدا روی یک تصویر داخل متن بزنید");
  const a=img.closest("a"),fig=img.closest("figure"),cap=fig?.querySelector("figcaption");
  sheet(`<div class="row"><b class="sp">ویرایش تصویر داخل متن</b>${X()}</div>
    <label class="l">متن جایگزین (Alt)</label><input id="im_alt" value="${esc(img.alt||"")}">
    <label class="l">عنوان تصویر</label><input id="im_title" value="${esc(img.title||"")}">
    <div class="two"><div><label class="l">عرض (px)</label><input id="im_w" type="number" min="0" value="${esc(img.getAttribute("width")||"")}"></div><div><label class="l">ارتفاع (px)</label><input id="im_h" type="number" min="0" value="${esc(img.getAttribute("height")||"")}"></div></div>
    <label class="l">تراز تصویر</label><select id="im_align"><option value="">پیش‌فرض</option><option value="left" ${img.classList.contains("alignleft")?"selected":""}>چپ</option><option value="center" ${img.classList.contains("aligncenter")?"selected":""}>وسط</option><option value="right" ${img.classList.contains("alignright")?"selected":""}>راست</option><option value="wide" ${img.classList.contains("alignwide")?"selected":""}>عریض</option><option value="full" ${img.classList.contains("alignfull")?"selected":""}>تمام‌عرض</option></select>
    <label class="l">کپشن</label><textarea id="im_caption" rows="2">${esc(cap?.textContent||"")}</textarea>
    <label class="l">لینک تصویر (خالی = بدون لینک)</label><input id="im_link" class="ltr" value="${esc(a?.getAttribute("href")||"")}">
    <button class="b p" style="width:100%" onclick="edImageApply()">اعمال روی تصویر</button>`);
  ED.imageSource=root?root.innerHTML:null;
}
function edImageApply(){
  const values={alt:$("#im_alt").value,title:$("#im_title").value,width:$("#im_w").value,height:$("#im_h").value,align:$("#im_align").value,caption:$("#im_caption").value,link:$("#im_link").value};
  let root=null,img=ED.selectedImage;
  if(ED.html){root=document.createElement("div");root.innerHTML=$("#e_html").value;img=root.querySelector("img")}
  if(!img)return closeSheet();
  img.alt=values.alt;img.title=values.title;
  ["width","height"].forEach(k=>{const n=Number(values[k]);if(n>0)img.setAttribute(k,String(Math.min(4000,n)));else img.removeAttribute(k)});
  ["alignleft","alignright","aligncenter","alignwide","alignfull"].forEach(c=>img.classList.remove(c));
  if(values.align)img.classList.add("align"+values.align);
  let figure=img.closest("figure");
  if(values.caption){if(!figure){figure=document.createElement("figure");figure.className="wp-caption";img.parentNode.insertBefore(figure,img);figure.appendChild(img)}let fc=figure.querySelector("figcaption");if(!fc){fc=document.createElement("figcaption");figure.appendChild(fc)}fc.textContent=values.caption}
  else if(figure?.querySelector("figcaption"))figure.querySelector("figcaption").remove();
  let a=img.closest("a");
  if(values.link){if(a)a.href=values.link;else{a=document.createElement("a");a.href=values.link;a.appendChild(img.cloneNode(true));img.replaceWith(a);img=a.querySelector("img")}}
  else if(a){a.replaceWith(img.cloneNode(true));img=a.previousElementSibling||a.querySelector("img");}
  if(ED.html){$("#e_html").value=root.innerHTML}else{ED.selectedImage=img}
  closeSheet();edDirty();edTick();toast("مشخصات تصویر تغییر کرد؛ برای ذخیره، دکمه ذخیره را بزنید");
}
async function edFeaturedAlt(){
  if(!ED?.thumb?.id)return toast("تصویر شاخص انتخاب نشده است");
  try{const d=await api("/media/"+ED.thumb.id);sheet(`<div class="row"><b class="sp">متن جایگزین تصویر شاخص</b>${X()}</div>${d.thumb?`<img src="${esc(d.thumb)}" style="width:100%;max-height:180px;object-fit:contain">`:""}<label class="l">Alt</label><input id="feat_alt" value="${esc(d.alt||"")}"><label class="l">عنوان</label><input id="feat_title" value="${esc(d.title||"")}"><button class="b p" style="width:100%" onclick="edFeaturedAltSave(${ED.thumb.id})">ذخیره مشخصات رسانه</button>`)}catch(e){toast(e.message)}
}
async function edFeaturedAltSave(id){try{await api("/media/"+id,{action:"update",alt:$("#feat_alt").value,title:$("#feat_title").value});closeSheet();toast("متن جایگزین تصویر شاخص ذخیره شد")}catch(e){toast(e.message)}}
async function edRevisions(){
  if(!ED?.id||ED.kind==="product")return toast("تاریخچه نسخه برای این محتوا در دسترس نیست");
  try{const d=await api("/revisions/"+ED.id);let selected=d.items?.[0]?.id||0;
    sheet(`<div class="row"><b class="sp">تاریخچه نسخه‌ها</b>${X()}</div><div class="m">حداکثر ۵۰ نسخه ذخیره‌شده</div><div id="revlist">${(d.items||[]).map((x,i)=>`<div class="cd"><div class="row"><b class="sp">${esc(x.date)} · ${esc(x.author)}</b><span class="pill">${i===0?"جدیدترین":""}</span></div><div class="t">${esc(x.title||"بدون عنوان")}</div><p class="m">${esc(x.excerpt||"")}</p><div class="row"><button class="b sp" onclick="edRevisionPreview(${x.id})">مشاهده</button><button class="b sp" onclick="edRevisionCompare(${x.id})">مقایسه</button><button class="b d sp" onclick="edRevisionRestore(${x.id})">بازگردانی</button></div></div>`).join("")||'<div class="ld">نسخه‌ای ثبت نشده است.</div>'}</div>`);ED.revisions=d.items||[];
  }catch(e){toast(e.message)}
}
function edRevisionCompare(id){
  const x=(ED.revisions||[]).find(a=>a.id===id);if(!x)return;
  const plain=s=>String(s||"").replace(/<!--\s*\/?wp:[\s\S]*?-->/g," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
  const old=plain(x.content),now=plain(ED.d?.content||"");
  const oldWords=old.split(" "),newWords=now.split(" "),max=Math.min(700,Math.max(oldWords.length,newWords.length));let html="";
  for(let i=0;i<max;i++){const a=oldWords[i]||"",b=newWords[i]||"";if(a===b)html+=`<span>${esc(a)} </span>`;else{if(a)html+=`<del style="background:#dc262622;color:#dc2626">${esc(a)} </del>`;if(b)html+=`<ins style="background:#05966922;color:#059669;text-decoration:none">${esc(b)} </ins>`}}
  sheet(`<div class="row"><b class="sp">مقایسه با محتوای فعلی</b>${X()}</div><div class="m">قرمز: نسخه قدیمی · سبز: محتوای فعلی</div><div class="cd" style="white-space:pre-wrap;line-height:2;max-height:55vh;overflow:auto;direction:rtl">${html||"متنی برای مقایسه وجود ندارد."}</div>`);
}
function edRevisionPreview(id){
  const x=(ED.revisions||[]).find(a=>a.id===id);if(!x)return;
  sheet(`<div class="row"><b class="sp">پیش‌نمایش نسخه ${fa(id)}</b>${X()}</div><div class="cd"><b>${esc(x.title)}</b><p class="m">${esc(x.date)} · ${esc(x.author)}</p><pre style="white-space:pre-wrap;direction:auto">${esc((x.content||"").replace(/<[^>]*>/g," ").replace(/\\s+/g," ").slice(0,5000))}</pre></div><button class="b d" style="width:100%" onclick="edRevisionRestore(${id})">بازگردانی این نسخه</button>`);
}
async function edRevisionRestore(id){if(!confirm("محتوای فعلی با این نسخه جایگزین شود؟ وردپرس نسخه فعلی را در تاریخچه نگه می‌دارد."))return;
  try{await api("/revisions/"+ED.id,{revision_id:id});const kind=ED.kind,type=ED.type,postId=ED.id;ED.dirty=false;edClose(true);toast("نسخه بازگردانی شد");setTimeout(()=>edOpen(kind,postId,type),150)}catch(e){toast(e.message)}
}
async function edVariations(){
  if(!ED?.id)return toast("ابتدا محصول متغیر را ذخیره کنید");
  try{const d=await api("/products/"+ED.id+"/variations");sheet(`<div class="row"><b class="sp">تنوع‌های محصول</b>${X()}</div><div class="cd m">${fa(d.items?.length||0)} تنوع ثبت‌شده. برای افزودن تنوع، ابتدا ویژگی‌های دارای قابلیت تنوع را در پنل ووکامرس تعریف کنید.</div>${(d.items||[]).map((v,i)=>`<div class="cd"><b>تنوع #${fa(v.id)}</b><div class="m">${esc(JSON.stringify(v.attributes||{}))}</div><div class="two"><div><label class="l">قیمت عادی</label><input id="var_reg_${v.id}" type="number" value="${esc(v.regular)}"></div><div><label class="l">قیمت حراج</label><input id="var_sale_${v.id}" type="number" value="${esc(v.sale)}"></div></div><div class="two"><div><label class="l">موجودی</label><input id="var_stock_${v.id}" type="number" value="${esc(v.stock??"")}"></div><div><label class="l">SKU</label><input id="var_sku_${v.id}" value="${esc(v.sku||"")}"></div></div><button class="b p" onclick="edVariationSave(${v.id})">ذخیره تنوع</button></div>`).join("")}`)}
  catch(e){toast(e.message)}
}
async function edVariationSave(id){const b={id,regular:$("#var_reg_"+id).value,sale:$("#var_sale_"+id).value,stock:$("#var_stock_"+id).value,sku:$("#var_sku_"+id).value};try{await api("/products/"+ED.id+"/variations",b);toast("تنوع ذخیره شد")}catch(e){toast(e.message)}}
/* thumb, gallery, taxonomy */
function edThumb(){pickMedia(m=>{ED.thumb={id:m.id,url:m.thumb||m.url};edThumbDraw();edDirty()})}
function edThumbDraw(){const p=$("#pv");if(p){p.style.backgroundImage=ED.thumb.url?`url('${ED.thumb.url}')`:"";p.textContent=ED.thumb.url?"":"＋ تصویر"}
  const g=$("#galx");if(g)g.innerHTML=ED.gal.map((x,i)=>`<div style="background-image:url('${esc(x.url)}')"><b onclick="ED.gal.splice(${i},1);edThumbDraw();edDirty()">×</b></div>`).join("")+`<div class="add" onclick="edGal()">＋</div>`}
function edGal(){pickMedia(m=>{ED.gal.push({id:m.id,url:m.thumb||m.url});edThumbDraw();edDirty()},true)}
function edCatsDraw(){const e=$("#e_cats");if(e)e.innerHTML=(ED.d.all_cats||[]).map(c=>`<button class="chip ${ED.cats.includes(c.id)?"on":""}" onclick="edCat(${c.id})">${esc(c.name)}</button>`).join("")||`<span class="m">دسته‌ای نیست</span>`;
  const t=$("#e_tsug");if(t)t.innerHTML=(ED.d.all_tags||[]).slice(0,14).map(n=>`<button class="chip" onclick="edTag(this.textContent)">${esc(n)}</button>`).join("")}
function edCat(id){const i=ED.cats.indexOf(id);i<0?ED.cats.push(id):ED.cats.splice(i,1);edCatsDraw();edDirty()}
function edTag(n){const e=$("#e_tags"),a=e.value.split(",").map(x=>x.trim()).filter(Boolean);if(!a.includes(n))a.push(n);e.value=a.join(", ");edDirty()}
async function edAddCat(){const n=$("#e_nc").value.trim();if(!n)return;try{const r=await api("/terms",{tax:ED.kind==="product"?"product_cat":"category",name:n});const t=r.items.find(x=>x.name===n);
  ED.d.all_cats=r.items.map(x=>({id:x.id,name:x.name}));if(t)ED.cats.push(t.id);$("#e_nc").value="";edCatsDraw();edDirty()}catch(e){toast(e.message)}}

/* live stats + SEO */
function seoLocal(){
  const P=ED.kind==="product",title=$v(P?"p_name":"e_title"),st=$v("e_st")||title,sd=$v("e_sd"),kw=$v("e_sk").split(",")[0].trim().toLowerCase();
  const html=edHtml(),text=html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),words=text?text.split(" ").length:0,first=text.split(" ").slice(0,120).join(" ").toLowerCase();
  const imgs=html.match(/<img\b[^>]*>/gi)||[],noalt=imgs.filter(t=>!/\balt\s*=\s*("[^"]+"|'[^']+')/i.test(t)).length;
  let ni=0,ne=0;const host=new URL(S.url).host;[...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].forEach(m=>{try{new URL(m[1],S.url).host===host?ni++:ne++}catch(e){ni++}});
  let slug=$v(P?"p_slug":"e_slug")||ED.d.slug||"";try{slug=decodeURIComponent(slug)}catch(e){}slug=slug.toLowerCase();
  const C=[],add=(ok,w,l,t)=>C.push({ok:!!ok,w,label:l,tip:t}),tl=st.length,dl=sd.length,ex=$v(P?"p_short":"e_excerpt").trim();
  add(tl>=30&&tl<=65,10,"طول عنوان سئو",`عنوان سئو باید ۳۰ تا ۶۵ کاراکتر باشد (الان ${fa(tl)})`);
  add(dl>=110&&dl<=165,12,"توضیح متا",`توضیح متا باید ۱۱۰ تا ۱۶۵ کاراکتر باشد (الان ${fa(dl)})`);
  add(kw,10,"کلمهٔ کلیدی","یک کلمهٔ کلیدی اصلی انتخاب کنید");
  if(kw){add(st.toLowerCase().includes(kw),8,"کلیدی در عنوان","کلمهٔ کلیدی را در عنوان بیاورید");add(sd.toLowerCase().includes(kw),6,"کلیدی در توضیح متا","کلمهٔ کلیدی را در توضیح متا بیاورید");
    add(first.includes(kw),8,"کلیدی در ابتدای متن","کلمهٔ کلیدی در پاراگراف اول بیاید");add(slug.includes(kw.replace(/ /g,"-")),4,"کلیدی در نامک","کلمهٔ کلیدی در نامک بیاید")}
  const min=P?120:300;add(words>=min,12,"طول متن",`حداقل ${fa(min)} کلمه بنویسید (الان ${fa(words)})`);
  if(!P)add(/<h[23]\b/i.test(html),8,"زیرعنوان (H2/H3)","حداقل یک زیرعنوان اضافه کنید");
  add(ED.thumb.id,8,"تصویر شاخص","یک تصویر شاخص انتخاب کنید");
  if(!P)add(imgs.length,4,"تصویر در متن","حداقل یک تصویر داخل متن بگذارید");
  add(noalt===0,6,"alt تصاویر",`${fa(noalt)} تصویر بدون alt است`);
  if(!P){add(ni>0,6,"لینک داخلی","حداقل یک لینک به صفحهٔ دیگر سایت بدهید");add(ne>0,4,"لینک خارجی","یک لینک به منبع معتبر بدهید")}
  add(ex,4,P?"توضیح کوتاه":"خلاصه","خلاصه را بنویسید");
  const tot=C.reduce((a,c)=>a+c.w,0),got=C.reduce((a,c)=>a+(c.ok?c.w:0),0);return{score:Math.round(100*got/tot),checks:C,words}}
function edTick(){
  if(!ED||!$("#e_body"))return;const P=ED.kind==="product",r=seoLocal();
  $("#ewc").textContent=`${fa(r.words)} کلمه · ${fa(Math.max(1,Math.round(r.words/200)))} دقیقه مطالعه`;
  const ce=$("#edchars");if(ce)ce.textContent=`${fa((edHtml()||"").length)} نویسه`;
  const col=r.score>=80?"#0b7a62":r.score>=50?"#f59e0b":"#dc2626";
  $("#ring").style.cssText=`--p:${r.score};--rc:${col}`;$("#rn").textContent=fa(r.score);$("#rt").textContent=r.score>=80?"عالی":r.score>=50?"قابل بهبود":"ضعیف";
  const bad=r.checks.filter(c=>!c.ok).length;$("#seob").textContent=bad?`${fa(bad)} مورد`:"✓";
  const title=$v(P?"p_name":"e_title"),st=$v("e_st")||title,slug=($v(P?"p_slug":"e_slug")||ED.d.slug||"").slice(0,50);
  $("#gu").textContent=`${S.url.replace(/^https?:\/\//,"")} › ${slug||"…"}`;$("#gt").textContent=st||"عنوان";
  const text=(ED.html?$("#e_html").value.replace(/<[^>]+>/g," "):$("#e_body").innerText).replace(/\s+/g," ").trim();
  $("#gd").textContent=$v("e_sd")||text.slice(0,150);
  const cn=(id,n,a,b)=>{const e=$("#"+id);if(e){e.textContent=fa(n);e.className="cnt "+(n>=a&&n<=b?"ok":n?"bad":"")}};cn("c1",st.length,30,65);cn("c2",$v("e_sd").length,110,165);
  const ex=$("#exc");if(ex)ex.textContent=fa($v("e_excerpt").length);
  $("#chk").innerHTML=r.checks.slice().sort((a,b)=>a.ok-b.ok).map(c=>`<div class="chk ${c.ok?"ok":"no"}"><i>${c.ok?"✓":"✕"}</i><div>${c.ok?esc(c.label):`<b>${esc(c.label)}</b><div class="m">${esc(c.tip)}</div>`}</div></div>`).join("");
  if(ED.dirty)try{edWriteDraft(edKey(),JSON.stringify({t:title,h:edHtml(),ts:Date.now()})).catch(()=>{})}catch(e){}}
function edGenExcerpt(id){const t=(ED.html?$("#e_html").value.replace(/<[^>]+>/g," "):$("#e_body").innerText).replace(/\s+/g," ").trim();if(!t)return toast("اول متن را بنویسید");
  let c=t.slice(0,220);const i=c.lastIndexOf(" ");if(t.length>220&&i>150)c=c.slice(0,i);$("#"+id).value=c+(t.length>220?"…":"");edDirty()}

/* save / autosave / auto-optimize */
function edCollect(force){
  const P=ED.kind==="product",g=id=>$("#"+id),v=$v,seo={title:v("e_st"),desc:v("e_sd"),kw:v("e_sk")},tags=v("e_tags");
  if(!P){
    const b={type:ED.type,title:v("e_title").trim(),content:edHtml(),excerpt:v("e_excerpt"),status:force||v("e_status"),slug:v("e_slug"),cats:ED.cats,tags,thumb:ED.thumb.id,seo,comment_status:g("e_cm")?.checked?"open":"closed"};
    if(g("e_sticky"))b.sticky=g("e_sticky").checked;
    if(g("e_sch")?.checked&&v("e_date"))b.date=v("e_date");
    if(g("e_author")?.value)b.author=Number(v("e_author"));
    if(g("e_parent"))b.parent=Number(v("e_parent")||0);
    if(g("e_template"))b.template=v("e_template");
    if(g("e_order"))b.menu_order=Number(v("e_order")||0);
    if(g("e_format"))b.format=v("e_format");
    if(g("e_custom")){try{b.custom_fields=JSON.parse(v("e_custom")||"{}")}catch(e){throw new Error("JSON فیلدهای سفارشی معتبر نیست")}}
    return b;
  }
  const b={name:v("p_name").trim(),desc:edHtml(),short:v("p_short"),status:force||v("e_status"),slug:v("p_slug"),sku:v("p_sku"),manage_stock:g("p_ms").checked,stock:v("p_stock"),stock_status:v("p_ss"),backorders:v("p_bo"),
    sold_individually:g("p_si").checked,weight:v("p_w"),length:v("p_l"),width:v("p_wd"),height:v("p_h"),visibility:v("p_vis"),featured:g("p_ft").checked,cats:ED.cats,tags,thumb:ED.thumb.id,gallery:ED.gal.map(x=>x.id),seo};
  if(g("p_reg")){b.regular=v("p_reg");b.sale=v("p_sale");b.sale_from=g("p_sch").checked?v("p_from"):"";b.sale_to=g("p_sch").checked?v("p_to"):""}
  if(g("p_type"))b.type=v("p_type");
  if(g("p_virtual"))b.virtual=g("p_virtual").checked;
  if(g("p_downloadable"))b.downloadable=g("p_downloadable").checked;
  if(g("p_tax_status"))b.tax_status=v("p_tax_status");
  if(g("p_tax_class"))b.tax_class=v("p_tax_class");
  if(g("p_shipping_class"))b.shipping_class_id=Number(v("p_shipping_class")||0);
  if(g("p_note"))b.purchase_note=v("p_note");
  if(g("p_upsell"))b.upsell_ids=v("p_upsell").split(",").map(x=>Number(x.trim())).filter(Boolean);
  if(g("p_cross"))b.cross_sell_ids=v("p_cross").split(",").map(x=>Number(x.trim())).filter(Boolean);
  if(g("p_external"))b.external_url=v("p_external");
  if(g("p_button"))b.button_text=v("p_button");
  if(g("p_attributes")){try{b.attributes=JSON.parse(v("p_attributes")||"[]")}catch(e){throw new Error("JSON ویژگی‌های محصول معتبر نیست")}}
  return b}
async function edSave(force,quiet){
  if(!ED||ED.saving)return false;const P=ED.kind==="product",b=edCollect(force);
  if(!(P?b.name:b.title)){if(!quiet)toast(P?"نام محصول را بنویسید":"عنوان را بنویسید");return false}
  ED.saving=true;edState("در حال ذخیره…");const k=edKey(),path=(P?"/products/":"/posts/")+ED.id;
  try{
    if(ED.id&&ED.d?.modified_gmt){
      const latest=await api(path);
      if(latest.modified_gmt&&latest.modified_gmt!==ED.d.modified_gmt){
        const ok=confirm("این محتوا در پیشخوان وردپرس تغییر کرده است. نسخه جدیدتر سرور با نسخه ویرایشگر متفاوت است. آیا با آگاهی از احتمال جایگزینی تغییرات ادامه می‌دهید؟");
        if(!ok){ED.d=latest;edState("تداخل ویرایش؛ ذخیره متوقف شد");return false}
      }
    }
    const d=await api(path,b);ED.id=d.id;ED.d=d;ED.dirty=false;await edDeleteDraft(k);
    $("#e_status").value=d.status==="future"?"publish":d.status==="auto-draft"?"draft":d.status;$("#edst").innerHTML=sp(d.status);$("#edh").textContent=P?"ویرایش محصول":"ویرایش";
    edBar();edState("ذخیره شد "+new Date().toLocaleTimeString((window.SMB_I18N?.locale||"fa-IR"),{hour:"2-digit",minute:"2-digit"}));
    if(!quiet)toast(force==="publish"?(d.status==="future"?"زمان‌بندی شد ✓":"منتشر شد ✓"):"ذخیره شد ✓");return true
  }catch(e){
    if(ED&&!P&&["draft","pending"].includes(b.status)&&(navigator.onLine===false||/ارتباط اینترنت/.test(e.message))){
      try{const n=await queueOffline(path,b);ED.dirty=false;await edDeleteDraft(k);edState("در صف ارسال آفلاین");toast("پیش‌نویس در صف امن دستگاه قرار گرفت؛ پس از اتصال ارسال می‌شود ("+fa(n)+")");return true}catch(qe){toast("ذخیره در صف آفلاین ناموفق بود")}
    }
    edState("خطا در ذخیره");toast(e.message);return false
  }finally{if(ED)ED.saving=false}}
async function edAutoSave(){if(!ED||!ED.dirty||ED.saving)return;const s=$v("e_status");
  if(!["draft","pending"].includes(s)||!["draft","pending","auto-draft",undefined].includes(ED.d.status))return;await edSave(null,true)}
async function edAuto(){
  if(ED.blocks)return toast("بهینه‌سازی خودکار برای محتوای Gutenberg غیرفعال است تا ساختار بلوک‌ها تغییر نکند.");
  if(!confirm("بهینه‌سازی فقط فیلدهای خالی را تغییر می‌دهد. مایلید ادامه دهید؟"))return;
  if(ED.dirty||!ED.id){const ok=await edSave(null,true);if(!ok)return}
  toast("در حال بهینه‌سازی…");const P=ED.kind==="product";
  try{const r=await api((P?"/products/":"/posts/")+ED.id,{action:"autofix",confirm:true});const d=await api((P?"/products/":"/posts/")+ED.id);ED.d=d;
    if(P){$("#p_short").value=d.short||"";edSetHtml((d.desc||"").replace(/<!--[\s\S]*?-->/g,""))}else{$("#e_excerpt").value=d.excerpt||"";edSetHtml((d.content||"").replace(/<!--[\s\S]*?-->/g,""))}
    $("#e_sd").value=d.seo?.desc||"";$("#e_sk").value=d.seo?.kw||"";$("#e_st").value=d.seo?.title||"";ED.thumb={id:d.thumb_id||0,url:d.thumb||""};edThumbDraw();ED.dirty=false;edTick();
    sheet(`<div class="row"><div class="sp t" style="font-size:18px">✨ بهینه‌سازی خودکار</div>${X()}</div>${r.changes.length?r.changes.map(c=>`<div class="chk ok"><i>✓</i><div>${esc(c)}</div></div>`).join(""):`<p class="m">همه‌چیز از قبل کامل بود. برای بهتر شدن، متن را بلندتر کنید یا لینک داخلی بدهید.</p>`}`)}
  catch(e){toast(e.message)}}
async function edDup(){try{const r=await api((ED.kind==="product"?"/products/":"/posts/")+ED.id,{action:"duplicate"});const k=ED.kind,t=ED.type;ED.dirty=false;edClose(true);toast("کپی ساخته شد");setTimeout(()=>edOpen(k,r.id,t),250)}catch(e){toast(e.message)}}
async function edTrash(){if(!confirm("به زباله‌دان منتقل شود؟"))return;try{await api((ED.kind==="product"?"/products/":"/posts/")+ED.id,{action:"trash"});ED.dirty=false;edClose();toast("منتقل شد")}catch(e){toast(e.message)}}
