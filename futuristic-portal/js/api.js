/* Nexus Campus API client v3 — stable same-origin API with read-only demo fallbacks. */
const API_BASE_URL = "";
const USE_MOCK_IF_UNREACHABLE = true;
const API_TIMEOUT_MS = 12000;

function getToken(){ return localStorage.getItem("nexus_token"); }

async function apiRequest(path, options = {}){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT_MS);
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && options.body != null && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: options.signal || controller.signal });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : { detail: await res.text().catch(() => "") };
    if (!res.ok) throw new Error(data.error || data.detail || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("The server took too long to respond. Please retry.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

const MOCK = {
  attendance(){
    const records=[]; const today=new Date();
    for(let i=29;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); records.push({date:d.toISOString().slice(0,10),status:i%7===0?"absent":"present"}); }
    return {percentage:86,records};
  },
  assignments(){ return [
    {id:"a1",title:"C Programming — Looping Statements",subject:"C Programming",due_date:"2026-08-24",status:"pending"},
    {id:"a2",title:"Numerical Methods Worksheet",subject:"Mathematics",due_date:"2026-08-26",status:"pending"},
    {id:"a3",title:"English Communication Activity",subject:"English",due_date:"2026-08-28",status:"pending"}
  ]; },
  timetable(){ return {days:["Mon","Tue","Wed","Thu","Fri"],periods:["9:00","10:00","11:00","12:00","2:00","3:00"],grid:[["C Programming","Mathematics","English","Lunch","Linux Lab","Tamil"],["Mathematics","C Programming","Tamil","Lunch","English","Lab"],["English","Tamil","C Programming","Lunch","Mathematics","Lab"],["Linux Lab","English","Mathematics","Lunch","C Programming","Tamil"],["Lab","Lab","Tamil","Lunch","C Programming","Mathematics"]]}; },
  announcements(){ return [{id:"n1",title:"Welcome to Nexus Campus",body:"Campus announcements will appear here.",level:"info",date:"2026-08-22"}]; },
  events(){ return [{id:"e1",title:"AI Hackathon",date:"2026-08-29",time:"16:00",type:"event",location:"Campus Lab Block"}]; },
  profile(){ return {name:localStorage.getItem("nexus_name")||"Test Student",roll_no:localStorage.getItem("nexus_roll")||"TEST-000",department:"B.Sc. Computer Science",semester:"Semester 1",section:"A",email:"student@nexus.local",phone:"",bio:"Building skills one class at a time.",avatar:"N"}; },
  chatbot(message){
    const low=(message||"").toLowerCase();
    if(low.includes("recursion")) return {reply:"Recursion is when a function calls itself with a smaller version of the same problem. It needs a base case to stop."};
    if(low.includes("attendance")) return {reply:"Your demo attendance is 86%, currently above the 75% requirement."};
    return {reply:"Nexus AI demo mode is active. Ask about attendance, assignments, timetable, announcements, or a study topic."};
  }
};

async function readFallback(fn, fallbackFactory, label){
  try { return await fn(); }
  catch(e){
    if(!USE_MOCK_IF_UNREACHABLE) throw e;
    console.warn(`${label} fallback:`, e.message);
    return fallbackFactory();
  }
}

async function getAttendance(){ return readFallback(()=>apiRequest("/api/attendance"), MOCK.attendance, "attendance"); }
async function getAssignments(){ return readFallback(()=>apiRequest("/api/assignments"), MOCK.assignments, "assignments"); }
async function getTimetable(){ return readFallback(()=>apiRequest("/api/timetable"), MOCK.timetable, "timetable"); }
async function getAnnouncements(){ return readFallback(()=>apiRequest("/api/announcements"), MOCK.announcements, "announcements"); }
async function getCampusEvents(){ return readFallback(()=>apiRequest("/api/events"), MOCK.events, "events"); }
async function getProfile(){ return readFallback(()=>apiRequest("/api/profile"), MOCK.profile, "profile"); }
async function getNotifications(){ return readFallback(()=>apiRequest("/api/notifications"), ()=>({items:[]}), "notifications"); }
async function sendChatMessage(message){ return readFallback(()=>apiRequest("/api/chatbot",{method:"POST",body:JSON.stringify({message})}), ()=>MOCK.chatbot(message), "chat"); }

/* Mutations must NEVER pretend to succeed if the backend is unavailable. */
async function submitAssignment(id,text){ return apiRequest(`/api/assignments/${encodeURIComponent(id)}/submit`,{method:"POST",body:JSON.stringify({text})}); }
async function analyzePdf(name,action,query=""){ return apiRequest("/api/pdf-ai",{method:"POST",body:JSON.stringify({name,action,query})}); }

Object.assign(window,{apiRequest,getAttendance,getAssignments,getTimetable,getAnnouncements,getCampusEvents,getProfile,getNotifications,submitAssignment,sendChatMessage,analyzePdf});
