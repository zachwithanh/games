const letterScores = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 11, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 9, Y: 4, Z: 11
};

const letterFrequencies = {
  A: 27, B: 6, C: 6, D: 12, E: 39, F: 6, G: 9, H: 6, I: 27,
  J: 3, K: 3, L: 9, M: 6, N: 18, O: 24, P: 6, Q: 3, R: 18,
  S: 18, T: 18, U: 12, V: 3, W: 6, X: 3, Y: 6, Z: 3
};

// ———————————————————————————————————————————
//  returns ALL valid words in a hand, ASC sorted by score
// ———————————————————————————————————————————
function getScoredWords(hand, river = []) {
  const found = [];
  const pool = hand.concat(river);
  const sourceFlags = pool.map((_, i) => i < hand.length ? 'hand' : 'river');

  const combine = (k, start = 0, combo = [], idxs = []) => {
    if (combo.length === k) {
      const word = combo.join('').toUpperCase();
      if (validWords.has(word)) {
        const score = combo.reduce((s, l) => s + (letterScores[l] || 0), 0);
        const handIndices = idxs.filter(i => sourceFlags[i] === 'hand');
        const riverIndices = idxs.filter(i => sourceFlags[i] === 'river').map(i => i - hand.length);
        found.push({ word, score, handIndices, riverIndices });
      }
      return;
    }
    for (let i = start; i < pool.length; i++) {
      combo.push(pool[i]);
      idxs.push(i);
      combine(k, i + 1, combo, idxs);
      combo.pop();
      idxs.pop();
    }
  };

  for (let len = pool.length; len >= 3; len--) combine(len);
  found.sort((a, b) => (b.score + b.word.length * 2) - (a.score + a.word.length * 2));
  return found;
}


// --- Setup ---
let deck = [], river = [], playerHand = [], computerHand = [], clickedOrder = [];
let turnPhase = 'draw';
let round = 1;

let playerOperators = [];
let computerOperators = [];
let playerUsedOperator = null;
let lastPlayerWord = "";
let lastComputerWord = "";
let computerUsedOperator = null;





let playerHasDrawn = false;




// --- Rendering ---

function createCard(letter, points, index, source = "hand") {
  const card = document.createElement("div");
  card.classList.add("card");

  // Rainbow style
  const rainbowIndex = index % 7;
  card.classList.add(`rainbow-${rainbowIndex}`);

  // Add content structure
  card.innerHTML = `
    <div class="letter">${letter}</div>
    <div class="points">${points}</div>
  `;

  // Add necessary data attributes
  card.dataset.letter = letter;
  card.dataset.points = points;
  card.dataset.index = index;
  card.dataset.source = source;

  return card;
}



function renderHand(hand, elementId, faceDown = false) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";
  hand.forEach((letter, index) => {
    const points = letterScores[letter] || 0;
    const cardEl = createCard(letter, points, index, faceDown ? "deck" : "hand");
    container.appendChild(cardEl);
  });
}






function renderRiver() {
  const riverDiv = document.getElementById('river');
  riverDiv.innerHTML = '';

  if (river.length === 0) {
    riverDiv.textContent = 'River Cards Appear Here';
    return;
  }

  river.forEach((letter, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    card.style.cursor = 'pointer'; // 👈 makes cursor a glove
    card.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <span class="letter" style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); font-size: 91px; text-align: center;">${letter}</span>
        <span class="points" style="position: absolute; bottom: 3px; right: 5px; font-size: 10px;">${letterScores[letter]}</span>
      </div>`;
    riverDiv.appendChild(card);
  });
}

function renderOperators(operators, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  operators.forEach(op => {
    const span = document.createElement("span");
    span.textContent = op;
    span.classList.add("operator-tile");
    span.onclick = () => {
      const isPostTurn = (turnPhase === 'post-player-attack' || turnPhase === 'post-computer-attack');
      if ((turnPhase === 'play' || turnPhase === 'discard' || isPostTurn) && playerOperators.includes(op)) {
        if (playerUsedOperator === op) {
          playerUsedOperator = null;
          span.classList.remove('selected');
        } else {
          playerUsedOperator = op;
          document.querySelectorAll(".operator-tile").forEach(t => t.classList.remove("selected"));
          span.classList.add("selected");
        }
      }
    };
    container.appendChild(span);
  });
}



function enableOperatorSelection() {
  const tiles = document.querySelectorAll("#player-operators .operator-tile");

  const isPostTurn = (turnPhase === 'post-player-attack' || turnPhase === 'post-computer-attack');

  tiles.forEach(tile => {
    tile.onclick = () => {
      const op = tile.textContent;

      // 🔁 Select/deselect operator during any valid turn phase
      if ((turnPhase === 'play' || turnPhase === 'discard' || isPostTurn) && playerOperators.includes(op)) {
        if (playerUsedOperator === op) {
          // Deselect if clicked again
          playerUsedOperator = null;
          tile.classList.remove('selected');
        } else {
          // Select new operator
          playerUsedOperator = op;
          tiles.forEach(t => t.classList.remove('selected'));
          tile.classList.add('selected');
        }
      }
    };
  });
}






function renderPlayedWord(word, targetId, rainbow = false) {
  const wordDiv = document.createElement('div');
  wordDiv.className = 'played-word';

  [...word].forEach((letter, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    if (rainbow) card.classList.add(`rainbow-${idx % 7}`);
    card.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <span class="letter" style="position: absolute; top: 5px; left: 0; right: 0; text-align: center;">${letter}</span>
        <span class="points" style="position: absolute; bottom: 3px; right: 5px; font-size: 10px;">${letterScores[letter]}</span>
      </div>`;
    wordDiv.appendChild(card);
  });

  document.getElementById(targetId).appendChild(wordDiv);
}

