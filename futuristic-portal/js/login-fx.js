/* Nexus Campus login effects v3 — decorative only; never controls form visibility. */
(function(){
  const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const canvas=document.getElementById("login-canvas");
  if(canvas && !reduce){
    const ctx=canvas.getContext("2d");
    if(ctx){
      let particles=[],mouse={x:null,y:null},raf=0;
      const cyan=[0,229,255],magenta=[255,62,201],purple=[139,92,246];
      function resize(){canvas.width=Math.max(1,window.innerWidth);canvas.height=Math.max(1,window.innerHeight);initParticles();}
      function initParticles(){const count=Math.min(90,Math.floor((canvas.width*canvas.height)/15000));particles=Array.from({length:count},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.5+.5,hue:Math.random()>.5?"cyan":"magenta"}));}
      function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);for(const p of particles){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>canvas.width)p.vx*=-1;if(p.y<0||p.y>canvas.height)p.vy*=-1;if(mouse.x!==null){const dx=mouse.x-p.x,dy=mouse.y-p.y,dist=Math.hypot(dx,dy);if(dist<150){p.x+=dx*.0025;p.y+=dy*.0025;}}const c=p.hue==="cyan"?cyan:magenta;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},.72)`;ctx.shadowBlur=6;ctx.shadowColor=`rgba(${c[0]},${c[1]},${c[2]},.75)`;ctx.fill();}ctx.shadowBlur=0;for(let i=0;i<particles.length;i++){for(let j=i+1;j<particles.length;j++){const a=particles[i],b=particles[j],dist=Math.hypot(a.x-b.x,a.y-b.y);if(dist<125){const t=1-dist/125,mix=(i+j)%3===0?purple:(i%2===0?cyan:magenta);ctx.strokeStyle=`rgba(${mix[0]},${mix[1]},${mix[2]},${t*.32})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}raf=requestAnimationFrame(draw);}
      resize(); draw();
      window.addEventListener("resize",resize,{passive:true});window.addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY;},{passive:true});window.addEventListener("mouseleave",()=>{mouse.x=null;mouse.y=null;});
    }
  }

  const grid=document.getElementById("login-grid-layer"),cyanBlob=document.getElementById("blob-cyan"),magentaBlob=document.getElementById("blob-magenta"),logo=document.getElementById("login-logo"),card=document.querySelector(".login-card");
  card?.classList.add("is-visible");
  if(!reduce && (grid||cyanBlob||magentaBlob||logo||card)){
    let tx=0,ty=0,cx=0,cy=0;const start=performance.now();
    window.addEventListener("pointermove",e=>{tx=(e.clientX/window.innerWidth-.5)*2;ty=(e.clientY/window.innerHeight-.5)*2;},{passive:true});
    window.addEventListener("pointerleave",()=>{tx=0;ty=0;});
    function loop(now){cx+=(tx-cx)*.06;cy+=(ty-cy)*.06;if(grid)grid.style.transform=`translate(${(cx*18).toFixed(1)}px,${(cy*14).toFixed(1)}px)`;if(cyanBlob)cyanBlob.style.transform=`translate(${(cx*50).toFixed(1)}px,${(cy*40).toFixed(1)}px)`;if(magentaBlob)magentaBlob.style.transform=`translate(${(cx*-42).toFixed(1)}px,${(cy*-34).toFixed(1)}px)`;if(logo)logo.style.transform=`translate(${(cx*12).toFixed(1)}px,${(cy*9).toFixed(1)}px)`;if(card){const idle=Math.sin((now-start)/1000*.9)*3;card.style.transform=`translateY(${idle.toFixed(1)}px) rotateX(${(-cy*4).toFixed(2)}deg) rotateY(${(cx*4).toFixed(2)}deg)`;}requestAnimationFrame(loop);}requestAnimationFrame(loop);
  }

  const typed=document.getElementById("login-typed");
  if(typed){const phrases=["Initializing student session…","Syncing attendance matrix…","Loading assignment queue…","AI notes engine online.","Ready when you are."];const cursor=typed.querySelector(".login-cursor")||document.createElement("span");cursor.className="login-cursor";let pi=0,ci=0,del=false;function typeLoop(){const cur=phrases[pi];ci+=del?-1:1;if(!del&&ci>=cur.length){ci=cur.length;del=true;setTimeout(typeLoop,1200);return;}if(del&&ci<=0){ci=0;del=false;pi=(pi+1)%phrases.length;}typed.textContent=cur.slice(0,ci);typed.appendChild(cursor);setTimeout(typeLoop,del?24:44);}if(reduce){typed.textContent="Ready when you are.";}else typeLoop();}
})();
