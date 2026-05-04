/* =========================================================
   AUDIO — Génère les sons via Web Audio API
   Aucun fichier externe nécessaire (sons synthétisés)
   ========================================================= */

const SoundFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let volume = 0.6;

  function init() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn("AudioContext non supporté :", e);
    }
  }

  function ensure() {
    if (!ctx) init();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function setMuted(v) {
    muted = !!v;
    if (masterGain) masterGain.gain.value = muted ? 0 : volume;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain && !muted) masterGain.gain.value = volume;
  }

  // --- Helper : tone synthétisé ---
  function tone({ freq = 440, type = "sine", dur = 0.15, attack = 0.005, release = 0.1, vol = 0.4, freqEnd = null }) {
    if (!ctx || muted) return;
    ensure();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    }
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(gain).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.05);
  }

  // --- Sons du jeu ---
  function clickPlayer() {
    // Click cyan/positif (joueur)
    tone({ freq: 720, freqEnd: 920, type: "triangle", dur: 0.06, vol: 0.35 });
  }

  function clickAI() {
    // Click rose/grave (IA)
    tone({ freq: 380, freqEnd: 280, type: "triangle", dur: 0.08, vol: 0.32 });
  }

  function win() {
    // Petite mélodie victorieuse C-E-G-C
    [
      [523.25, 0],
      [659.25, 0.10],
      [783.99, 0.20],
      [1046.5, 0.30]
    ].forEach(([f, t]) => setTimeout(() => tone({ freq: f, type: "sine", dur: 0.18, vol: 0.4 }), t * 1000));
  }

  function lose() {
    // Descente triste
    [
      [440, 0],
      [349.23, 0.12],
      [261.63, 0.24]
    ].forEach(([f, t]) => setTimeout(() => tone({ freq: f, type: "sawtooth", dur: 0.22, vol: 0.28 }), t * 1000));
  }

  function draw() {
    // Deux tons neutres
    tone({ freq: 440, type: "square", dur: 0.12, vol: 0.22 });
    setTimeout(() => tone({ freq: 440, type: "square", dur: 0.18, vol: 0.22 }), 130);
  }

  function achievement() {
    // Petit ding ascendant
    [
      [880, 0],
      [1175, 0.08]
    ].forEach(([f, t]) => setTimeout(() => tone({ freq: f, type: "sine", dur: 0.18, vol: 0.35 }), t * 1000));
  }

  function ui() {
    tone({ freq: 600, type: "sine", dur: 0.04, vol: 0.18 });
  }

  return {
    init,
    ensure,
    setMuted,
    setVolume,
    isMuted: () => muted,
    clickPlayer,
    clickAI,
    win,
    lose,
    draw,
    achievement,
    ui
  };
})();
