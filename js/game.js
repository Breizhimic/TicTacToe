/* =========================================================
   GAME — État de la partie + logique de jeu
   ========================================================= */

const Game = (() => {
  const PLAYERS = { X: "X", O: "O" };

  const state = {
    size: 3,
    winLen: 3,        // 3 alignés (3x3), 4 (4x4), 5 (5x5)
    board: [],        // tableau de "X" | "O" | null
    currentPlayer: PLAYERS.X,
    mode: "ai",       // "ai" | "pvp"
    difficulty: "medium",
    aiSymbol: PLAYERS.O,
    humanSymbol: PLAYERS.X,
    moves: [],        // historique des indices joués
    finished: false,
    winner: null,     // { player, line } | null
    locked: false,    // vrai pendant que l'IA réfléchit
    startedAt: null
  };

  // Listeners : { onMove, onEnd, onTurn, onReset }
  const listeners = { onMove: [], onEnd: [], onTurn: [], onReset: [] };
  function emit(event, ...args) { listeners[event].forEach(cb => cb(...args)); }
  function on(event, cb) { listeners[event].push(cb); }

  // ---- Réinitialise le tableau ----
  function reset({ size, mode, difficulty, startWith } = {}) {
    if (size)        state.size = size;
    if (mode)        state.mode = mode;
    if (difficulty)  state.difficulty = difficulty;

    state.winLen = state.size; // 3-en-ligne pour 3x3, 4 pour 4x4, etc.
    state.board = new Array(state.size * state.size).fill(null);
    state.moves = [];
    state.finished = false;
    state.winner = null;
    state.locked = false;
    state.startedAt = Date.now();
    state.currentPlayer = startWith || PLAYERS.X;

    emit("onReset", getPublicState());
    emit("onTurn", state.currentPlayer);
  }

  // ---- Joue un coup ----
  // Retourne true si le coup est valide
  function play(index, { byAI = false } = {}) {
    if (state.finished || state.locked) return false;
    if (index < 0 || index >= state.board.length) return false;
    if (state.board[index] !== null) return false;

    state.board[index] = state.currentPlayer;
    state.moves.push({ index, player: state.currentPlayer });
    emit("onMove", { index, player: state.currentPlayer, byAI });

    // Vérifier fin de partie
    const result = AI.checkWinner(state.board, state.size, state.winLen);
    if (result) {
      state.finished = true;
      state.winner = result;
      emit("onEnd", { winner: result.player, line: result.line, draw: false });
      return true;
    }
    if (state.board.every(c => c !== null)) {
      state.finished = true;
      emit("onEnd", { winner: null, line: null, draw: true });
      return true;
    }

    // Changer de tour
    state.currentPlayer = state.currentPlayer === PLAYERS.X ? PLAYERS.O : PLAYERS.X;
    emit("onTurn", state.currentPlayer);

    return true;
  }

  // ---- Annuler le dernier coup (mode PvP ou avant le coup IA) ----
  function undo() {
    if (state.finished) return false;
    if (state.moves.length === 0) return false;

    if (state.mode === "ai") {
      // En mode IA on annule 2 coups (IA + joueur) si possible
      const last = state.moves.pop();
      state.board[last.index] = null;
      if (state.moves.length > 0) {
        const prev = state.moves.pop();
        state.board[prev.index] = null;
      }
      state.currentPlayer = state.humanSymbol;
    } else {
      const last = state.moves.pop();
      state.board[last.index] = null;
      state.currentPlayer = last.player;
    }
    emit("onReset", getPublicState());
    emit("onTurn", state.currentPlayer);
    return true;
  }

  // ---- L'IA joue ----
  function aiPlay(delay = 380) {
    if (state.mode !== "ai" || state.finished) return;
    if (state.currentPlayer !== state.aiSymbol) return;

    state.locked = true;
    setTimeout(() => {
      const move = AI.chooseMove(
        state.difficulty,
        state.board.slice(),       // copie pour l'IA
        state.size,
        state.winLen,
        state.aiSymbol,
        state.humanSymbol
      );
      state.locked = false;
      if (move !== -1 && !state.finished) {
        play(move, { byAI: true });
      }
    }, delay);
  }

  // ---- État public (lecture) ----
  function getPublicState() {
    return {
      size: state.size,
      winLen: state.winLen,
      board: state.board.slice(),
      currentPlayer: state.currentPlayer,
      mode: state.mode,
      difficulty: state.difficulty,
      aiSymbol: state.aiSymbol,
      humanSymbol: state.humanSymbol,
      moves: state.moves.slice(),
      finished: state.finished,
      winner: state.winner,
      locked: state.locked
    };
  }

  // ---- Setters ----
  function setMode(m)         { state.mode = m; }
  function setDifficulty(d)   { state.difficulty = d; }
  function setSize(s)         { state.size = s; state.winLen = s; }

  return {
    PLAYERS,
    reset,
    play,
    undo,
    aiPlay,
    on,
    getPublicState,
    setMode,
    setDifficulty,
    setSize
  };
})();
