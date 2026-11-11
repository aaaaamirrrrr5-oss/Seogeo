/* Site Manager — دسترس‌پذیری کامل v3.13.6 (صفحه‌خوان، کیبورد، فوکوس، دیالوگ‌ها). */
(function(){
  "use strict";
  if(typeof document==="undefined")return;
  const ICONS={"✕":"بستن","×":"بستن","›":"بازگشت","‹":"بازگشت","⟳":"بارگذاری مجدد","＋":"افزودن","+":"افزودن","☰":"منو","🗑":"حذف","🗑️":"حذف","✎":"ویرایش","✏️":"ویرایش","↑":"بالا","↓":"پایین","⬆":"بالا","⬇":"پایین","⋮":"گزینه‌های بیشتر","👁":"نمایش/پنهان"};
  const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let uid=0,lastFocus=null,frame=0;
  const txt=el=>(el.textContent||"").replace(/\s+/g," ").trim();

  function labelControls(root){
    root.querySelectorAll("label").forEach(l=>{
      if(l.htmlFor||l.querySelector("input,select,textarea"))return;
      let c=l.nextElementSibling;
      while(c&&!/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName)&&!(c.querySelector&&c.querySelector("input,select,textarea"))){
        if(c.tagName==="LABEL"||!c.nextElementSibling){c=null;break}c=c.nextElementSibling;
      }
      if(c&&!/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName))c=c.querySelector("input,select,textarea");
      if(!c||c.type==="hidden")return;
      if(!c.id)c.id="a11y_"+(++uid);
      if(!l.id)l.id=c.id+"_l";
      l.htmlFor=c.id;
    });
    root.querySelectorAll("input,select,textarea").forEach(c=>{
      if(c.type==="hidden"||c.getAttribute("aria-label")||c.getAttribute("aria-labelledby")||c.closest("label"))return;
      if(c.id&&root.querySelector('label[for="'+CSS.escape(c.id)+'"]'))return;
      const t=c.getAttribute("placeholder")||c.getAttribute("title");
      if(t)c.setAttribute("aria-label",t);
    });
  }

  function nameButtons(root){
    root.querySelectorAll("button,a.b,[role=button]").forEach(b=>{
      if(b.getAttribute("aria-label")||b.getAttribute("aria-labelledby"))return;
      const t=txt(b);
      if(b.classList.contains("back")){b.setAttribute("aria-label","بازگشت");return}
      if(b.classList.contains("av")){b.setAttribute("aria-label","تغییر سایت، سایت فعلی: "+t.replace(/▾/g,"").trim());return}
      if(ICONS[t])b.setAttribute("aria-label",ICONS[t]);
      else if(!/[\p{L}\p{N}]/u.test(t)&&t)b.setAttribute("aria-label",b.title||"دکمه");
    });
    root.querySelectorAll("button i,button .ic,.tile .ic").forEach(i=>i.setAttribute("aria-hidden","true"));
  }

  function makeClickable(root){
    root.querySelectorAll("[onclick]").forEach(el=>{
      if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY)$/.test(el.tagName))return;
      if(el.closest(".sheet")&&el.classList.contains("sheet"))return;
      if(!el.hasAttribute("role"))el.setAttribute("role","button");
      if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","0");
    });
    root.querySelectorAll(".ld").forEach(e=>e.setAttribute("aria-busy","true"));
  }

  function dialogs(){
    const sh=document.getElementById("sh");
    if(!sh||sh.dataset.a11y)return;
    sh.dataset.a11y="1";
    const box=sh.firstElementChild||sh;
    box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");
    const h=box.querySelector("h1,h2,h3,b");
    if(h){if(!h.id)h.id="a11y_h"+(++uid);box.setAttribute("aria-labelledby",h.id)}else box.setAttribute("aria-label","پنجرهٔ گفتگو");
    lastFocus=document.activeElement;
    box.setAttribute("tabindex","-1");
    const f=box.querySelector(FOCUSABLE);(f||box).focus({preventScroll:true});
  }

  function enhance(){frame=0;const app=document.getElementById("app")||document.body;
    app.setAttribute("role","main");
    labelControls(document);nameButtons(document);makeClickable(document);dialogs();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(enhance)}

  document.addEventListener("keydown",e=>{
    const sh=document.getElementById("sh");
    if(e.key==="Escape"&&sh){e.preventDefault();if(typeof closeSheet==="function")closeSheet();else sh.remove();return}
    if(e.key==="Tab"&&sh){
      const f=[...sh.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null);
      if(!f.length)return;
      const a=document.activeElement,first=f[0],last=f[f.length-1];
      if(!sh.contains(a)){e.preventDefault();first.focus()}
      else if(e.shiftKey&&a===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
      return;
    }
    if((e.key==="Enter"||e.key===" ")&&e.target&&e.target.getAttribute&&e.target.getAttribute("role")==="button"&&!/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){
      e.preventDefault();e.target.click();
    }
  });
  new MutationObserver(m=>{
    if(!document.getElementById("sh")&&lastFocus){const f=lastFocus;lastFocus=null;if(document.contains(f))try{f.focus({preventScroll:true})}catch(_){}}
    schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
})();
