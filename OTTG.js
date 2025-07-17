console.log("✅ OTTG.js successfully loaded.");

const journal = document.getElementById('journal');
const saveBtn = document.getElementById('save-btn');
const imageArea = document.getElementById('image-area');
const sendBtn = document.getElementById('send-btn');
const finalImage = document.getElementById('final-image');

const rows = 20;
const cols = 30;
const totalTiles = rows * cols;
const tiles = [];

// Build image tiles
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.style.width = `${100 / cols}%`;
    tile.style.height = `${100 / rows}%`;
    tile.style.left = `${(c * 100) / cols}%`;
    tile.style.top = `${(r * 100) / rows}%`;
    const xPos = (c / (cols - 1)) * 100;
    const yPos = (r / (rows - 1)) * 100;
    tile.style.backgroundPosition = `${xPos}% ${yPos}%`;
    imageArea.appendChild(tile);
    tiles.push(tile);
  }
}

// Shuffle tiles
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
shuffle(tiles);

// Reveal blurred tiles as user types
journal.addEventListener('input', () => {
  const words = journal.value.trim().split(/\s+/).filter(w => w.length > 0).length;
  const tilesToReveal = Math.min(words * 2, totalTiles);
  for (let i = 0; i < tilesToReveal; i++) {
    tiles[i].style.opacity = 1;
  }
});

// On send: fade tiles and show full image
sendBtn.addEventListener('click', () => {
  tiles.forEach(tile => {
    tile.style.opacity = 0;
    tile.style.filter = 'none';
    tile.style.transition = 'opacity 1s ease';
  });
  finalImage.style.opacity = 1;
});

// Save text and image
saveBtn.addEventListener('click', () => {
  const text = journal.value.trim();
  if (text.length === 0) {
    alert("Your journal is empty!");
    return;
  }

  // Save journal text
  const textBlob = new Blob([text], { type: 'text/plain' });
  const textURL = URL.createObjectURL(textBlob);
  const a = document.createElement('a');
  a.href = textURL;
  a.download = 'journal-letter.txt';
  a.click();
  URL.revokeObjectURL(textURL);

  // Save image (optional, not guaranteed due to CORS)
  const imgLink = document.createElement('a');
  imgLink.href = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
  imgLink.download = 'revealed-image.jpg';
  imgLink.click();
});
