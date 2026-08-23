/* Nexus Campus shared UI v3 — auth guard, viewport-safe sidebar, notifications, command palette and mini AI. */
function requireLogin(){
  if(!localStorage.getItem("nexus_token")){
    const next=encodeURIComponent(location.pathname.split("/").pop() || "dashboard.html");
    window.location.replace(`index.html?next=${next}`);
    return false;
  }
  return true;
}
function getStudentInfo(){ return {name:(localStorage.getItem("nexus_name")||"Student").trim()||"Student",roll_no:(localStorage.getItem("nexus_roll")||"—").trim()||"—"}; }
function logout(){ ["nexus_token","nexus_name","nexus_roll"].forEach(k=>localStorage.removeItem(k)); window.location.replace("index.html"); }
function nexusEscape(value){ const d=document.createElement("div"); d.textContent=String(value??""); return d.innerHTML; }

const NEXUS_ROUTES=[
  {href:"dashboard.html",label:"Dashboard",icon:"⌂",keywords:"home overview"},
  {href:"attendance.html",label:"Attendance",icon:"◉",keywords:"presence percentage absent"},
  {href:"assignments.html",label:"Assignments",icon:"✓",keywords:"tasks due submit"},
  {href:"timetable.html",label:"Timetable",icon:"▦",keywords:"schedule class periods"},
  {href:"calendar.html",label:"Smart Calendar",icon:"◇",keywords:"events exam reminders"},
  {href:"notes.html",label:"Notes & AI PDFs",icon:"▤",keywords:"pdf study summary quiz flashcards"},
  {href:"announcements.html",label:"Announcements",icon:"◈",keywords:"notice campus updates"},
  {href:"profile.html",label:"Profile",icon:"◎",keywords:"student id account department"},
  {href:"chatbot.html",label:"Nexus AI",icon:"✦",keywords:"assistant copilot ask ai"}
];

function renderSidebar(activePage){
  const sidebar=document.getElementById("sidebar");
  if(!sidebar) return;
  const {name,roll_no}=getStudentInfo();
  const navHtml=NEXUS_ROUTES.map(l=>`<a href="${l.href}" class="${activePage===l.href?"active":""}"><span class="nav-icon">${l.icon}</span><span>${nexusEscape(l.label)}</span></a>`).join("");
  sidebar.innerHTML=`
    <div class="sidebar-topbar"><div class="brand">NEXUS_CAMPUS</div><button class="theme-toggle-btn" type="button" title="Toggle theme" aria-label="Toggle theme"></button></div>
    <div class="live-clock"><span class="dot"></span><span id="live-clock-text">--:--:--</span><span class="system-online">SYSTEM ONLINE</span></div>
    <a href="profile.html" class="student-badge profile-shortcut" title="Open student profile"><b>${nexusEscape(name)}</b><span>Roll No: ${nexusEscape(roll_no)}</span></a>
    <nav class="nav" aria-label="Portal navigation"><div class="nav-pill"></div>${navHtml}</nav>
    <button class="logout-btn" type="button" id="nexus-logout">↩ Log out</button>`;

  sidebar.querySelector("#nexus-logout")?.addEventListener("click",logout);
  window.NexusTheme?.wireButton(sidebar.querySelector(".theme-toggle-btn"));

  const clockEl=sidebar.querySelector("#live-clock-text");
  const tick=()=>{ if(clockEl) clockEl.textContent=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}); };
  tick(); setInterval(tick,1000);

  const nav=sidebar.querySelector(".nav"), pill=sidebar.querySelector(".nav-pill"), activeLink=nav?.querySelector("a.active");
  const movePillTo=el=>{ if(!el||!pill)return; pill.style.top=el.offsetTop+"px"; pill.style.height=el.offsetHeight+"px"; pill.style.opacity="1"; };
  nav?.querySelectorAll("a").forEach(a=>{a.addEventListener("mouseenter",()=>movePillTo(a));a.addEventListener("mouseleave",()=>movePillTo(activeLink));});
  requestAnimationFrame(()=>{movePillTo(activeLink); activeLink?.scrollIntoView({block:"nearest"});});
  initNexusGlobalUI();
}

