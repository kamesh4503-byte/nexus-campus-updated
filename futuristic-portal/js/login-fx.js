/* login-fx.js — animated particle network + typewriter tagline */
(function () {
  const canvas = document.getElementById("login-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  let mouse = { x: null, y: null };

  function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", () => { resize(); initParticles(); });
  window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener("mouseleave", () => { mouse.x = null; mouse.y = null; });

  function initParticles(){
    const count = Math.min(110, Math.floor((canvas.width * canvas.height) / 13000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.7 + 0.6,
      hue: Math.random() > 0.5 ? "cyan" : "magenta"
    }));
  }

  const cyan = [0, 229, 255];
  const magenta = [255, 62, 201];
  const purple = [139, 92, 246];

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      if (mouse.x !== null) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150) { p.x += dx * 0.003; p.y += dy * 0.003; }
      }
      const c = p.hue === "cyan" ? cyan : magenta;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.75)`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},0.8)`;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 130) {
          const t = 1 - dist / 130;
          const mix = (i + j) % 3 === 0 ? purple : (i % 2 === 0 ? cyan : magenta);
          ctx.strokeStyle = `rgba(${mix[0]},${mix[1]},${mix[2]},${t * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize(); initParticles(); draw();

  /* ---------- mouse parallax: grid, blobs, logo, 3D card tilt ---------- */
  const gridLayer = document.getElementById("login-grid-layer");
  const blobCyan = document.getElementById("blob-cyan");
  const blobMagenta = document.getElementById("blob-magenta");
  const logo = document.getElementById("login-logo");
  const card = document.querySelector(".login-card");

  let targetNX = 0, targetNY = 0;   // normalized mouse offset from center, -1..1
  let curNX = 0, curNY = 0;         // eased/lerped current values (smooth trailing)

  window.addEventListener("mousemove", (e) => {
    targetNX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetNY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener("mouseleave", () => { targetNX = 0; targetNY = 0; });
  // also respond to touch, so the effect isn't mouse-only
  window.addEventListener("touchmove", (e) => {
    if (!e.touches.length) return;
    const t = e.touches[0];
    targetNX = (t.clientX / window.innerWidth - 0.5) * 2;
    targetNY = (t.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const startTime = performance.now();

  function parallaxLoop(now) {
    // smooth trailing: current value eases toward target every frame
    curNX += (targetNX - curNX) * 0.06;
    curNY += (targetNY - curNY) * 0.06;

    if (gridLayer) {
      gridLayer.style.transform = `translate(${(curNX * 18).toFixed(1)}px, ${(curNY * 14).toFixed(1)}px)`;
    }
    if (blobCyan) {
      blobCyan.style.transform = `translate(${(curNX * 50).toFixed(1)}px, ${(curNY * 40).toFixed(1)}px)`;
    }
    if (blobMagenta) {
      blobMagenta.style.transform = `translate(${(curNX * -42).toFixed(1)}px, ${(curNY * -34).toFixed(1)}px)`;
    }
    if (logo) {
      logo.style.transform = `translate(${(curNX * 12).toFixed(1)}px, ${(curNY * 9).toFixed(1)}px)`;
    }
    if (card) {
      const elapsed = (now - startTime) / 1000;
      const idleFloat = Math.sin(elapsed * 0.9) * 5; // gentle continuous idle bob
      const rotX = (-curNY * 7).toFixed(2);
      const rotY = (curNX * 7).toFixed(2);
      card.style.transform = `translateY(${idleFloat.toFixed(1)}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    requestAnimationFrame(parallaxLoop);
  }
  requestAnimationFrame(parallaxLoop);

  // fade the card in once it's ready to be tilted (avoids fighting a separate entrance animation)
  if (card) requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));

  /* typewriter tagline */
  const phrases = [
    "Initializing student session…",
    "Syncing attendance matrix…",
    "Loading assignment queue…",
    "AI notes engine online.",
    "Ready when you are."
  ];
  const typedEl = document.getElementById("login-typed");
  if (typedEl) {
    const cursor = typedEl.querySelector(".login-cursor");
    let phraseIdx = 0, charIdx = 0, deleting = false;
    function loop(){
      const cur = phrases[phraseIdx];
      if (!deleting) {
        charIdx++;
        if (charIdx > cur.length) { deleting = true; setTimeout(loop, 1300); return; }
      } else {
        charIdx--;
        if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
      }
      typedEl.textContent = cur.slice(0, charIdx);
      typedEl.appendChild(cursor);
      setTimeout(loop, deleting ? 22 : 42);
    }
    loop();
  }
})();