function drawCardToHand(hand, isPlayer = true) {
  if (deck.length === 0) return;

  const drawn = deck.pop();
  const operators = ["+", "-", "×", "÷", "!", "&", "%"];

  if (operators.includes(drawn)) {
    if (isPlayer) {
      playerOperators.push(drawn);
renderOperators(playerOperators, "player-operators");


    } else {
      computerOperators.push(drawn);
      renderOperators(computerOperators, "computer-operators");
    }
    drawCardToHand(hand, isPlayer); // try again
  } else {
    hand.push(drawn);
    const id = isPlayer ? 'player-hand' : 'computer-hand';
    renderHand(hand, id, !isPlayer); // 🧠 render the hand
  }
}



function drawUntilFull(hand, isPlayer = true) {
  // 🎲 25% chance to draw a math operator tile
  if (Math.random() < 0.25) {
    const operators = ["+", "-", "×", "÷", "!", "&", "%"];
    const op = operators[Math.floor(Math.random() * operators.length)];
    if (isPlayer) {
      playerOperators.push(op);
      renderOperators(playerOperators, "player-operators");

    } else {
      computerOperators.push(op);
      renderOperators(computerOperators, "computer-operators");
    }
  }


  while (hand.length < 7) {
    // First, try pulling a high-value letter from the river if any
    if (river.length > 0) {
      // Define a simple "value" for each letter
      const best = river.reduce((best, l, i) => {
        const score = letterScores[l] || 0;
        return score > best.score ? { letter: l, index: i, score } : best;
      }, { score: -1 });

      // If the best river letter is decent, take it
      if (best.score >= 2) {
        hand.push(river.splice(best.index, 1)[0]);
        continue;
      }
    }

    // Otherwise draw from deck
    if (deck.length > 0) {
      drawCardToHand(hand, isPlayer);
    } else {
      break;
    }
  console.log((isPlayer ? "Player" : "Computer") + " drew:", [...hand]);
  }

  const containerId = isPlayer ? 'player-hand' : 'computer-hand';
  renderHand(hand, containerId);
  if (isPlayer) enableCardSelection();
}


function enableCardSelection() {
  const container = document.getElementById('player-hand');
  const cards = container.querySelectorAll('.card');

  // 🧼 Clear previously stored click order
  clickedOrder = [];

  // 🧠 Add listener to each card
  cards.forEach((card) => {
    card.onclick = () => {
      if (turnPhase !== 'play' && turnPhase !== 'discard') return;

      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        card.classList.forEach(cls => {
          if (cls.startsWith('rainbow-')) card.classList.remove(cls);
        });
        clickedOrder = clickedOrder.filter(c => c !== card);
      } else {
        card.classList.add('selected');
        clickedOrder.push(card);
        const idx = clickedOrder.length - 1;
        card.classList.add(`rainbow-${idx % 7}`);
      }
    };
  });
}

