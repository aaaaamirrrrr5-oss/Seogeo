/* Site Manager — accessible motion controller v3.13.5. */
(function(){
  "use strict";
  if(typeof document==="undefined"||typeof window==="undefined")return;
  const reduce=()=>window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets=".hero,.bento>.tile,.hub>.tile,.wp-card,.qa-b,.cd,.sc,.wp-hero";
  let frame=0;
  function animateView(){
    const host=document.getElementById("v");if(!host||reduce())return;
    let i=0;host.querySelectorAll(targets).forEach(el=>{
      if(el.closest(".sheet"))return;
      el.classList.remove("sm-enter");el.style.setProperty("--sm-delay",Math.min(i++,7)*42+"ms");
      void el.offsetWidth;el.classList.add("sm-enter");
    });
  }
  function schedule(){if(frame)return;frame=window.requestAnimationFrame(()=>{frame=0;animateView()})}
  function bind(){
    const host=document.getElementById("v");if(!host)return;
    new MutationObserver(records=>{if(records.some(r=>Array.prototype.some.call(r.addedNodes||[],n=>n.nodeType===1&&!(n.classList&&n.classList.contains("sm-ripple-wave")))))schedule()}).observe(host,{childList:true,subtree:true});
    schedule();
  }
  function ripple(event){
    if(reduce()||event.button!==0)return;
    const el=event.target.closest("button,.tile,.qa-b,.wp-card,.sc");
    if(!el||el.disabled||el.closest(".sheet"))return;
    const rect=el.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*1.35,wave=document.createElement("span");
    wave.className="sm-ripple-wave";wave.style.width=wave.style.height=size+"px";
    wave.style.left=(event.clientX-rect.left-size/2)+"px";wave.style.top=(event.clientY-rect.top-size/2)+"px";
    el.classList.add("sm-ripple");el.appendChild(wave);wave.addEventListener("animationend",()=>wave.remove(),{once:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
  document.addEventListener("click",ripple,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});
  window.addEventListener("resize",schedule,{passive:true});
  /* Keep the persisted "system" theme in sync when Android appearance changes. */
  if(window.matchMedia){
    const colorScheme=window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme=()=>{
      if(typeof uiPrefs!=="undefined"&&uiPrefs&&uiPrefs.theme==="system"&&typeof applyUiPrefs==="function")applyUiPrefs();
    };
    if(colorScheme.addEventListener)colorScheme.addEventListener("change",syncSystemTheme);
    else if(colorScheme.addListener)colorScheme.addListener(syncSystemTheme);
  }
})();
