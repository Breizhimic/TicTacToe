/* =========================================================
   MAIN — Bootstrap + Confettis (canvas)
   ========================================================= */

const Confetti = (() => {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let running = false;
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const COLORS = [
    "#00d4ff", "#ff006e", "#10b981", "#f59e0b",
    "#ec4899", "#84cc16", "#a855f7", "#f43f5e"
  ];

  function spawn(n = 100) {
    const W = window.innerWidth;
    const cx = W / 2;
    for (let i = 0; i < n; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: window.innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 6,
        g: 0.35 + Math.random() * 0.15,
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: 120 + Math.random() * 60,
        shape: Math.random() < 0.5 ? "rect" : "circle"
      });
    }
    if (!running) loop();
  }

  function loop() {
    running = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (p.life > p.maxLife || p.y > window.innerHeight + 40) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function burst() { spawn(120); }

  return { burst };
})();

// ---------------- BOOT ----------------
document.addEventListener("DOMContentLoaded", () => {
  UI.init();

  // Initialise l'audio au premier interaction (politique des navigateurs)
  const unlock = () => {
    SoundFX.ensure();
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("click", unlock);
  document.addEventListener("touchstart", unlock);
  document.addEventListener("keydown", unlock);

  // Raccourcis clavier
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "n" || e.key === "N") {
      document.getElementById("btnNewGame").click();
    } else if (e.key === "u" || e.key === "U") {
      document.getElementById("btnUndo").click();
    } else if (e.key === "m" || e.key === "M") {
      document.getElementById("btnSound").click();
    }
  });
});