function initNexusGlobalUI(){
  if(document.getElementById("nexus-global-ui")) return;
  const wrap=document.createElement("div"); wrap.id="nexus-global-ui";
  wrap.innerHTML=`
    <div class="cursor-aura" id="cursor-aura"></div>
    <div class="nexus-top-tools">
      <button class="icon-action" id="command-open" type="button" title="Command palette (Ctrl+K)" aria-label="Open command palette">⌘<span class="tool-label">K</span></button>
      <button class="icon-action notification-btn" id="notification-open" type="button" title="Notifications" aria-label="Open notifications">♢<span class="notification-badge" id="notification-badge">0</span></button>
    </div>
    <div class="notification-panel glass-popover" id="notification-panel"><div class="popover-head"><div><span class="eyebrow">Live feed</span><b>Notifications</b></div><button class="mini-close" type="button" data-close="notification-panel">×</button></div><div id="notification-list"><p class="subtext">Loading…</p></div></div>
    <div class="command-overlay" id="command-overlay"><div class="command-box"><div class="command-search"><span>⌘</span><input id="command-input" placeholder="Search Nexus or type ‘ask recursion’…" autocomplete="off"><kbd>ESC</kbd></div><div class="command-results" id="command-results"></div><div class="command-footer">↑↓ navigate · Enter open · Ctrl/⌘ + K toggle</div></div></div>
    <button class="ai-orb" id="ai-orb" type="button" title="Open Nexus AI" aria-label="Open Nexus AI"><span class="orb-core">✦</span><span class="orb-ring r1"></span><span class="orb-ring r2"></span></button>
    <div class="mini-ai glass-popover" id="mini-ai"><div class="popover-head"><div><span class="eyebrow">Context copilot</span><b>Nexus AI</b></div><button class="mini-close" type="button" data-close="mini-ai">×</button></div><div class="mini-ai-log" id="mini-ai-log"><div class="mini-ai-msg bot">Ask about your schedule, assignments, attendance, or study topics.</div></div><form class="mini-ai-form" id="mini-ai-form"><input id="mini-ai-input" placeholder="Ask Nexus AI…" autocomplete="off"><button class="btn" type="submit">➜</button></form><a href="chatbot.html" class="mini-ai-full">Open full Copilot →</a></div>`;
  document.body.appendChild(wrap); document.body.classList.add("nexus-ready");

  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    const aura=document.getElementById("cursor-aura");
    if(aura) window.addEventListener("pointermove",e=>{aura.style.transform=`translate(${e.clientX-180}px, ${e.clientY-180}px)`;},{passive:true});
    document.querySelectorAll(".card").forEach(card=>{card.classList.add("holo-card");card.addEventListener("pointermove",e=>{const r=card.getBoundingClientRect();if(!r.width||!r.height)return;const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.setProperty("--rx",`${-y*2.4}deg`);card.style.setProperty("--ry",`${x*2.8}deg`);});card.addEventListener("pointerleave",()=>{card.style.setProperty("--rx","0deg");card.style.setProperty("--ry","0deg");});});
  }
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close)?.classList.remove("open")));
  document.getElementById("notification-open")?.addEventListener("click",()=>document.getElementById("notification-panel")?.classList.toggle("open"));
  document.getElementById("command-open")?.addEventListener("click",openCommandPalette);
  document.getElementById("ai-orb")?.addEventListener("click",()=>document.getElementById("mini-ai")?.classList.toggle("open"));
  document.getElementById("mini-ai-form")?.addEventListener("submit",sendMiniAI);
  loadGlobalNotifications(); setupCommandPalette();
}

async function loadGlobalNotifications(){
  const list=document.getElementById("notification-list"),badge=document.getElementById("notification-badge"); if(!list||!badge)return;
  try{const data=await getNotifications();const items=Array.isArray(data.items)?data.items:[];badge.textContent=String(items.length);badge.style.display=items.length?"inline-flex":"none";list.innerHTML=items.length?items.map(n=>`<div class="notification-item ${["info","important","danger","urgent"].includes(n.level)?n.level:"info"}"><span class="notification-dot"></span><div><b>${nexusEscape(n.title)}</b><p>${nexusEscape(n.text)}</p></div></div>`).join(""):`<p class="subtext">You're all caught up.</p>`;}catch(e){list.innerHTML=`<p class="subtext">Notification feed unavailable.</p>`;}
}

