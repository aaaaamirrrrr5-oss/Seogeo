/* Site Manager 4.1 — small, non-invasive interaction refinements. */
(function(){
  "use strict";
  if(typeof document==="undefined")return;
  const $=s=>document.querySelector(s);
  let pageObserver=null,lastPageTitle="";
  function enhanceMain(){
    const app=$("#app"),v=$("#v");if(!app||!v)return;
    app.removeAttribute("role");
    v.setAttribute("role","main");
    v.removeAttribute("aria-live");v.removeAttribute("aria-atomic");
    v.querySelectorAll(".ld").forEach(el=>{if(!el.hasAttribute("role"))el.setAttribute("role","status");el.setAttribute("aria-live","polite");if(el.getAttribute("aria-busy")!=="true")el.setAttribute("aria-busy","true")});
    v.querySelectorAll("input[type=search]").forEach(el=>el.setAttribute("enterkeyhint","search"));
    v.querySelectorAll("input,select,textarea").forEach(el=>{if(el.getAttribute("aria-label")||el.labels&&el.labels.length)return;const hint=el.getAttribute("placeholder");if(hint)el.setAttribute("aria-label",hint)});
    v.querySelectorAll("button").forEach(b=>{if(!b.getAttribute("aria-label")&&!b.textContent.trim()&&b.title)b.setAttribute("aria-label",b.title)});
  }
  function observe(){
    const app=$("#app");if(!app||pageObserver)return;
    pageObserver=new MutationObserver(()=>{enhanceMain();const h=$("#app .top h1");const title=h&&h.textContent.trim();if(title&&title!==lastPageTitle){const changed=!!lastPageTitle;lastPageTitle=title;try{document.title=title+" | مدیریت سایت"}catch(_){}if(changed&&h){h.setAttribute("tabindex","-1");try{h.focus({preventScroll:true})}catch(_){}}}});
    pageObserver.observe(app,{childList:true,subtree:true});enhanceMain();
  }
  function improveToasts(){
    if(typeof window.toast!=="function"||window.toast.__uxPro)return;
    const original=window.toast;
    const wrapped=function(message){
      const result=original.apply(this,arguments);
      const nodes=document.querySelectorAll(".toast");
      const node=nodes[nodes.length-1];if(node){node.setAttribute("role","status");node.setAttribute("aria-live","polite");node.setAttribute("aria-atomic","true");}
      return result;
    };
    wrapped.__uxPro=true;window.toast=wrapped;
  }
  function markCurrentTab(){
    const nav=$(".nav");if(!nav)return;
    nav.querySelectorAll("button").forEach(b=>{
      const active=b.classList.contains("on");
      if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    });
  }
  function boot(){observe();improveToasts();markCurrentTab();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  document.addEventListener("click",e=>{if(e.target.closest(".nav button"))requestAnimationFrame(markCurrentTab)});
  document.addEventListener("focusin",e=>{const el=e.target;if(el&&el.matches&&el.matches("input,select,textarea"))el.dataset.uxFocused="1"});
  if(typeof module!=="undefined"&&module.exports)module.exports={};
})();