document.addEventListener('keydown', (e) => {
  // 🟩 Typing to select cards (play or discard)
  if (/^[a-zA-Z]$/.test(e.key) && (turnPhase === 'play' || turnPhase === 'discard')) {
    const key = e.key.toUpperCase();
    const handDiv = document.getElementById('player-hand');
    const cards = [...handDiv.querySelectorAll('.card')];

    for (let card of cards) {
      const letter = card.querySelector('.letter')?.textContent;
      if (letter === key && !card.classList.contains('selected')) {
        card.classList.add('selected');
        clickedOrder.push(card);
        const idx = clickedOrder.length - 1;
        card.classList.add(`rainbow-${idx % 7}`);
        break;
// 🔢 Keyboard operator selection
const operatorKeys = ["+", "-", "*", "/", "!", "&", "%"];
if (turnPhase === "play" && operatorKeys.includes(e.key)) {
  const map = { "*": "×", "/": "÷" };
  const symbol = map[e.key] || e.key;
  if (playerOperators.includes(symbol)) {
    playerUsedOperator = symbol;
    document.querySelectorAll(".operator-tile").forEach(t => t.classList.remove("selected"));
    const selected = [...document.querySelectorAll("#player-operators .operator-tile")]
      .find(t => t.textContent === symbol);
    if (selected) selected.classList.add("selected");
  }
}

      }
    }
  }

// 🟨 Enter to play, discard, or attack
if (e.key === 'Enter') {
  if (turnPhase === 'play') {
    document.getElementById('play-button').click();
  } else if (turnPhase === 'discard') {
    document.getElementById('discard-button').click();
  } else if ((turnPhase === 'post-player-attack' || turnPhase === 'post-computer-attack')) {
    const selectedOpTile = document.querySelector('.operator-tile.selected');
    if (selectedOpTile) {
      const op = selectedOpTile.textContent;
      if (playerOperators.includes(op)) {
        applyOperatorToOpponent(op);
        selectedOpTile.classList.remove('selected');
        playerUsedOperator = null;
      }
    } else {
      alert("Select an operator tile first.");
    }
  }
}



  // 🟥 Backspace/Delete to deselect last card
  if ((e.key === 'Backspace' || e.key === 'Delete') &&
      (turnPhase === 'play' || turnPhase === 'discard')) {
    const lastCard = clickedOrder.pop();
    if (lastCard) {
      lastCard.classList.remove('selected');
      lastCard.classList.forEach(cls => {
        if (cls.startsWith('rainbow-')) lastCard.classList.remove(cls);
      });
    }
  }
});




// --- Interactions ---
document.getElementById('deck').onclick = () => {
  if (turnPhase !== 'draw' && turnPhase !== 'post-computer-attack' && turnPhase !== 'post-player-attack') return;

turnPhase = 'play';  // 👈 ensures consistent transition

  if (deck.length === 0) return alert("Deck is empty!");

  drawCardToHand(playerHand, true);

  renderHand(playerHand, 'player-hand');
  enableCardSelection();
  document.getElementById('sfx-deck')?.play();
  turnPhase = 'play';
};

document.getElementById('river').onclick = (e) => {
  if (turnPhase !== 'draw' && turnPhase !== 'post-computer-attack' && turnPhase !== 'post-player-attack') return;

turnPhase = 'play';  // 👈 ensures consistent transition



  const card = e.target.closest('.card');
  if (!card) return;

  const index = parseInt(card.dataset.index);
  const letter = river.splice(index, 1)[0];
  playerHand.push(letter);
  renderHand(playerHand, 'player-hand');
  renderRiver();
  enableCardSelection();
  document.getElementById('sfx-river')?.play();
  turnPhase = 'play';
};

