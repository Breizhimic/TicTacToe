/* =========================================================
   IA — 3 niveaux de difficulté
   - easy   : aléatoire
   - medium : stratégie basique (gagne / bloque / centre / coin)
   - hard   : Minimax + alpha-beta pruning (imbattable en 3x3)
              Heuristique limitée en profondeur pour 4x4 / 5x5
   ========================================================= */

const AI = (() => {

  // --- Cases libres ---
  function emptyIndices(board) {
    const out = [];
    for (let i = 0; i < board.length; i++) if (board[i] === null) out.push(i);
    return out;
  }

  // --- Random ---
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Aléatoire pondéré : préfère centre puis coins ---
  function pickWithBias(board, size) {
    const free = emptyIndices(board);
    if (free.length === 0) return -1;

    const center = Math.floor(size * size / 2);
    if (size % 2 === 1 && board[center] === null) return center;

    const corners = [0, size - 1, size * (size - 1), size * size - 1].filter(i => board[i] === null);
    if (corners.length) return pickRandom(corners);

    return pickRandom(free);
  }

  // =========================================================
  // FACILE — totalement aléatoire
  // =========================================================
  function easyMove(board) {
    const free = emptyIndices(board);
    return free.length ? pickRandom(free) : -1;
  }

  // =========================================================
  // MOYEN — stratégie heuristique
  //   30 % chance jouer aléatoirement
  //   70 % :
  //     1. Gagner si possible
  //     2. Bloquer si le joueur peut gagner
  //     3. Jouer au centre
  //     4. Jouer un coin
  //     5. Sinon aléatoire
  // =========================================================
  function mediumMove(board, size, winLen, ai, human) {
    if (Math.random() < 0.30) return easyMove(board);

    // 1. Gagner
    const winning = findWinningMove(board, size, winLen, ai);
    if (winning !== -1) return winning;

    // 2. Bloquer
    const blocking = findWinningMove(board, size, winLen, human);
    if (blocking !== -1) return blocking;

    // 3. Centre
    const center = Math.floor(size * size / 2);
    if (size % 2 === 1 && board[center] === null) return center;

    // 4. Coin
    const corners = [0, size - 1, size * (size - 1), size * size - 1].filter(i => board[i] === null);
    if (corners.length) return pickRandom(corners);

    // 5. Random
    return easyMove(board);
  }

  // Trouve une case qui complète immédiatement une ligne pour `player`
  function findWinningMove(board, size, winLen, player) {
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue;
      board[i] = player;
      const w = checkWinner(board, size, winLen);
      board[i] = null;
      if (w && w.player === player) return i;
    }
    return -1;
  }

  // =========================================================
  // DIFFICILE — Minimax avec alpha-beta pruning
  // =========================================================

  // Pour 3x3 : minimax exhaustif (≈ 5500 nœuds, instant).
  // Pour 4x4 et 5x5 : minimax limité en profondeur + heuristique.
  function hardMove(board, size, winLen, ai, human) {
    // Coups gagnants/bloquants immédiats : court-circuit (gain de temps)
    const winning = findWinningMove(board, size, winLen, ai);
    if (winning !== -1) return winning;
    const blocking = findWinningMove(board, size, winLen, human);
    if (blocking !== -1) return blocking;

    // Premier coup d'une partie 3x3 : centre direct (gain de calcul)
    if (size === 3 && board.every(c => c === null)) {
      return Math.floor(size * size / 2);
    }

    // Profondeur max selon la taille de grille
    let maxDepth;
    if (size === 3) maxDepth = 9;        // exhaustif
    else if (size === 4) maxDepth = 5;
    else maxDepth = 3;                   // 5x5

    let bestScore = -Infinity;
    let bestMove = -1;
    const moves = orderedMoves(board, size);

    for (const i of moves) {
      board[i] = ai;
      const score = minimax(board, size, winLen, ai, human, 0, maxDepth, false, -Infinity, Infinity);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }

    return bestMove !== -1 ? bestMove : easyMove(board);
  }

  // Ordre des coups (centre > coins > reste) → améliore l'élagage alpha-beta
  function orderedMoves(board, size) {
    const free = emptyIndices(board);
    const center = Math.floor(size * size / 2);
    const cornerSet = new Set([0, size - 1, size * (size - 1), size * size - 1]);

    return free.sort((a, b) => priority(b) - priority(a));

    function priority(i) {
      if (size % 2 === 1 && i === center) return 3;
      if (cornerSet.has(i)) return 2;
      return 1;
    }
  }

  // Minimax récursif
  function minimax(board, size, winLen, ai, human, depth, maxDepth, isMax, alpha, beta) {
    const result = checkWinner(board, size, winLen);

    if (result) {
      if (result.player === ai)    return 100 - depth;
      if (result.player === human) return depth - 100;
    }

    const free = emptyIndices(board);
    if (free.length === 0) return 0;
    if (depth >= maxDepth) return heuristic(board, size, winLen, ai, human);

    if (isMax) {
      let best = -Infinity;
      for (const i of free) {
        board[i] = ai;
        const score = minimax(board, size, winLen, ai, human, depth + 1, maxDepth, false, alpha, beta);
        board[i] = null;
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // élagage
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of free) {
        board[i] = human;
        const score = minimax(board, size, winLen, ai, human, depth + 1, maxDepth, true, alpha, beta);
        board[i] = null;
        best = Math.min(best, score);
        beta = Math.min(beta, best);
        if (beta <= alpha) break; // élagage
      }
      return best;
    }
  }

  // Heuristique pour les grilles plus grandes : compte les "menaces" ouvertes
  function heuristic(board, size, winLen, ai, human) {
    const lines = getAllLines(size, winLen);
    let score = 0;
    for (const line of lines) {
      let aiCount = 0, humanCount = 0;
      for (const i of line) {
        if (board[i] === ai) aiCount++;
        else if (board[i] === human) humanCount++;
      }
      if (humanCount === 0 && aiCount > 0) score += Math.pow(10, aiCount);
      if (aiCount === 0 && humanCount > 0) score -= Math.pow(10, humanCount);
    }
    return score;
  }

  // =========================================================
  // VICTOIRE — détecte un alignement de winLen pour `size×size`
  //           Renvoie { player, line:[indices] } ou null
  // =========================================================
  function checkWinner(board, size, winLen) {
    const lines = getAllLines(size, winLen);
    for (const line of lines) {
      const first = board[line[0]];
      if (first === null) continue;
      let win = true;
      for (let k = 1; k < line.length; k++) {
        if (board[line[k]] !== first) { win = false; break; }
      }
      if (win) return { player: first, line };
    }
    return null;
  }

  // Toutes les lignes possibles de longueur winLen sur une grille size×size
  // Cache pour éviter de recalculer à chaque appel
  const linesCache = {};
  function getAllLines(size, winLen) {
    const key = `${size}_${winLen}`;
    if (linesCache[key]) return linesCache[key];
    const lines = [];
    const idx = (r, c) => r * size + c;

    // Horizontal
    for (let r = 0; r < size; r++)
      for (let c = 0; c <= size - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(idx(r, c + k));
        lines.push(line);
      }
    // Vertical
    for (let c = 0; c < size; c++)
      for (let r = 0; r <= size - winLen; r++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(idx(r + k, c));
        lines.push(line);
      }
    // Diag ↘
    for (let r = 0; r <= size - winLen; r++)
      for (let c = 0; c <= size - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(idx(r + k, c + k));
        lines.push(line);
      }
    // Diag ↙
    for (let r = 0; r <= size - winLen; r++)
      for (let c = winLen - 1; c < size; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(idx(r + k, c - k));
        lines.push(line);
      }

    linesCache[key] = lines;
    return lines;
  }

  // =========================================================
  // API publique
  // =========================================================
  function chooseMove(difficulty, board, size, winLen, ai, human) {
    switch (difficulty) {
      case "easy":   return easyMove(board);
      case "medium": return mediumMove(board, size, winLen, ai, human);
      case "hard":   return hardMove(board, size, winLen, ai, human);
      default:       return easyMove(board);
    }
  }

  return {
    chooseMove,
    checkWinner,
    getAllLines
  };
})();
