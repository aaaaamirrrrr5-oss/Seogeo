const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../www/i18n.js'),'utf8');
class FakeNode{
  constructor(type,tag=''){this.nodeType=type;this.tagName=tag;this.childNodes=[];this.attrs={};this.nodeValue='';this.dir='';this.dataset={};this.type='';this.value='';this.isContentEditable=false;}
  appendChild(n){this.childNodes.push(n);return n;}
  hasAttribute(k){return Object.prototype.hasOwnProperty.call(this.attrs,k);}
  getAttribute(k){return this.attrs[k]??null;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  get children(){return this.childNodes;}
}
const text=s=>{const n=new FakeNode(3);n.nodeValue=s;return n;};
const body=new FakeNode(1,'BODY'),app=new FakeNode(1,'DIV'),html=new FakeNode(1,'HTML');body.appendChild(app);
let ready=null,observerCallback=null;
class FakeObserver{constructor(cb){observerCallback=cb;}observe(){}}
const document={body,documentElement:html,title:'مدیریت سایت | پنل هوشمند وردپرس',getElementById:id=>id==='app'?app:null,addEventListener:(e,cb)=>{if(e==='DOMContentLoaded')ready=cb;}};
const storage=new Map();
const context={document,Node:{TEXT_NODE:3,ELEMENT_NODE:1},MutationObserver:FakeObserver,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},window:{dispatchEvent(){}},console};
vm.runInNewContext(source,context,{timeout:1000});
const nav=text('خانه');app.appendChild(nav);
const script=new FakeNode(1,'SCRIPT');script.appendChild(text('خانه'));app.appendChild(script);
const input=new FakeNode(1,'INPUT');input.setAttribute('placeholder','جستجو…');app.appendChild(input);
ready();
assert.equal(nav.nodeValue,'خانه');
assert.equal(document.title,'مدیریت سایت | پنل هوشمند وردپرس');
context.window.SMB_I18N.setLanguage('en');
assert.equal(nav.nodeValue,'Home');
assert.equal(document.title,'Site management | Smart WordPress dashboard');
assert.equal(script.childNodes[0].nodeValue,'خانه','script source must never be translated');
assert.equal(input.getAttribute('placeholder'),'Search…');
nav.nodeValue='سفارش جدید';observerCallback([{type:'characterData',target:nav}]);
assert.equal(nav.nodeValue,'New order','existing text nodes must translate after app updates');
context.window.SMB_I18N.setLanguage('ar');
assert.equal(nav.nodeValue,'طلب جديد','language switching must use the original source string');
nav.nodeValue='ذخیره شد';observerCallback([{type:'characterData',target:nav}]);
assert.equal(nav.nodeValue,'تم الحفظ','updated text nodes must not reuse stale source text');
context.window.SMB_I18N.setLanguage('fa');
assert.equal(nav.nodeValue,'ذخیره شد');
input.setAttribute('placeholder','تلاش دوباره');observerCallback([{type:'attributes',target:input,attributeName:'placeholder'}]);
context.window.SMB_I18N.setLanguage('en');
assert.equal(input.getAttribute('placeholder'),'Try again','dynamic attribute changes must be translated');
console.log('PASS i18n runtime: language switching, dynamic text/attributes, stale-value handling and script safety');
