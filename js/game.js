/* =========================================================
   GAME — État de la partie + logique de jeu
   ========================================================= */

const Game = (() => {
  const PLAYERS = { X: "X", O: "O" };
  const MAX_MARKS = 3;   // mode glissant : max de marques par joueur

  const state = {
    size: 3,
    winLen: 3,
    board: [],
    currentPlayer: PLAYERS.X,
    mode: "ai",       // "ai" | "pvp" | "sliding"
    sliding: false,   // true quand mode === "sliding"
    difficulty: "medium",
    aiSymbol: PLAYERS.O,
    humanSymbol: PLAYERS.X,
    moves: [],        // historique des indices joués {index, player}
    marksByPlayer: { X: [], O: [] },  // ordre d'ancienneté par joueur
    finished: false,
    winner: null,
    locked: false,
    startedAt: null
  };

  const listeners = { onMove: [], onEnd: [], onTurn: [], onReset: [], onRemove: [] };
  function emit(event, ...args) { listeners[event].forEach(cb => cb(...args)); }
  function on(event, cb) { listeners[event].push(cb); }

  function reset({ size, mode, difficulty, startWith, sliding } = {}) {
    if (size)        state.size = size;
    if (mode)        state.mode = mode;
    if (difficulty)  state.difficulty = difficulty;
    if (sliding !== undefined) state.sliding = sliding;

    // Le mode glissant force la grille 3×3
    if (state.sliding) state.size = 3;

    state.winLen = state.size;
    state.board = new Array(state.size * state.size).fill(null);
    state.moves = [];
    state.marksByPlayer = { X: [], O: [] };
    state.finished = false;
    state.winner = null;
    state.locked = false;
    state.startedAt = Date.now();
    state.currentPlayer = startWith || PLAYERS.X;

    emit("onReset", getPublicState());
    emit("onTurn", state.currentPlayer);
  }

  function play(index, { byAI = false } = {}) {
    if (state.finished || state.locked) return false;
    if (index < 0 || index >= state.board.length) return false;
    if (state.board[index] !== null) return false;

    let removedIndex = null;

    // Mode glissant : si ce joueur a déjà MAX_MARKS marques, retirer la plus ancienne
    if (state.sliding) {
      const marks = state.marksByPlayer[state.currentPlayer];
      if (marks.length >= MAX_MARKS) {
        removedIndex = marks.shift();        // la plus ancienne
        state.board[removedIndex] = null;
        emit("onRemove", { index: removedIndex, player: state.currentPlayer });
      }
    }

    state.board[index] = state.currentPlayer;
    state.moves.push({ index, player: state.currentPlayer });
    if (state.sliding) state.marksByPlayer[state.currentPlayer].push(index);
    emit("onMove", { index, player: state.currentPlayer, byAI, removedIndex });

    // Vérifier victoire
    const result = AI.checkWinner(state.board, state.size, state.winLen);
    if (result) {
      state.finished = true;
      state.winner = result;
      emit("onEnd", { winner: result.player, line: result.line, draw: false });
      return true;
    }
    // Pas de nul possible en mode glissant (des cases se libèrent toujours)
    if (!state.sliding && state.board.every(c => c !== null)) {
      state.finished = true;
      emit("onEnd", { winner: null, line: null, draw: true });
      return true;
    }

    state.currentPlayer = state.currentPlayer === PLAYERS.X ? PLAYERS.O : PLAYERS.X;
    emit("onTurn", state.currentPlayer);
    return true;
  }

  function undo() {
    if (state.finished) return false;
    if (state.moves.length === 0) return false;

    function undoOne() {
      const last = state.moves.pop();
      state.board[last.index] = null;
      if (state.sliding) {
        const marks = state.marksByPlayer[last.player];
        const i = marks.lastIndexOf(last.index);
        if (i !== -1) marks.splice(i, 1);
      }
      return last;
    }

    if (state.mode === "ai") {
      // Annuler 2 coups : IA + joueur
      undoOne();
      if (state.moves.length > 0) undoOne();
      state.currentPlayer = state.humanSymbol;
    } else {
      const last = undoOne();
      state.currentPlayer = last.player;
    }
    emit("onReset", getPublicState());
    emit("onTurn", state.currentPlayer);
    return true;
  }

  function aiPlay(delay = 380) {
    if (state.mode !== "ai" || state.finished) return;
    if (state.currentPlayer !== state.aiSymbol) return;

    state.locked = true;
    setTimeout(() => {
      let move;
      if (state.sliding) {
        move = chooseSlidingMove(state.board.slice(), state.marksByPlayer, state.aiSymbol, state.humanSymbol, state.difficulty);
      } else {
        move = AI.chooseMove(state.difficulty, state.board.slice(), state.size, state.winLen, state.aiSymbol, state.humanSymbol);
      }
      state.locked = false;
      if (move !== -1 && !state.finished) play(move, { byAI: true });
    }, delay);
  }

  // Stratégie IA en mode glissant
  function chooseSlidingMove(board, marksByPlayer, ai, human, difficulty) {
    const free = [];
    for (let i = 0; i < board.length; i++) if (board[i] === null) free.push(i);

    // Simuler un coup et retourner le board résultant
    function simulate(b, marks, player, idx) {
      const nb = b.slice();
      const nm = { X: marks.X.slice(), O: marks.O.slice() };
      if (nm[player].length >= MAX_MARKS) {
        nb[nm[player][0]] = null;
        nm[player].shift();
      }
      nb[idx] = player;
      nm[player].push(idx);
      return { board: nb, marks: nm };
    }

    // 1. Essayer de gagner immédiatement
    for (const idx of free) {
      const { board: nb } = simulate(board, marksByPlayer, ai, idx);
      if (AI.checkWinner(nb, 3, 3)) return idx;
    }

    // 2. Bloquer si le joueur peut gagner
    const humanFree = [];
    for (let i = 0; i < board.length; i++) if (board[i] === null) humanFree.push(i);
    for (const idx of humanFree) {
      const { board: nb } = simulate(board, marksByPlayer, human, idx);
      if (AI.checkWinner(nb, 3, 3)) return idx;
    }

    // 3. Difficile : minimax simplifié (2 coups d'avance)
    if (difficulty === "hard") {
      let best = -Infinity, bestIdx = -1;
      for (const idx of free) {
        const { board: nb, marks: nm } = simulate(board, marksByPlayer, ai, idx);
        const score = slidingMinimax(nb, nm, human, ai, human, 3, false);
        if (score > best) { best = score; bestIdx = idx; }
      }
      if (bestIdx !== -1) return bestIdx;
    }

    // 4. Préférer le centre, puis les coins
    const order = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    for (const i of order) if (board[i] === null) return i;
    return free.length ? free[0] : -1;
  }

  function slidingMinimax(board, marks, currentPlayer, ai, human, depth, isMaximizing) {
    const result = AI.checkWinner(board, 3, 3);
    if (result) return result.player === ai ? 10 : -10;
    if (depth === 0) return 0;

    const free = [];
    for (let i = 0; i < board.length; i++) if (board[i] === null) free.push(i);

    function simulate(b, m, player, idx) {
      const nb = b.slice();
      const nm = { X: m.X.slice(), O: m.O.slice() };
      if (nm[player].length >= MAX_MARKS) { nb[nm[player][0]] = null; nm[player].shift(); }
      nb[idx] = player;
      nm[player].push(idx);
      return { board: nb, marks: nm };
    }

    if (isMaximizing) {
      let best = -Infinity;
      for (const idx of free) {
        const { board: nb, marks: nm } = simulate(board, marks, ai, idx);
        best = Math.max(best, slidingMinimax(nb, nm, human, ai, human, depth - 1, false));
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of free) {
        const { board: nb, marks: nm } = simulate(board, marks, human, idx);
        best = Math.min(best, slidingMinimax(nb, nm, ai, ai, human, depth - 1, true));
      }
      return best;
    }
  }

  function getPublicState() {
    return {
      size: state.size,
      winLen: state.winLen,
      board: state.board.slice(),
      currentPlayer: state.currentPlayer,
      mode: state.mode,
      sliding: state.sliding,
      difficulty: state.difficulty,
      aiSymbol: state.aiSymbol,
      humanSymbol: state.humanSymbol,
      moves: state.moves.slice(),
      marksByPlayer: { X: state.marksByPlayer.X.slice(), O: state.marksByPlayer.O.slice() },
      finished: state.finished,
      winner: state.winner,
      locked: state.locked
    };
  }

  function setMode(m)         { state.mode = m; }
  function setSliding(s)      { state.sliding = s; if (s) { state.size = 3; state.winLen = 3; } }
  function setDifficulty(d)   { state.difficulty = d; }
  function setSize(s)         { if (!state.sliding) { state.size = s; state.winLen = s; } }

  return {
    PLAYERS,
    MAX_MARKS,
    reset,
    play,
    undo,
    aiPlay,
    on,
    getPublicState,
    setMode,
    setSliding,
    setDifficulty,
    setSize
  };
})();