let commandIndex=0,filteredCommands=[];
function setupCommandPalette(){
  const overlay=document.getElementById("command-overlay"),input=document.getElementById("command-input");if(!overlay||!input)return;
  window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();overlay.classList.contains("open")?closeCommandPalette():openCommandPalette();}else if(e.key==="Escape"&&overlay.classList.contains("open"))closeCommandPalette();else if(overlay.classList.contains("open")&&e.key==="ArrowDown"){e.preventDefault();commandIndex=Math.min(Math.max(0,filteredCommands.length-1),commandIndex+1);renderCommandResults(input.value);}else if(overlay.classList.contains("open")&&e.key==="ArrowUp"){e.preventDefault();commandIndex=Math.max(0,commandIndex-1);renderCommandResults(input.value);}else if(overlay.classList.contains("open")&&e.key==="Enter"){e.preventDefault();executeCommand();}});
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeCommandPalette();}); input.addEventListener("input",()=>{commandIndex=0;renderCommandResults(input.value);}); renderCommandResults("");
}
function openCommandPalette(){const o=document.getElementById("command-overlay"),i=document.getElementById("command-input");if(!o||!i)return;o.classList.add("open");i.value="";commandIndex=0;renderCommandResults("");setTimeout(()=>i.focus(),30);}
function closeCommandPalette(){document.getElementById("command-overlay")?.classList.remove("open");}
function renderCommandResults(query){
  const q=(query||"").toLowerCase().trim();filteredCommands=NEXUS_ROUTES.filter(r=>!q||(`${r.label} ${r.keywords}`).toLowerCase().includes(q));
  if(q.startsWith("ask "))filteredCommands=[{href:`chatbot.html?q=${encodeURIComponent(query.slice(4))}`,label:`Ask Nexus AI: ${query.slice(4)}`,icon:"✦",keywords:""}];
  if(!filteredCommands.length&&q)filteredCommands=[{href:`chatbot.html?q=${encodeURIComponent(query)}`,label:`Ask Nexus AI about “${query}”`,icon:"✦",keywords:""}];
  commandIndex=Math.min(commandIndex,Math.max(0,filteredCommands.length-1));const results=document.getElementById("command-results");if(!results)return;
  results.innerHTML=filteredCommands.slice(0,8).map((r,i)=>`<button class="command-item ${i===commandIndex?"selected":""}" data-index="${i}" type="button"><span class="command-icon">${r.icon}</span><span>${nexusEscape(r.label)}</span><small>OPEN</small></button>`).join("");
  results.querySelectorAll(".command-item").forEach(btn=>btn.addEventListener("click",()=>{commandIndex=Number(btn.dataset.index);executeCommand();}));
}
function executeCommand(){const cmd=filteredCommands[commandIndex];if(cmd)window.location.href=cmd.href;}
async function sendMiniAI(e){e.preventDefault();const input=document.getElementById("mini-ai-input"),log=document.getElementById("mini-ai-log");const text=input?.value.trim();if(!text||!log)return;log.insertAdjacentHTML("beforeend",`<div class="mini-ai-msg user">${nexusEscape(text)}</div>`);input.value="";const thinking=document.createElement("div");thinking.className="mini-ai-msg bot thinking";thinking.textContent="Analyzing portal context…";log.appendChild(thinking);log.scrollTop=log.scrollHeight;try{const r=await sendChatMessage(text);thinking.textContent=r.reply||"No response received.";}catch(err){thinking.textContent=err.message||"I couldn't reach the Copilot service.";}log.scrollTop=log.scrollHeight;}

Object.assign(window,{requireLogin,getStudentInfo,logout,nexusEscape,renderSidebar,openCommandPalette,closeCommandPalette});
