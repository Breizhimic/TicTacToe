/* =========================================================
   UI — Rendu, interactions, modales, achievements, confettis
   ========================================================= */

const UI = (() => {

  // ============ PERSISTANCE ============
  const STORAGE_KEY = "morpion.v1";
  const defaultStorage = () => ({
    settings: {
      sound: true,
      vibrate: true,
      anims: true,
      confetti: true,
      volume: 60,
      theme: "dark",
      skin: "classic",
      playerName: "Joueur"
    },
    stats: {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      bestStreak: 0,
      totalMoves: 0,
      hardWins: 0
    },
    scoreboard: { X: 0, O: 0, D: 0 },  // session-level scoreboard
    history: [],                        // [{ result:'W'|'L'|'D', mode, diff, size, moves, date }]
    achievements: {}                    // { id: true }
  });

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStorage();
      const parsed = JSON.parse(raw);
      // merge avec defaults pour éviter les clés manquantes
      const def = defaultStorage();
      return {
        settings:    { ...def.settings,    ...(parsed.settings    || {}) },
        stats:       { ...def.stats,       ...(parsed.stats       || {}) },
        scoreboard:  { ...def.scoreboard,  ...(parsed.scoreboard  || {}) },
        history:     parsed.history     || [],
        achievements: parsed.achievements || {}
      };
    } catch { return defaultStorage(); }
  }
  function saveStore() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
  }

  let store = loadStore();

  // ============ ÉLÉMENTS DOM ============
  const $ = id => document.getElementById(id);
  const els = {};

  // ============ ACHIEVEMENTS ============
  const ACHIEVEMENTS = [
    { id: "first_win",    icon: "🎉", title: "Première victoire",         desc: "Gagnez votre première partie." },
    { id: "streak_5",     icon: "🔥", title: "5 d'affilée",                desc: "Enchaînez 5 victoires consécutives." },
    { id: "streak_10",    icon: "⚡", title: "10 d'affilée",               desc: "Enchaînez 10 victoires consécutives." },
    { id: "beat_hard",    icon: "🧠", title: "Battre l'IA difficile",      desc: "Gagnez face à l'IA en difficulté Difficile." },
    { id: "play_100",     icon: "💯", title: "Vétéran",                    desc: "Jouez 100 parties." },
    { id: "draw_master",  icon: "🤝", title: "Maître du nul",              desc: "Faites 10 matchs nuls." },
    { id: "size_4",       icon: "📐", title: "Architecte",                 desc: "Gagnez sur une grille 4×4." },
    { id: "size_5",       icon: "🏛️", title: "Grand stratège",             desc: "Gagnez sur une grille 5×5." },
    { id: "skin_collect", icon: "🎨", title: "Collectionneur",             desc: "Essayez les 6 skins." },
    { id: "perfect",      icon: "💎", title: "Sans faute",                 desc: "Gagnez en 3 coups (3×3, IA difficile non valable)." }
  ];

  function unlock(id, extra = {}) {
    if (store.achievements[id]) return;
    store.achievements[id] = true;
    saveStore();
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) showToast(`🏆 Succès débloqué`, `${ach.icon} ${ach.title}`);
    SoundFX.achievement();
  }

  // ============ TIPS ============
  const TIPS = [
    "Le centre est la case la plus puissante du Morpion 3×3.",
    "En 3×3 contre une IA parfaite, le mieux qu'on puisse espérer est un match nul.",
    "Joue d'abord les coins pour créer plusieurs menaces simultanées.",
    "Une 'fourchette' = deux menaces de victoire en même temps. Surveille-les.",
    "Bloque toujours le coup gagnant adverse avant de penser à ton attaque.",
    "Sur une grille 5×5, garde le centre pour rayonner dans toutes les directions.",
    "Le Minimax explore tous les coups possibles : impossible de le piéger en 3×3 !",
    "En mode Joueur vs Joueur, attaque les diagonales : elles sont moins surveillées.",
    "Plus la grille est grande, plus le centre devient stratégique."
  ];

  function pickTip() {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  // ============ RENDERING DU PLATEAU ============
  function buildBoard(size) {
    const board = els.board;
    board.innerHTML = "";
    board.dataset.size = size;
    for (let i = 0; i < size * size; i++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.dataset.index = i;
      cell.setAttribute("aria-label", `Case ${i + 1}`);
      cell.type = "button";
      board.appendChild(cell);
    }
    bindBoardEvents();
  }

  function bindBoardEvents() {
    els.board.querySelectorAll(".cell").forEach(cell => {
      cell.addEventListener("click", onCellClick);
      cell.addEventListener("pointerdown", onCellPointer);
    });
  }

  function onCellPointer(e) {
    // Ripple effect (mobile + desktop)
    const cell = e.currentTarget;
    if (cell.classList.contains("filled") || cell.classList.contains("locked")) return;
    if (!store.settings.anims) return;
    const rect = cell.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top  = (e.clientY - rect.top  - size / 2) + "px";
    cell.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  function onCellClick(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    const s = Game.getPublicState();
    if (s.finished || s.locked) return;
    if (s.mode === "ai" && s.currentPlayer !== s.humanSymbol) return;

    SoundFX.ensure();
    const ok = Game.play(idx);
    if (ok && store.settings.vibrate && navigator.vibrate) navigator.vibrate(10);
  }

  // ============ RENDU D'UN COUP ============
  // mappings symboles ↔ skin
  const SKIN_SYMBOLS = {
    classic: { X: "✕", O: "◯" },
    neon:    { X: "✕", O: "◯" },
    minimal: { X: "×", O: "○" },
    arcade:  { X: "X", O: "O" },
    nature:  { X: "🌸", O: "🍃" },
    emoji:   { X: "😎", O: "🤖" }
  };

  function symbolFor(player) {
    const skin = store.settings.skin;
    return (SKIN_SYMBOLS[skin] || SKIN_SYMBOLS.classic)[player];
  }

  function renderMove({ index, player, byAI, removedIndex }) {
    const cell = els.board.querySelector(`.cell[data-index="${index}"]`);
    if (!cell) return;
    cell.classList.remove("next-to-go");
    cell.classList.add("filled", player.toLowerCase());
    const span = document.createElement("span");
    span.className = "mark";
    span.textContent = symbolFor(player);
    cell.appendChild(span);

    if (byAI) SoundFX.clickAI();
    else      SoundFX.clickPlayer();

    store.stats.totalMoves++;
    saveStore();
  }

  // Supprime visuellement une marque (mode glissant)
  function renderRemove({ index, player }) {
    const cell = els.board.querySelector(`.cell[data-index="${index}"]`);
    if (!cell) return;
    cell.classList.remove("filled", "x", "o", "next-to-go");
    cell.innerHTML = "";
  }

  // Surligne la prochaine marque qui va disparaître pour chaque joueur
  function updateNextToGo(marksByPlayer) {
    // Retirer tous les surlignages existants
    els.board.querySelectorAll(".next-to-go").forEach(c => c.classList.remove("next-to-go"));
    ["X","O"].forEach(player => {
      const marks = marksByPlayer[player];
      if (marks.length >= Game.MAX_MARKS) {
        const cell = els.board.querySelector(`.cell[data-index="${marks[0]}"]`);
        if (cell) cell.classList.add("next-to-go");
      }
    });
  }

  function renderTurn(player) {
    const s = Game.getPublicState();
    if (s.finished) return;

    els.turnDot.classList.toggle("is-o", player === Game.PLAYERS.O);

    let txt;
    if (s.mode === "ai") {
      txt = (player === s.humanSymbol)
        ? `À vous de jouer (${symbolFor(player)})`
        : `L'IA réfléchit…`;
    } else {
      txt = `Tour de ${player} (${symbolFor(player)})`;
    }
    els.statusText.textContent = txt;

    els.scoreX.parentElement.classList.toggle("active", player === Game.PLAYERS.X);
    els.scoreO.parentElement.classList.toggle("active", player === Game.PLAYERS.O);
  }

  // Efface le trait gagnant instantanément (sans transition)
  function resetWinline() {
    const seg = els.winlineSeg;
    seg.style.transition       = "none";
    seg.style.strokeDashoffset = "1000";
    seg.setAttribute("x1", 0); seg.setAttribute("y1", 0);
    seg.setAttribute("x2", 0); seg.setAttribute("y2", 0);
    els.winline.classList.remove("show");
    void seg.getBoundingClientRect();
    seg.style.transition = "";
  }

  function renderReset() {
    const s = Game.getPublicState();
    buildBoard(s.size);
    resetWinline();
    renderTurn(s.currentPlayer);
    refreshScoreboard();
    els.btnUndo.disabled = true;
  }

  // ============ FIN DE PARTIE ============
  function handleEnd({ winner, line, draw }) {
    const s = Game.getPublicState();

    // Marque la ligne gagnante
    if (line) {
      line.forEach(i => {
        const cell = els.board.querySelector(`.cell[data-index="${i}"]`);
        if (cell) cell.classList.add("win");
      });
      drawWinLine(line, s.size);
    }

    // Verrouille toutes les cases
    els.board.querySelectorAll(".cell:not(.filled)").forEach(c => c.classList.add("locked"));

    // MàJ stats / scoreboard
    store.stats.games++;
    let result;
    if (draw) {
      store.scoreboard.D++;
      store.stats.draws++;
      result = "D";
      SoundFX.draw();
    } else if (s.mode === "ai") {
      if (winner === s.humanSymbol) {
        store.scoreboard.X++;
        store.stats.wins++;
        store.stats.streak++;
        store.stats.bestStreak = Math.max(store.stats.bestStreak, store.stats.streak);
        if (s.difficulty === "hard") store.stats.hardWins++;
        result = "W";
        SoundFX.win();
        if (store.settings.confetti && store.settings.anims) Confetti.burst();
      } else {
        store.scoreboard.O++;
        store.stats.losses++;
        store.stats.streak = 0;
        result = "L";
        SoundFX.lose();
      }
    } else {
      // PvP
      if (winner === Game.PLAYERS.X) store.scoreboard.X++;
      else                            store.scoreboard.O++;
      result = winner === Game.PLAYERS.X ? "W" : "L";
      SoundFX.win();
      if (store.settings.confetti && store.settings.anims) Confetti.burst();
    }

    // Historique
    store.history.unshift({
      result,
      mode: s.mode,
      diff: s.difficulty,
      size: s.size,
      moves: s.moves.length,
      winner: winner || null,
      date: Date.now()
    });
    if (store.history.length > 30) store.history.length = 30;

    saveStore();

    // Achievements
    checkAchievements({ result, winner, draw, s });

    // Affichage
    refreshAll();
    showEndModal({ winner, draw, mode: s.mode });

    // Vibration
    if (store.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(result === "W" ? [40, 60, 40] : result === "L" ? 80 : 30);
    }
  }

  function checkAchievements({ result, winner, draw, s }) {
    if (result === "W") {
      if (store.stats.wins === 1) unlock("first_win");
      if (store.stats.streak >= 5) unlock("streak_5");
      if (store.stats.streak >= 10) unlock("streak_10");
      if (s.mode === "ai" && s.difficulty === "hard") unlock("beat_hard");
      if (s.size === 4) unlock("size_4");
      if (s.size === 5) unlock("size_5");
      // Sans faute : gagne en 3 coups joueur sur 3x3 (premier coup-3, soit 5 coups au total max moins un)
      if (s.size === 3 && s.mode === "ai" && s.difficulty !== "hard") {
        const myMoves = s.moves.filter(m => m.player === s.humanSymbol).length;
        if (myMoves === 3) unlock("perfect");
      }
    }
    if (store.stats.games >= 100) unlock("play_100");
    if (store.stats.draws >= 10)  unlock("draw_master");
  }

  function drawWinLine(line, size) {
    if (!line || line.length < 2) return;
    const first = line[0];
    const last  = line[line.length - 1];

    // Lire les centres réels des cellules dans le DOM (tient compte du padding et gap CSS)
    const svgRect = els.winline.getBoundingClientRect();
    function cellCenter(idx) {
      const r = els.board.querySelector(`.cell[data-index="${idx}"]`).getBoundingClientRect();
      return {
        x: ((r.left + r.width  / 2) - svgRect.left) / svgRect.width  * 100,
        y: ((r.top  + r.height / 2) - svgRect.top)  / svgRect.height * 100
      };
    }
    const p1 = cellCenter(first);
    const p2 = cellCenter(last);

    const seg = els.winlineSeg;
    // Placer le segment sans transition, dashoffset élevé (caché)
    seg.style.transition = "none";
    seg.setAttribute("x1", p1.x); seg.setAttribute("y1", p1.y);
    seg.setAttribute("x2", p2.x); seg.setAttribute("y2", p2.y);
    // Forcer reflow puis lancer la transition vers 0 (trait visible)
    void seg.getBoundingClientRect();
    seg.style.transition = "";
    seg.style.strokeDashoffset = "0";
    els.winline.classList.add("show");
  }

  // ============ MODALE FIN DE PARTIE ============
  function showEndModal({ winner, draw, mode }) {
    let emoji, title, sub;
    if (draw) {
      emoji = "🤝";
      title = "Match nul !";
      sub = "Personne ne l'emporte cette fois.";
    } else if (mode === "ai") {
      const s = Game.getPublicState();
      if (winner === s.humanSymbol) {
        emoji = "🎉";
        title = "Victoire !";
        sub = `Bien joué — vous avez battu l'IA (${labelDifficulty(s.difficulty)}).`;
      } else {
        emoji = "💀";
        title = "Défaite";
        sub = `L'IA (${labelDifficulty(s.difficulty)}) prend l'avantage. Revanche ?`;
      }
    } else {
      emoji = "🏆";
      title = `${winner} gagne !`;
      sub = `Belle partie. À toi la revanche ?`;
    }
    els.endEmoji.textContent = emoji;
    els.endTitle.textContent = title;
    els.endSub.textContent = sub;
    show(els.endModal);
  }

  function labelDifficulty(d) {
    return ({ easy: "Facile", medium: "Moyen", hard: "Difficile" })[d] || d;
  }

  // ============ MODALES GÉNÉRIQUES ============
  function show(modal) { modal.hidden = false; }
  function hide(modal) { modal.hidden = true; }

  function bindModals() {
    document.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", () => hide($(btn.dataset.close)));
    });
    [els.endModal, els.settingsModal, els.statsModal, els.achModal, els.historyModal].forEach(modal => {
      modal.addEventListener("click", e => { if (e.target === modal) hide(modal); });
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        [els.endModal, els.settingsModal, els.statsModal, els.achModal, els.historyModal].forEach(m => hide(m));
      }
    });
  }

  // ============ TOAST ============
  let toastTimer = null;
  function showToast(title, desc) {
    els.toast.hidden = false;
    els.toastTitle.textContent = title;
    els.toastDesc.textContent  = desc;
    requestAnimationFrame(() => els.toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
      setTimeout(() => { els.toast.hidden = true; }, 400);
    }, 3200);
  }

  // ============ REFRESH GLOBAL ============
  function refreshScoreboard() {
    const s = Game.getPublicState();
    els.scoreX.textContent = store.scoreboard.X;
    els.scoreO.textContent = store.scoreboard.O;
    els.scoreD.textContent = store.scoreboard.D;

    // labels selon mode
    if (s.mode === "ai") {
      els.labelX.textContent = (store.settings.playerName || "Joueur").toUpperCase();
      els.labelO.textContent = "IA";
    } else {
      els.labelX.textContent = "JOUEUR 1";
      els.labelO.textContent = "JOUEUR 2";
    }
  }

  function refreshStats() {
    const st = store.stats;
    const rate = st.games > 0 ? Math.round((st.wins / st.games) * 100) : 0;
    const avg  = st.games > 0 ? (st.totalMoves / st.games).toFixed(1) : "0";

    els.statGames.textContent  = st.games;
    els.statWins.textContent   = st.wins;
    els.statLosses.textContent = st.losses;
    els.statDraws.textContent  = st.draws;
    els.statRate.textContent   = `${rate}%`;

    els.streak.textContent     = st.streak;
    els.bestStreak.textContent = st.bestStreak;

    // modal stats
    els.mGames.textContent  = st.games;
    els.mWins.textContent   = st.wins;
    els.mLosses.textContent = st.losses;
    els.mDraws.textContent  = st.draws;
    els.mRate.textContent   = `${rate}%`;
    els.mAvg.textContent    = avg;
    els.mStreak.textContent = st.streak;
    els.mBest.textContent   = st.bestStreak;
  }

  function refreshHistory() {
    const list = store.history.slice(0, 5);
    els.historyList.innerHTML = "";
    if (list.length === 0) {
      els.historyList.innerHTML = `<li class="empty">Aucune partie jouée pour le moment.</li>`;
    } else {
      list.forEach(h => els.historyList.appendChild(renderHistoryItem(h)));
    }

    // modal complet
    els.historyListModal.innerHTML = "";
    if (store.history.length === 0) {
      els.historyListModal.innerHTML = `<li class="empty">Aucune partie jouée.</li>`;
    } else {
      store.history.forEach(h => els.historyListModal.appendChild(renderHistoryItem(h, true)));
    }
  }

  function renderHistoryItem(h, full = false) {
    const li = document.createElement("li");
    const tag = document.createElement("span");
    tag.className = `history-tag ${h.result}`;
    tag.textContent = h.result === "W" ? "VIC" : h.result === "L" ? "DÉF" : "NUL";

    const txt = document.createElement("span");
    const mode = h.mode === "ai" ? `vs IA (${labelDifficulty(h.diff)})` : "PvP";
    const date = new Date(h.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: full ? "short" : undefined });
    txt.textContent = `${mode} · ${h.size}×${h.size} · ${h.moves} coups · ${date}`;
    txt.style.flex = "1";

    li.append(tag, txt);
    return li;
  }

  function refreshAchievements() {
    els.achList.innerHTML = "";
    const unlocked = ACHIEVEMENTS.filter(a => store.achievements[a.id]).length;
    ACHIEVEMENTS.forEach(a => {
      const li = document.createElement("li");
      li.className = store.achievements[a.id] ? "unlocked" : "locked";
      li.innerHTML = `
        <span class="ach-icon">${a.icon}</span>
        <div class="ach-text">
          <strong>${a.title}</strong>
          <span>${a.desc}</span>
        </div>
        <span style="font-size:18px">${store.achievements[a.id] ? "✅" : "🔒"}</span>
      `;
      els.achList.appendChild(li);
    });
    // Petit header dynamique
    const header = $("achModal").querySelector(".modal-title");
    header.textContent = `🏆 Succès — ${unlocked}/${ACHIEVEMENTS.length}`;
  }

  function refreshAll() {
    refreshScoreboard();
    refreshStats();
    refreshHistory();
    refreshAchievements();
  }

  // ============ DIFFICULTY HINT ============
  function refreshDiffHint(diff) {
    const txt = ({
      easy:   "L'IA joue des coups aléatoires. Idéal pour débuter.",
      medium: "L'IA bloque vos coups gagnants et joue le centre.",
      hard:   "Algorithme Minimax — l'IA est imbattable en 3×3."
    })[diff];
    els.diffHint.textContent = txt;
  }

  // ============ APPLY SETTINGS ============
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    document.querySelectorAll(".theme-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.theme === theme);
    });
    store.settings.theme = theme;
    saveStore();
  }

  function applySkin(skin) {
    document.body.dataset.skin = skin;
    document.querySelectorAll(".skin-tile").forEach(b => {
      b.classList.toggle("active", b.dataset.skin === skin);
    });
    store.settings.skin = skin;

    // Track des skins essayés (achievement)
    store.tried = store.tried || {};
    store.tried[skin] = true;
    if (Object.keys(store.tried).length >= 6) unlock("skin_collect");

    saveStore();

    // Re-render des marques existantes
    document.querySelectorAll(".cell .mark").forEach(m => {
      const player = m.parentElement.classList.contains("x") ? "X" : "O";
      m.textContent = symbolFor(player);
    });
  }

  function applyAnimsClass() {
    document.body.classList.toggle("no-anims", !store.settings.anims);
  }

  function applySoundUI() {
    els.btnSound.textContent = store.settings.sound ? "🔊" : "🔇";
    els.btnSound.classList.toggle("muted", !store.settings.sound);
    SoundFX.setMuted(!store.settings.sound);
    SoundFX.setVolume(store.settings.volume / 100);
  }

  // ============ SETUP / BIND ============
  function cacheEls() {
    [
      "btnStats","btnHistory","btnAchievements","btnSound","btnSettings",
      "modeSeg","slidingSeg","diffSeg","sizeSeg","skinGrid","diffCard","diffHint","sizeCard","slidingHint",
      "scoreX","scoreO","scoreD","labelX","labelO",
      "status","statusText","turnDot",
      "board","winline","winlineSeg",
      "btnNewGame","btnUndo",
      "streak","bestStreak","streakBox",
      "statGames","statWins","statLosses","statDraws","statRate",
      "historyList","historyListModal","tip",
      "endModal","endEmoji","endTitle","endSub","endReplay","endClose",
      "settingsModal","setSound","setVolume","setVibrate","setAnims","setConfetti","setName","themeRow",
      "btnReset","statsModal","mGames","mWins","mLosses","mDraws","mRate","mAvg","mStreak","mBest","btnResetStats",
      "achModal","achList","historyModal","btnClearHistory",
      "toast","toastTitle","toastDesc"
    ].forEach(id => els[id] = $(id));
  }

  function bindControls() {
    // Mode (ai / pvp)
    els.modeSeg.querySelectorAll(".seg-btn").forEach(b => {
      b.addEventListener("click", () => {
        els.modeSeg.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        Game.setMode(b.dataset.mode);
        const s = Game.getPublicState();
        els.diffCard.style.display = b.dataset.mode === "ai" ? "" : "none";
        startNewGame();
      });
    });

    // Glissant toggle
    els.slidingSeg.querySelectorAll(".seg-btn").forEach(b => {
      b.addEventListener("click", () => {
        els.slidingSeg.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        const isSliding = b.dataset.sliding === "on";
        Game.setSliding(isSliding);
        els.sizeCard.style.display    = isSliding ? "none" : "";
        els.slidingHint.style.display = isSliding ? "" : "none";
        startNewGame();
      });
    });

    // Difficulté
    els.diffSeg.querySelectorAll(".seg-btn").forEach(b => {
      b.addEventListener("click", () => {
        els.diffSeg.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        const diff = b.dataset.diff;
        Game.setDifficulty(diff);
        refreshDiffHint(diff);
        startNewGame();
      });
    });

    // Taille
    els.sizeSeg.querySelectorAll(".seg-btn").forEach(b => {
      b.addEventListener("click", () => {
        els.sizeSeg.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        Game.setSize(parseInt(b.dataset.size, 10));
        startNewGame();
      });
    });

    // Skins
    els.skinGrid.querySelectorAll(".skin-tile").forEach(b => {
      b.addEventListener("click", () => {
        applySkin(b.dataset.skin);
        SoundFX.ui();
      });
    });

    // Topbar
    els.btnSound.addEventListener("click", () => {
      store.settings.sound = !store.settings.sound;
      saveStore();
      applySoundUI();
      els.setSound.checked = store.settings.sound;
    });
    els.btnSettings.addEventListener("click", () => show(els.settingsModal));
    els.btnStats.addEventListener("click",   () => { refreshStats(); show(els.statsModal); });
    els.btnAchievements.addEventListener("click", () => { refreshAchievements(); show(els.achModal); });
    els.btnHistory.addEventListener("click", () => { refreshHistory(); show(els.historyModal); });

    // Actions
    els.btnNewGame.addEventListener("click", () => { SoundFX.ui(); startNewGame(); });
    els.btnUndo.addEventListener("click", () => { SoundFX.ui(); Game.undo(); refreshFromState(); });

    // End modal
    els.endReplay.addEventListener("click", () => { hide(els.endModal); startNewGame(); });
    els.endClose.addEventListener("click", () => hide(els.endModal));

    // Settings
    els.setSound.addEventListener("change", () => {
      store.settings.sound = els.setSound.checked;
      saveStore(); applySoundUI();
    });
    els.setVolume.addEventListener("input", () => {
      store.settings.volume = parseInt(els.setVolume.value, 10);
      saveStore();
      SoundFX.setVolume(store.settings.volume / 100);
    });
    els.setVibrate.addEventListener("change", () => {
      store.settings.vibrate = els.setVibrate.checked;
      saveStore();
    });
    els.setAnims.addEventListener("change", () => {
      store.settings.anims = els.setAnims.checked;
      saveStore();
      applyAnimsClass();
    });
    els.setConfetti.addEventListener("change", () => {
      store.settings.confetti = els.setConfetti.checked;
      saveStore();
    });
    els.setName.addEventListener("input", () => {
      store.settings.playerName = els.setName.value.trim() || "Joueur";
      saveStore();
      refreshScoreboard();
    });
    els.themeRow.querySelectorAll(".theme-btn").forEach(b => {
      b.addEventListener("click", () => { applyTheme(b.dataset.theme); SoundFX.ui(); });
    });

    // Reset
    els.btnReset.addEventListener("click", () => resetAll());
    els.btnResetStats.addEventListener("click", () => resetAll());
    els.btnClearHistory.addEventListener("click", () => {
      if (!confirm("Effacer tout l'historique ?")) return;
      store.history = [];
      saveStore();
      refreshHistory();
    });
  }

  function refreshFromState() {
    const s = Game.getPublicState();
    buildBoard(s.size);
    s.moves.forEach(m => {
      const cell = els.board.querySelector(`.cell[data-index="${m.index}"]`);
      if (!cell) return;
      // En mode glissant, ne rendre que les cases encore occupées dans le board
      if (s.sliding && s.board[m.index] !== m.player) return;
      cell.classList.add("filled", m.player.toLowerCase());
      const span = document.createElement("span");
      span.className = "mark";
      span.textContent = symbolFor(m.player);
      cell.appendChild(span);
    });
    if (s.sliding) updateNextToGo(s.marksByPlayer);
    resetWinline();
    renderTurn(s.currentPlayer);
    els.btnUndo.disabled = s.moves.length === 0;
  }

  function startNewGame() {
    Game.reset();
    refreshAll();
    els.tip.textContent = pickTip();
    const s = Game.getPublicState();
    els.sizeCard.style.display    = s.sliding ? "none" : "";
    els.slidingHint.style.display = s.sliding ? "" : "none";
    els.diffCard.style.display    = s.mode === "ai" ? "" : "none";
    if (s.mode === "ai" && s.currentPlayer === s.aiSymbol) {
      Game.aiPlay();
    }
  }

  function resetAll() {
    if (!confirm("Réinitialiser toutes les statistiques et le scoreboard ?")) return;
    const fresh = defaultStorage();
    // On garde les settings courants
    fresh.settings = store.settings;
    fresh.achievements = {}; // reset achievements
    store = fresh;
    saveStore();
    refreshAll();
    showToast("✅ Réinitialisé", "Stats & succès remis à zéro.");
  }

  // ============ INIT ============
  function init() {
    cacheEls();
    bindModals();
    bindControls();

    // Applique les settings sauvegardés
    document.body.dataset.theme = store.settings.theme;
    document.body.dataset.skin  = store.settings.skin;
    applySkin(store.settings.skin);
    applyTheme(store.settings.theme);
    applyAnimsClass();

    // Form values
    els.setSound.checked    = store.settings.sound;
    els.setVibrate.checked  = store.settings.vibrate;
    els.setAnims.checked    = store.settings.anims;
    els.setConfetti.checked = store.settings.confetti;
    els.setVolume.value     = store.settings.volume;
    els.setName.value       = store.settings.playerName === "Joueur" ? "" : store.settings.playerName;

    // Active le bon skin tile
    document.querySelectorAll(".skin-tile").forEach(b => {
      b.classList.toggle("active", b.dataset.skin === store.settings.skin);
    });

    // Audio
    SoundFX.init();
    applySoundUI();

    // Game listeners
    Game.on("onReset",   refreshFromState);
    Game.on("onTurn",    player => {
      renderTurn(player);
      const s = Game.getPublicState();
      els.btnUndo.disabled = s.moves.length === 0 || s.finished;
      if (s.sliding) updateNextToGo(s.marksByPlayer);
      // L'IA joue
      if (s.mode === "ai" && player === s.aiSymbol && !s.finished) {
        Game.aiPlay();
      }
    });
    Game.on("onRemove",  payload => renderRemove(payload));
    Game.on("onMove",    payload => {
      renderMove(payload);
      const s = Game.getPublicState();
      els.btnUndo.disabled = s.moves.length === 0 || s.finished;
    });
    Game.on("onEnd",     handleEnd);

    // Premier jeu
    refreshDiffHint("medium");
    startNewGame();

    // Astuce initiale
    els.tip.textContent = pickTip();
  }

  return { init };
})();