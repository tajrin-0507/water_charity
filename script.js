const DIFFICULTIES = {
  easy: { goal: 15, seconds: 40, spawnRate: 1100, obstacleChance: 0.15 },
  normal: { goal: 20, seconds: 30, spawnRate: 900, obstacleChance: 0.25 },
  hard: { goal: 25, seconds: 25, spawnRate: 700, obstacleChance: 0.35 }
};
const MILESTONE_MESSAGES = [
  { progress: 0.25, message: 'Great start! You are a quarter of the way there.' },
  { progress: 0.5, message: 'Halfway there! Keep collecting.' },
  { progress: 0.75, message: 'Almost there! The goal is in reach.' }
];
const SOUND_FILES = {
  collect: 'audio/collect.ogg',
  miss: 'audio/miss.ogg',
  obstacle: 'audio/obstacle.ogg',
  button: 'audio/button.ogg',
  win: 'audio/win.ogg'
};
const sounds = Object.fromEntries(
  Object.entries(SOUND_FILES).map(([name, path]) => [name, new Audio(path)])
);
Object.values(sounds).forEach(sound => { sound.preload = 'auto'; });

let currentCans = 0;
let timeLeft = DIFFICULTIES.normal.seconds;
let gameActive = false;
let spawnInterval;
let timerInterval;
let confettiTimeout;
let reachedMilestones = new Set();

const grid = document.querySelector('.game-grid');
const scoreDisplay = document.getElementById('current-cans');
const goalDisplay = document.getElementById('goal');
const timerDisplay = document.getElementById('timer');
const messageDisplay = document.getElementById('achievements');
const difficultySelect = document.getElementById('difficulty');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');

function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// Creates the 3x3 game grid where items will appear
function createGrid() {
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

function spawnItem() {
  if (!gameActive) return;
  if (grid.querySelector('.water-can')) playSound('miss');
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));
  const randomCell = cells[Math.floor(Math.random() * cells.length)];
  const settings = DIFFICULTIES[difficultySelect.value];

  if (Math.random() < settings.obstacleChance) {
    randomCell.innerHTML = '<button class="pollution-obstacle" type="button" aria-label="Pollution, lose one point">!</button>';
  } else {
    randomCell.innerHTML = '<button class="water-can" type="button" aria-label="Collect clean water can"></button>';
  }
}

function startGame() {
  if (gameActive) return;
  resetRound();
  gameActive = true;
  startButton.disabled = true;
  difficultySelect.disabled = true;
  messageDisplay.textContent = `Collect ${goalDisplay.textContent} cans before time runs out!`;
  spawnItem();
  spawnInterval = setInterval(spawnItem, DIFFICULTIES[difficultySelect.value].spawnRate);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function resetRound() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(confettiTimeout);
  document.querySelectorAll('.confetti-piece').forEach(piece => piece.remove());
  gameActive = false;
  currentCans = 0;
  reachedMilestones = new Set();
  const settings = DIFFICULTIES[difficultySelect.value];
  timeLeft = settings.seconds;
  scoreDisplay.textContent = currentCans;
  goalDisplay.textContent = settings.goal;
  timerDisplay.textContent = timeLeft;
  startButton.disabled = false;
  startButton.textContent = 'Start Game';
  difficultySelect.disabled = false;
  messageDisplay.textContent = 'Collect clean water cans and avoid pollution.';
  createGrid();
}

function endGame(won = false) {
  if (!won && grid.querySelector('.water-can')) playSound('miss');
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  startButton.disabled = false;
  startButton.textContent = 'Play Again';
  difficultySelect.disabled = false;
  messageDisplay.textContent = won
    ? 'You win! Clean water for everyone!'
    : 'Time is up! Press Play Again to try again.';
  if (won) {
    playSound('win');
    celebrateWin();
  }
}

function celebrateWin() {
  const colors = ['#FFC907', '#2E9DF7', '#4FCB53', '#FF902A', '#F16061'];
  const pieces = document.createDocumentFragment();

  for (let index = 0; index < 70; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 1.5}s`;
    pieces.appendChild(piece);
  }

  document.body.appendChild(pieces);
  confettiTimeout = setTimeout(() => {
    document.querySelectorAll('.confetti-piece').forEach(piece => piece.remove());
  }, 5000);
}

grid.addEventListener('click', event => {
  if (!gameActive) return;
  const target = event.target.closest('.water-can, .pollution-obstacle');
  if (!target) return;

  if (target.classList.contains('water-can')) {
    currentCans += 1;
    playSound('collect');
    scoreDisplay.textContent = currentCans;
    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('score-pop');
    const goal = Number(goalDisplay.textContent);
    MILESTONE_MESSAGES.forEach(milestone => {
      const threshold = Math.ceil(goal * milestone.progress);
      if (currentCans >= threshold && !reachedMilestones.has(threshold)) {
        reachedMilestones.add(threshold);
        messageDisplay.textContent = milestone.message;
      }
    });
    if (currentCans >= goal) endGame(true);
  } else {
    playSound('obstacle');
    currentCans = Math.max(0, currentCans - 1);
    scoreDisplay.textContent = currentCans;
    messageDisplay.textContent = 'Pollution! You lost one point.';
  }
  target.remove();
});

startButton.addEventListener('click', () => {
  playSound('button');
  startGame();
});
resetButton.addEventListener('click', () => {
  playSound('button');
  resetRound();
});
difficultySelect.addEventListener('change', () => {
  playSound('button');
  resetRound();
});
resetRound();
