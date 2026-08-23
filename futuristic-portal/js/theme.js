/* Nexus Campus theme v3 — resilient dark/light toggle. */
(function(){
  const KEY="nexus_theme";
  const safeGet=()=>{try{return localStorage.getItem(KEY);}catch{return null;}};
  const safeSet=v=>{try{localStorage.setItem(KEY,v);}catch{}};
  function apply(theme){document.documentElement.setAttribute("data-theme",theme==="light"?"light":"dark");}
  apply(safeGet()||"dark");
  window.NexusTheme={
    toggle(){const next=this.current()==="light"?"dark":"light";apply(next);safeSet(next);return next;},
    current(){return document.documentElement.getAttribute("data-theme")==="light"?"light":"dark";},
    wireButton(btn){if(!btn||btn.dataset.themeWired)return;btn.dataset.themeWired="true";const setIcon=()=>{btn.textContent=this.current()==="light"?"🌙":"☀️";btn.setAttribute("aria-label",this.current()==="light"?"Switch to dark theme":"Switch to light theme");};setIcon();btn.addEventListener("click",()=>{this.toggle();setIcon();});}
  };
})();