document.getElementById('play-button').onclick = () => {
  if (turnPhase !== 'play') return;

  const word = clickedOrder.map(card =>
    card.querySelector('.letter').textContent
  ).join('').toUpperCase();

  if (word.length < 3) return alert("Word must be at least 3 letters.");
  if (!validWords.has(word)) {
    clickedOrder.forEach(card => {
      card.style.animation = "shake 0.5s";
      card.addEventListener("animationend", () => card.style.animation = "", { once: true });
    });
    return;
  }

  const indexesToRemove = clickedOrder.map(card => parseInt(card.dataset.index)).sort((a, b) => b - a);
  indexesToRemove.forEach(i => playerHand.splice(i, 1));

  const wordDiv = document.createElement('div');
  wordDiv.className = 'played-word';
  for (let letter of word) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <span class="letter" style="position: absolute; top: 5px; left: 0; right: 0; text-align: center;">${letter}</span>
        <span class="points" style="position: absolute; bottom: 3px; right: 5px; font-size: 10px;">${letterScores[letter]}</span>
      </div>`;
    wordDiv.appendChild(card);
  }

  document.getElementById('player-words').appendChild(wordDiv);

  let score = 0;
for (let letter of word) score += letterScores[letter] || 0;

// --- Operator bonus (if selected)
let operatorMultiplier = 1;
let bonusText = "";

if (playerOperators.length > 0) {
  const selectedOp = playerUsedOperator;

if (selectedOp && playerOperators.includes(selectedOp)) {
  switch (selectedOp) {
    case "+": score += 5; bonusText = "+5 points!"; break;
    case "-": score = Math.max(0, score - 5); bonusText = "-5 points!"; break;
    case "×": score *= 2; bonusText = "Score doubled!"; break;
    case "÷": score = Math.floor(score / 2); bonusText = "Score halved!"; break;
    case "!": score *= word.length; bonusText = "Score × word length!"; break;
    case "%": score = Math.floor(score * 0.75); bonusText = "Only 75% of base score!"; break;
    case "&": score += 10; bonusText = "Co-op bonus!"; break;
  }

  // Remove the used operator
  playerOperators.splice(playerOperators.indexOf(selectedOp), 1);
  renderOperators(playerOperators, "player-operators");
  

  // Show message
  const msg = document.createElement("div");
  msg.textContent = bonusText;
  msg.className = "bonus-text";
  document.getElementById("player-words").appendChild(msg);
  setTimeout(() => msg.remove(), 1500);

  // Clear selected operator
  playerUsedOperator = null;
}

  if (selectedOp && playerOperators.includes(selectedOp)) {
    switch (selectedOp) {
      case "+":
        score += 5;
        bonusText = "+5 points!";
        break;
      case "-":
        score = Math.max(0, score - 5);
        bonusText = "-5 points!";
        break;
      case "×":
        score *= 2;
        bonusText = "Score doubled!";
        break;
      case "÷":
        score = Math.floor(score / 2);
        bonusText = "Score halved!";
        break;
      case "!":
        score *= word.length;
        bonusText = "Score × word length!";
        break;
      case "%":
        score = Math.floor(score * 0.75);
        bonusText = "Only 75% of base score!";
        break;
      case "&":
        score += 10;
        bonusText = "Co-op bonus!";
        break;
    }

    // Remove the used operator
    playerOperators.splice(playerOperators.indexOf(selectedOp), 1);
    renderOperators(playerOperators, "player-operators");

    // Show a temporary bonus message
    const msg = document.createElement("div");
    msg.textContent = bonusText;
    msg.className = "bonus-text";
    document.getElementById("player-words").appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
  }
}

  const scoreSpan = document.getElementById('player-score');
  scoreSpan.textContent = parseInt(scoreSpan.textContent) + score;
updateLemon(+scoreSpan.textContent, 'player');

if (+scoreSpan.textContent >= WIN_SCORE) {
  lemonConfetti();
  showBanner("YOU WIN!");
}

// Apply player operator if used
if (playerUsedOperator) {
  if (playerUsedOperator === "+") score += 5;
  else if (playerUsedOperator === "-") score -= 3;
  else if (playerUsedOperator === "×") score *= 2;
  else if (playerUsedOperator === "÷") score = Math.floor(score / 2);
  else if (playerUsedOperator === "!") score *= word.length;
  else if (playerUsedOperator === "&") score += 10; // Shared bonus concept
  else if (playerUsedOperator === "%") score = Math.floor(score * 0.5);
  playerUsedOperator = null; // Reset after use
  renderOperators(playerOperators, "player-operators"); // Update display
}

// Save last word
lastPlayerWord = word;

  clickedOrder = [];
  renderHand(playerHand, 'player-hand');
  enableCardSelection();
  document.getElementById('sfx-play')?.play();
  turnPhase = 'discard';
enableCardSelection(); // 👈 Allow user to select a card for discard

};

document.getElementById('discard-button').onclick = () => {
  if (turnPhase !== 'discard') return;

  const handDiv = document.getElementById('player-hand');
  const selected = handDiv.querySelector('.card.selected');

  // No cards left, skip discard and end turn
  if (playerHand.length === 0) {
  console.log("No cards to discard. Turn ends.");
  turnPhase = 'draw'; // 👈 Ready for next player (or AI)
  // ✅ Refill hand right away
if (round >= 2) {
  drawUntilFull(playerHand, true);
}

// ✅ Let player start next turn
turnPhase = "draw";

// ✅ Enable operator clicking for attack if desired
enableOperatorSelection();


  return;
}


  if (!selected) {
    alert("Select one card to discard.");
    return;
  }

  const idx = parseInt(selected.dataset.index);
  const letter = playerHand.splice(idx, 1)[0];
  river.push(letter);

  renderHand(playerHand, 'player-hand');
  renderRiver();
  enableCardSelection();
  setTimeout(() => {
  startComputerTurn();
}, 1000);

// At the beginning of the player's next turn, draw until 7 if round >= 2
if (round >= 2) {
  drawUntilFull(playerHand, true);
}


};

document.getElementById('trash-button').onclick = () => {
  if (turnPhase !== 'play') return;

  const handDiv = document.getElementById('player-hand');
  const selectedCards = handDiv.querySelectorAll('.card.selected');

  if (!selectedCards.length) {
    alert("Select 1 or more cards to trash.");
    return;
  }

  // Move selected letters back into deck and shuffle
  const indices = [...selectedCards].map(card => parseInt(card.dataset.index)).sort((a, b) => b - a);
  const trashed = [];

  indices.forEach(idx => {
    const [letter] = playerHand.splice(idx, 1);
    trashed.push(letter);
  });

  deck.push(...trashed);
  shuffle(deck);

  clickedOrder = [];
  renderHand(playerHand, 'player-hand');
  renderRiver();

  // Skip discard, go straight to computer
  turnPhase = 'draw';
  setTimeout(() => {
    startComputerTurn();
  }, 1000);
};


document.getElementById('deselect-button').onclick = () => {
  clickedOrder.forEach(card => {
    card.classList.remove('selected');
    card.classList.forEach(cls => {
      if (cls.startsWith('rainbow-')) card.classList.remove(cls);
    });
  });
  clickedOrder = [];
};



// --- Utilities ---
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/** height of the vertical “rope” minus star+fire padding */
const CLIMB_PIXELS = 260;     // adjust if you ever resize the track
const WIN_SCORE    = 100;

/* moves the lemon up/down based on total score */
/* moves the lemon up/down based on total score */
function updateLemon(score, who /* 'player' | 'computer' */){
  const pct     = Math.min(score, WIN_SCORE) / WIN_SCORE;   // 0 → 1
  const pixels  = pct * CLIMB_PIXELS;
  const lemonEl = document.getElementById(
    who === 'player' ? 'player-lemon' : 'computer-lemon');
  lemonEl.style.bottom = `${pixels}px`;
}

function applyComputerOperatorToPlayer(op) {
  let scoreSpan = document.getElementById("player-score");
  let currentScore = parseInt(scoreSpan.textContent);
  let adjusted = 0;

  switch (op) {
    case "-": adjusted = -5; break;
    case "÷": adjusted = -Math.floor(currentScore / 2); break;
    case "%": adjusted = -Math.floor(currentScore * 0.25); break;
  }

  const newScore = Math.max(0, currentScore + adjusted);
  scoreSpan.textContent = newScore;
  updateLemon(newScore, "player");

  const msg = document.createElement("div");
  msg.textContent = `Computer used "${op}" on you!`;
  msg.className = "bonus-text";
  document.getElementById("player-words").appendChild(msg);
  setTimeout(() => msg.remove(), 1500);
}


function applyOperatorToOpponent(op) {
  const isAgainstComputer = turnPhase === 'post-player-attack';
  const word = isAgainstComputer ? lastComputerWord : lastPlayerWord;
  let scoreSpan = document.getElementById(isAgainstComputer ? "computer-score" : "player-score");
  let currentScore = parseInt(scoreSpan.textContent);
  let adjusted = 0;

  switch (op) {
    case "+": adjusted = 5; break;
    case "-": adjusted = -5; break;
    case "×": adjusted = currentScore; break;
    case "÷": adjusted = -Math.floor(currentScore / 2); break;
    case "!": adjusted = word.length * 2; break;
    case "%": adjusted = -Math.floor(currentScore * 0.25); break;
    case "&": adjusted = -10; break;
  }

  const newScore = Math.max(0, currentScore + adjusted);
  scoreSpan.textContent = newScore;

  if (isAgainstComputer) {
    updateLemon(newScore, "computer");
  } else {
    updateLemon(newScore, "player");
  }

  // Remove the used operator
  playerOperators.splice(playerOperators.indexOf(op), 1);
  renderOperators(playerOperators, "player-operators");
  

  // Visual feedback
  const msg = document.createElement("div");
  msg.textContent = `Opponent affected by "${op}"!`;
  msg.className = "bonus-text";
  const zone = isAgainstComputer ? document.getElementById("computer-words") : document.getElementById("player-words");
  zone.appendChild(msg);
  setTimeout(() => msg.remove(), 100);
renderOperators(playerOperators, "player-operators");

beginNextPlayerTurn(); // 👈 resume game after player attacks

}


/* sprinkling animated 🍋 all over the viewport */
function lemonConfetti(){
  for(let i=0;i<120;i++){
    const l   = document.createElement('div');
    l.textContent='🍋';
    l.className='falling-lemon';
    l.style.left = `${Math.random()*100}vw`;
    l.style.fontSize = `${22 + Math.random()*18}px`;
    l.style.animationDelay = `${Math.random()*1.5}s`;
    document.body.appendChild(l);
    // auto-cleanup
    l.addEventListener('animationend', ()=>l.remove());
  }
}

/* central win/lose banner */
function showBanner(text){
  if(document.getElementById('winner-banner')) return; // already shown
  const div=document.createElement('div');
  div.id='winner-banner';
  div.textContent=text;
  document.body.appendChild(div);
}


/* ─────────────────────────────────────────────
   SUPER-SMART COMPUTER TURN (v2)
   ───────────────────────────────────────────── */
function startComputerTurn() {
  console.log("Computer turn begins…");

  round++;
  document.getElementById("round-number").textContent = round;
  turnPhase = "computer";

  /* ── 1. DRAW PHASE ───────────────────────── */
  setTimeout(() => {
    console.log("🟡 Drawing up to 7…");
    drawUntilFull(computerHand, false);                 // fill to 7 first

    /* bonus 8th card from river/deck after round-1 */
    if (round >= 2 && computerHand.length < 7) {
  if (river.length && deck.length) {
    const deckPeek = deck[deck.length - 1];
    const bestRiverIdx = river.reduce(
  (best, l, i) => (letterScores[l] > letterScores[best.letter] ? { letter: l, idx: i } : best),
  { letter: river[0] || "A", idx: 0 } // default to "A" if empty
);


    if ((letterScores[bestRiverIdx.letter] || 0) >= (letterScores[deckPeek] || 0)) {
      computerHand.push(river.splice(bestRiverIdx.idx, 1)[0]);
      renderRiver();
    } else {
      computerHand.push(deck.pop());
    }
  } else if (river.length) {
    computerHand.push(river.splice(0, 1)[0]);
    renderRiver();
  } else if (deck.length) {
    computerHand.push(deck.pop());
  }
  renderHand(computerHand, "computer-hand");
}


    /* ── 2. THINKING PHASE ────────────────── */
    setTimeout(() => {
      console.log("💭 Evaluating best possible play…");

      // structure to keep track of our best test
      // ── best-play bookkeeping object ────────────────────────────
let bestPlay = {
  word: null,
  score: 0,
  handIdx: [],
  riverIdx: [],
  drawSource: 'none',   // 'none' | 'river' | 'deck'
  drawIdx: -1           // river index if drawSource === 'river'
};

/**
 * Evaluate a hypothetical hand and, if stronger, remember it.
 * @param {string[]} testHand  – the simulated hand
 * @param {'none'|'river'|'deck'} src – where the extra letter came from
 * @param {number} idx          – river index (only for 'river'; otherwise -1)
 */
const evaluateHand = (testHand, src = 'none', idx = -1) => {
  const words = getScoredWords(testHand, []); // ⛔️ No river access during play phase

  if (!words.length) return;

  const { word, score, handIndices, riverIndices } = words[0]; // highest score
if (
  score > bestPlay.score ||
  (score === bestPlay.score && word.length > (bestPlay.word ? bestPlay.word.length : 0))
) {
  const handLetters = handIndices.map(i => computerHand[i]);
const riverLetters = riverIndices.map(i => river[i]);
const cardSequence = [...handLetters, ...riverLetters];
// 🔍 Sanity check: is computer cheating?
const combined = [...computerHand, ...river];
const isValidPlay = cardSequence.every(letter => {
  const index = combined.indexOf(letter);
  if (index !== -1) {
    combined.splice(index, 1); // remove one occurrence
    return true;
  }
  return false;
});
if (!isValidPlay) {
  console.warn("⚠️ Computer attempted to use a letter it doesn't have:", cardSequence);
  return; // skip this word
}

  bestPlay = {
    word,
    score,
    handIdx: handIndices,
    riverIdx: riverIndices,
    drawSource: src,
    drawIdx: idx,
    cardSequence  // ✅ used for animation
  };
}

};

/* a) No extra draw (current hand) */
evaluateHand([...computerHand], 'none', -1);

/* b) Simulate EACH river draw */
for (let i = 0; i < river.length; i++) {
  evaluateHand([...computerHand, river[i]], 'river', i);
}

/* c) Simulate drawing the top deck card */
if (deck.length) {
  const peek = deck[deck.length - 1];
  evaluateHand([...computerHand, peek], 'deck', -1);
}

      /* no playable word at all?  */
     if (!bestPlay.word) {
  console.log("🗑️ Computer has no good word. Attempting to trash…");

  if (computerHand.length >= 2) {
    const trashCount = Math.min(2, computerHand.length);
    const trashIndices = [];

    while (trashIndices.length < trashCount) {
      const idx = Math.floor(Math.random() * computerHand.length);
      if (!trashIndices.includes(idx)) trashIndices.push(idx);
    }

    trashIndices.sort((a, b) => b - a).forEach(i => {
      const [letter] = computerHand.splice(i, 1);
      deck.push(letter);
    });

    shuffle(deck);
    renderHand(computerHand, 'computer-hand');
  } else {
    console.log("❌ Too few cards to trash, skipping trash.");
  }

  // Always finish turn no matter what
  finishComputerTurn();
  return;
}



      /* ── 3. COMMIT THE CHOSEN DRAW ───────── */
      // Ensure no overflow: only draw if hand < 7
// 🔁 Apply the chosen extra card (deck or river) to the real hand
if (bestPlay.drawSource === "river") {
  const drawn = river.splice(bestPlay.drawIdx, 1)[0];
  computerHand.push(drawn);
  renderRiver();
} else if (bestPlay.drawSource === "deck") {
  const drawn = deck.pop();
  computerHand.push(drawn);
}




      /* hand / river states are now synced */
      renderHand(computerHand, "computer-hand");

      /* ── 4. ANIMATE & SCORE THE WORD ─────── */
      let { word, handIdx, riverIdx, score } = bestPlay;
console.log("🏁 bestPlay:", bestPlay);

if (!word || word.length === 0) {
  console.log("❌ No valid word to drop, skipping computer turn.");
  finishComputerTurn();
  return;
}


      const handDiv  = document.getElementById("computer-hand");
      const cardEls  = [...handDiv.querySelectorAll(".card")];
      const wordDiv  = document.createElement("div");
      wordDiv.className = "played-word";
      document.getElementById("computer-words").appendChild(wordDiv);

      let hi = 0;
      function highlightNext() {
console.log("Highlighting word:", word);

        if (hi >= handIdx.length) {
          setTimeout(() => dropLetter(0), 500);
          return;
        }
        const idx = handIdx[hi];
if (typeof idx !== 'undefined') {
  const targetCard = cardEls[idx];
  if (targetCard) {
    targetCard.classList.add("selected", `rainbow-${hi % 7}`);
  }
} else {
  // For river cards (beyond handIdx), no need to highlight
  // because we animate them during dropLetter() anyway
}


        hi++;
        setTimeout(highlightNext, 450);
      }

      function dropLetter(pos) {
        if (pos >= word.length) {
          /* add score, remove used cards */
          // Apply computer operator if any
// Pick best beneficial operator
const beneficialOps = ["×", "+", "!", "&"];
const harmfulOps = ["-", "÷", "%"];
let bonusText = "";

for (let op of beneficialOps) {
  if (computerOperators.includes(op)) {
    computerUsedOperator = op;
    switch (op) {
      case "+": score += 5; bonusText = "+5 points!"; break;
      case "×": score *= 2; bonusText = "Score doubled!"; break;
      case "!": score *= word.length; bonusText = "Score × word length!"; break;
      case "&": score += 10; bonusText = "Co-op bonus!"; break;
    }
    computerOperators.splice(computerOperators.indexOf(op), 1);
    renderOperators(computerOperators, "computer-operators");
    break; // Use only one operator
  }
}


const scoreSpan = document.getElementById("computer-score");
scoreSpan.textContent = +scoreSpan.textContent + score;
lastComputerWord = word;


          // Remove used letters from actual computerHand and river
const usedHandLetters = [];
const usedRiverLetters = [];

for (let ch of bestPlay.cardSequence) {
  let idx = computerHand.findIndex((l, i) => l === ch && !usedHandLetters.includes(i));
  if (idx !== -1) {
    usedHandLetters.push(idx);
    continue;
  }

  idx = river.findIndex((l, i) => l === ch && !usedRiverLetters.includes(i));
  if (idx !== -1) {
    usedRiverLetters.push(idx);
  }
}

// Actually remove the used ones
usedHandLetters.sort((a, b) => b - a).forEach(i => computerHand.splice(i, 1));
usedRiverLetters.sort((a, b) => b - a).forEach(i => river.splice(i, 1));



          renderHand(computerHand, "computer-hand");
          renderRiver();

          /* update lemon height & check victory */
          updateLemon(+scoreSpan.textContent, "computer");
          if (+scoreSpan.textContent >= WIN_SCORE) {
            lemonConfetti();
            showBanner("YOU LOSE");
            turnPhase = "gameOver";
            return;
          }

          finishComputerTurn();
          return;
        }
  console.log(`🟠 dropLetter(${pos}) called`);
        let ch = null;

if (pos < bestPlay.handIdx.length) {
  // Get letter from actual hand
  const realIdx = bestPlay.handIdx[pos];
  ch = computerHand[realIdx];
} else {
  // Get letter from actual river
  const riverPos = pos - bestPlay.handIdx.length;
  const riverIdx = bestPlay.riverIdx[riverPos];
  ch = river[riverIdx];
}
console.log("🧠 Sanity Check — Computer Playing Letter");
console.log("Hand at play:", [...computerHand]);
console.log("River at play:", [...river]);
console.log("Playing letter:", ch);




console.log(`🟡 Dropping letter: ${ch}`);
        const card = document.createElement("div");
        card.className = "card";
        card.classList.add(`rainbow-${pos % 7}`);
        card.innerHTML = `
          <div style="position:relative;width:100%;height:100%;">
            <span class="letter" style="position:absolute;top:5px;left:0;right:0;text-align:center;">${ch}</span>
            <span class="points" style="position:absolute;bottom:3px;right:5px;font-size:10px;">${letterScores[ch]}</span>
          </div>`;
        wordDiv.appendChild(card);
        setTimeout(() => dropLetter(pos + 1), 300);
      }

      highlightNext();   // kick off animation
    }, 600);             // thinking delay
  }, 400);               // draw delay



  /* ── 5. FINISH TURN / DISCARD ─────────── */
function finishComputerTurn() {
  setTimeout(() => {
    if (computerHand.length) {
      river.push(computerHand.pop());
      renderRiver();
    }
    renderHand(computerHand, 'computer-hand');

    drawUntilFull(playerHand, true);
renderHand(playerHand, 'player-hand');
renderOperators(playerOperators, "player-operators"); // 👈 ensure fresh tiles
enableCardSelection();



    // ✅ Set the turn phase directly to "draw" so the player can either:
    // 1. Use an operator to attack, OR
    // 2. Start playing immediately
const attackOps = ["-", "÷", "%"];
for (let op of attackOps) {
  if (computerOperators.includes(op)) {
    applyComputerOperatorToPlayer(op);
    computerOperators.splice(computerOperators.indexOf(op), 1);
    renderOperators(computerOperators, "computer-operators");
    break; // Only attack with one
  }
}

    turnPhase = "post-player-attack"; // ✅ allows player to attack with operator

  console.log("Turn phase set to:", turnPhase);
    console.log("Player may now attack or proceed to draw.");
  }, 600);
}



function beginNextPlayerTurn() {
  drawUntilFull(playerHand, true);
  enableCardSelection();
  turnPhase = "draw";
  playerHasDrawn = false;
  console.log("Player turn begins.");
}


}


function initializeGame() {
console.log("🎮 initializeGame() running");

  // Fill deck and shuffle
  for (let letter in letterFrequencies) {
    for (let i = 0; i < letterFrequencies[letter]; i++) {
      deck.push(letter);
    }
  }
  shuffle(deck);

  // Deal hands
  for (let i = 0; i < 7; i++) {
    drawCardToHand(playerHand, true);
    drawCardToHand(computerHand, false);
  }
  drawCardToHand(river, true); // put a card in river

  // Render everything
  renderHand(playerHand, 'player-hand');
  renderHand(computerHand, 'computer-hand');
  renderRiver();
  renderOperators(playerOperators, "player-operators");
enableOperatorSelection(); // 🧠 activates click-based selection
renderOperators(computerOperators, "computer-operators");

  enableCardSelection();
}




// 🚀 Wrap game start in DOMContentLoaded
document.addEventListener("DOMContentLoaded", initializeGame);

