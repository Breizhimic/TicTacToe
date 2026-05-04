<<<<<<< HEAD
# ⭕ Morpion — Tic Tac Toe

Un jeu de Morpion moderne, immersif et 100 % responsive, en HTML / CSS / JavaScript pur (zéro dépendance, zéro framework).

Inspiré du style visuel du [Démineur](https://breizhimic.github.io/Demineur/) et du [Jeu de la Vie](https://breizhimic.github.io/JeuDeLaVie/).

---

## 🎮 Comment jouer ?

Ouvre `index.html` dans n'importe quel navigateur moderne. C'est tout. Aucune installation, aucun serveur requis.


### Règles
1. Le but : aligner X (ou O) sur une ligne, colonne ou diagonale.
2. Sur une grille 3×3, il faut 3 alignés. En 4×4, 4 alignés. En 5×5, 5 alignés.
3. Le premier qui aligne gagne. Si le plateau se remplit sans alignement, c'est un match nul.

---

## ✨ Features

### Gameplay
- 🎯 Mode **Joueur vs IA** avec 3 niveaux : Facile, Moyen, Difficile (Minimax imbattable en 3×3)
- 👥 Mode **Joueur vs Joueur** local
- 📐 Grilles **3×3, 4×4, 5×5**
- ↩️ **Annuler** le dernier coup
- 🏁 Détection auto des victoires + ligne gagnante animée
- 🔁 Bouton "Nouvelle partie" + modale de fin

### Présentation
- 🎨 **6 skins** : Classique, Néon, Minimaliste, Arcade, Nature, Emoji
- 🌗 **4 thèmes** de couleurs : Sombre, Clair, Cyber, Nature (comme dans Démineur)
- ✨ Animations fluides : pop d'apparition, pulse de victoire, ripple au clic
- 🎉 **Confettis** au moment de la victoire
- 🎵 **Sons synthétisés** via Web Audio API (aucun fichier audio externe)
- 📳 **Vibration** sur mobile

### Persistance & progression
- 💾 Tout sauvegardé en `localStorage` : stats, score, succès, settings, historique
- 📊 Statistiques détaillées : parties / victoires / défaites / nuls / taux / coups moyens
- 🔥 Compteur de **série gagnante** + meilleur record
- 🕘 **Historique** des 30 dernières parties
- 🏆 **10 succès** débloquables (Première victoire, 5/10 d'affilée, Battre l'IA difficile, etc.)
- 💡 Astuces aléatoires entre les parties

### UX
- 📱 **100 % responsive** (desktop / tablette / mobile)
- ⌨️ **Raccourcis clavier** : `N` = nouvelle partie, `U` = annuler, `M` = mute, `Échap` = fermer modale
- 🔇 Toggle son global + volume réglable
- 🚫 Toggle animations / confettis / vibrations dans les options
- 👤 Nom du joueur personnalisable

---

## 🧠 L'IA en détail

### Facile
Joue **aléatoirement** dans une case libre. Stratégie nulle, idéale pour débuter.

### Moyen
- 30 % du temps : coup aléatoire (pour rester accessible)
- 70 % du temps :
  1. Joue le coup gagnant si possible
  2. Bloque le joueur si nécessaire
  3. Sinon préfère le centre, puis un coin

### Difficile (Minimax + alpha-beta pruning)
Implémente **l'algorithme Minimax** avec élagage alpha-beta. Sur une grille 3×3, l'IA explore toutes les positions terminales possibles et choisit le coup qui maximise ses chances. En conséquence, elle est **mathématiquement imbattable** — au mieux on peut espérer un match nul.

Pour les grilles 4×4 et 5×5 (où l'arbre de recherche explose), Minimax est limité en profondeur (5 et 3 respectivement) et complété par une heuristique qui pondère les menaces ouvertes par `10^n` selon le nombre de pions alignés.

Optimisations :
- Court-circuit pour les coups gagnants/bloquants immédiats
- Tri des coups (centre > coins > reste) pour maximiser l'élagage alpha-beta
- Cache des "lignes possibles" par taille de grille
- Premier coup hardcodé sur le centre en 3×3

Résultat : l'IA répond en **moins de 50 ms** même en 5×5.

---

## 🗂️ Structure du projet

```
morpion/
├── index.html              # Structure
├── css/
│   ├── style.css           # Layout, cartes, plateau, modales, responsive
│   ├── skins.css           # Apparence des X/O selon le skin
│   └── themes.css          # Variables CSS pour les 4 thèmes de couleur
├── js/
│   ├── audio.js            # SoundFX — Web Audio API
│   ├── ai.js               # Algorithmes IA (random / strat / Minimax)
│   ├── game.js             # État + logique de partie
│   ├── ui.js               # Rendu, événements, modales, achievements
│   └── main.js             # Bootstrap + système de confettis canvas
└── README.md
```

Chaque module est une **IIFE** qui expose une API publique. Aucune variable globale polluante (sauf les modules eux-mêmes).

---

## 🛠️ Technologies

- **HTML5** — structure sémantique
- **CSS3** — Grid, Flexbox, variables CSS, backdrop-filter, animations
- **JavaScript Vanilla** — aucune dépendance, aucun bundler
- **Web Audio API** — sons synthétisés à la volée
- **LocalStorage** — persistance
- **Vibration API** — feedback haptique
- **Canvas 2D** — confettis

---

## ⌨️ Raccourcis clavier

| Touche | Action |
|--------|--------|
| `N` | Nouvelle partie |
| `U` | Annuler le dernier coup |
| `M` | Couper / activer le son |
| `Échap` | Fermer la modale active |

---

## 🏆 Liste des succès

| Icône | Nom | Condition |
|---|---|---|
| 🎉 | Première victoire | Gagner sa première partie |
| 🔥 | 5 d'affilée | 5 victoires consécutives |
| ⚡ | 10 d'affilée | 10 victoires consécutives |
| 🧠 | Battre l'IA difficile | Gagner contre l'IA en mode Difficile |
| 💯 | Vétéran | Jouer 100 parties |
| 🤝 | Maître du nul | Faire 10 matchs nuls |
| 📐 | Architecte | Gagner sur une grille 4×4 |
| 🏛️ | Grand stratège | Gagner sur une grille 5×5 |
| 🎨 | Collectionneur | Essayer les 6 skins |
| 💎 | Sans faute | Gagner en 3 coups (3×3, hors hard) |

---

## 🚧 Améliorations futures possibles

- [ ] Replay animé des parties depuis l'historique
- [ ] Mode "Entraînement" où l'IA suggère le meilleur coup
- [ ] Partage de victoire (image générée + lien)
- [ ] Option couleur personnalisée pour X/O
- [ ] Mode tournoi (best of 3 / 5)
- [ ] Plus de skins (papier, craie, espace…)
=======
# TicTacToe
https://breizhimic.github.io/TicTacToe/
>>>>>>> 985401f42f44f4f772f9f0ae7b89d94bf3ebea5e
