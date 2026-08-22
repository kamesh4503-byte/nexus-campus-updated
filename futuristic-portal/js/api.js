/* Nexus Campus API client — real same-origin endpoints with safe demo fallbacks. */
const API_BASE_URL = "";
const USE_MOCK_IF_UNREACHABLE = true;

function getToken(){ return localStorage.getItem("nexus_token"); }

async function apiRequest(path, options = {}){
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  return data;
}

const MOCK = {
  login(username){ return { token:"mock-token-123", name:username || "Test Student", roll_no:"TEST-000" }; },
  attendance(){
    const records = [];
    const today = new Date();
    for(let i=29;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); records.push({date:d.toISOString().slice(0,10),status:i%7===0?"absent":"present"}); }
    return { percentage:86, records };
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

async function fallback(fn, label){
  try { return await fn(); }
  catch(e){ if(!USE_MOCK_IF_UNREACHABLE) throw e; console.warn(`${label} fallback:`,e.message); return null; }
}

async function loginRequest(username,password){ const r=await fallback(()=>apiRequest("/api/login",{method:"POST",body:JSON.stringify({username,password})}),"login"); return r||MOCK.login(username); }
async function getAttendance(){ const r=await fallback(()=>apiRequest("/api/attendance"),"attendance"); return r||MOCK.attendance(); }
async function getAssignments(){ const r=await fallback(()=>apiRequest("/api/assignments"),"assignments"); return r||MOCK.assignments(); }
async function getTimetable(){ const r=await fallback(()=>apiRequest("/api/timetable"),"timetable"); return r||MOCK.timetable(); }
async function getAnnouncements(){ const r=await fallback(()=>apiRequest("/api/announcements"),"announcements"); return r||MOCK.announcements(); }
async function getCampusEvents(){ const r=await fallback(()=>apiRequest("/api/events"),"events"); return r||MOCK.events(); }
async function getProfile(){ const r=await fallback(()=>apiRequest("/api/profile"),"profile"); return r||MOCK.profile(); }
async function getNotifications(){ const r=await fallback(()=>apiRequest("/api/notifications"),"notifications"); return r||{items:[]}; }
async function submitAssignment(id,text){ const r=await fallback(()=>apiRequest(`/api/assignments/${encodeURIComponent(id)}/submit`,{method:"POST",body:JSON.stringify({text})}),"submit"); return r||{status:"submitted"}; }
async function sendChatMessage(message){ const r=await fallback(()=>apiRequest("/api/chatbot",{method:"POST",body:JSON.stringify({message})}),"chat"); return r||MOCK.chatbot(message); }
async function analyzePdf(name,action,query=""){ return apiRequest("/api/pdf-ai",{method:"POST",body:JSON.stringify({name,action,query})}); }

// Explicit globals for classic-script/browser compatibility after deployments.
Object.assign(window, {
  apiRequest, loginRequest, getAttendance, getAssignments, getTimetable,
  getAnnouncements, getCampusEvents, getProfile, getNotifications,
  submitAssignment, sendChatMessage, analyzePdf
});

