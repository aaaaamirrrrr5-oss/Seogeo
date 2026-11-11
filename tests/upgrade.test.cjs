const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const U=require(path.join(root,'www/upgrade.js'));
const html=fs.readFileSync(path.join(root,'www/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'www/upgrade.js'),'utf8');
const css=fs.readFileSync(path.join(root,'www/upgrade.css'),'utf8');

// wiring
assert(html.includes('href="upgrade.css"')&&html.includes('src="upgrade.js"'),'upgrade layer is linked');
assert(html.indexOf('src="upgrade.js"')>html.indexOf('src="ux-pro.js"'),'upgrade.js loads after ux-pro.js');
assert(!/setInterval\s*\(/.test(js),'no polling timers');
assert(!/window\.(tab|info|uiPrefs)\b/.test(js),'top-level let bindings are not read through window');

// Persian/Arabic normalization
assert.strictEqual(U.normalize('سفارش‌ها'),U.normalize('سفارشها'),'ZWNJ ignored');
assert.strictEqual(U.normalize('كتاب ي'),U.normalize('کتاب ی'),'Arabic ي/ك unified with Persian');
assert.strictEqual(U.normalize('۱۲۳'),'123','Persian digits normalized');

// ranking
const items=[
  {id:'orders',label:'سفارش‌ها',keywords:'orders woocommerce'},
  {id:'posts',label:'مقاله‌ها',keywords:'post blog نوشته'},
  {id:'plugins',label:'افزونه‌ها',keywords:'plugin پلاگین'},
  {id:'products',label:'محصولات',keywords:'products کالا'}
];
assert.deepStrictEqual(U.rank('سفارش',items).map(i=>i.id),['orders'],'label prefix match');
assert.strictEqual(U.rank('plugin',items)[0].id,'plugins','English keyword match');
assert.strictEqual(U.rank('نوشته',items)[0].id,'posts','Persian keyword match');
assert.strictEqual(U.rank('zzz',items).length,0,'no match returns empty');
assert.strictEqual(U.rank('',items).length,items.length,'empty query keeps all');
assert.strictEqual(U.rank('',items,['products'])[0].id,'products','recent items float up when scores tie');

// gestures
assert.strictEqual(U.pullDecision(0,120,0),'refresh');
assert.strictEqual(U.pullDecision(0,30,0),'pulling');
assert.strictEqual(U.pullDecision(0,200,50),'none','no pull when page is scrolled');
assert.strictEqual(U.swipeCloses(0,150,500,0),true,'long drag closes');
assert.strictEqual(U.swipeCloses(0,70,150,0),true,'fast flick closes');
assert.strictEqual(U.swipeCloses(0,70,900,0),false,'slow short drag does not close');
assert.strictEqual(U.swipeCloses(0,300,200,40),false,'scrolled sheet does not close');

// a11y / theming contract
for(const t of ['role="combobox"','role="listbox"','aria-live','aria-label','prefers-reduced'])assert(js.includes(t)||css.includes(t),`contains ${t}`);
assert(css.includes('prefers-reduced-motion'),'reduced motion respected');
assert(js.includes('(window.scrollY||0)<600'),'scroll-top threshold');
// 4.3 additions: focus card, trend, prefs commands
assert.strictEqual(U.greeting(8),'صبح بخیر');assert.strictEqual(U.greeting(13),'ظهر بخیر');assert.strictEqual(U.greeting(18),'عصر بخیر');assert.strictEqual(U.greeting(23),'شب بخیر');assert.strictEqual(U.greeting(2),'شب بخیر');
const t=U.trend({'2026-11-03':100,'2026-11-04':100,'2026-11-05':100,'2026-11-09':150,'2026-11-08':100});
assert.strictEqual(t.last,150,'trend sorts days by date');assert.strictEqual(t.deltaPct,50);assert.strictEqual(t.dir,'up');
assert.strictEqual(U.trend({'a':10,'b':5}).dir,'down');
assert.strictEqual(U.trend({'a':0,'b':5}).deltaPct,null,'no delta when baseline is zero');
assert.strictEqual(U.trend({'a':1}),null,'needs at least two days');
assert(/^M[\d. ]+L/.test(U.sparkPath([1,3,2],100,40)),'sparkline path');
assert(U.sparkPath([5,5,5],100,40).includes(' 20.0'),'flat series sits mid-height');
assert.strictEqual(U.sparkPath([1],100,40),'');
const cards=U.focusCards({counts:{'wc-processing':3,'wc-on-hold':0},comments_access:true,comments:2,updates:0,product_access:false,out_of_stock:9});
assert.deepStrictEqual(cards.map(c=>c.id),['processing','comments'],'only actionable, permitted counts are shown');
assert.deepStrictEqual(U.focusCards(null),[]);
assert.strictEqual(U.nextTheme('system'),'light');assert.strictEqual(U.nextTheme('light'),'dark');assert.strictEqual(U.nextTheme('dark'),'system');assert.strictEqual(U.nextTheme('weird'),'light');
assert.strictEqual(U.fontStep(21,1),21);assert.strictEqual(U.fontStep(14,-1),14);assert.strictEqual(U.fontStep(undefined,1),16);
for(const tok of ['upl-focus','scheduleRemote','remoteSeq','data-act','savePrefs'])assert(js.includes(tok),`js has ${tok}`);
assert(css.includes('.upl-focus')&&css.includes('.upl-chip'),'focus card styled');
// 4.4 comfort UX: back stack, unsaved guard, prefs
assert.strictEqual(U.backAction({sheetOpen:true,hasBack:true,tab:'orders'}),'close-sheet','sheet closes first');
assert.strictEqual(U.backAction({sheetOpen:false,hasBack:true,tab:'hub'}),'back-button','then page back');
assert.strictEqual(U.backAction({sheetOpen:false,hasBack:false,tab:'orders'}),'home','top-level tab returns home');
assert.strictEqual(U.backAction({sheetOpen:false,hasBack:false,tab:'home'}),'arm-exit','home asks to press twice');
for(const tok of ['requestCloseSheet','dataset.dirty','smb:"root"','smb:"guard"','ensureJumpFab','upl-hc','upl-calm','upl-lefty','c_hc','c_hand','scrollIntoView','exitArmed'])assert(js.includes(tok),`js has ${tok}`);
assert(!js.includes('className="upl-jump"'),'does not create a second floating magnifier');
assert(js.includes('document.querySelectorAll(".upl-jump").forEach(b=>b.remove())'),'removes stale duplicate magnifier buttons');
assert(js.includes('if(history.state&&history.state.ed)return'),'does not fight the editor history entry');
for(const tok of ['html.upl-hc','html.upl-calm','html.upl-lefty'])assert(css.includes(tok),`css has ${tok}`);
assert(!css.includes('.upl-jump'),'no duplicate floating magnifier styles remain');
console.log('PASS upgrade layer: palette ranking, normalization, gestures, a11y and wiring');
