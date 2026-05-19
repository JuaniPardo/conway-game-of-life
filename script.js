const board = document.getElementById('board');
const hint = document.getElementById('hint');
const speedGroup = document.getElementById('speed-group');
const customInput = document.getElementById('custom-size');

const state = {
  size: 40,
  grid: [],
  mode: 'step',
  speed: 2,
  loopId: null,
};

function makeGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => Math.random() < 0.28));
}

function neighbors(grid, x, y) {
  const size = grid.length;
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = (x + dx + size) % size;
      const ny = (y + dy + size) % size;
      if (grid[nx][ny]) count++;
    }
  }
  return count;
}

function nextGrid(grid) {
  return grid.map((row, x) => row.map((alive, y) => {
    const n = neighbors(grid, x, y);
    return alive ? n === 2 || n === 3 : n === 3;
  }));
}

function buildBoard(size) {
  board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  board.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    frag.appendChild(cell);
  }
  board.appendChild(frag);
}

function renderTransition(prev, next, durationMs) {
  board.style.setProperty('--anim-ms', `${durationMs}ms`);
  const cells = board.children;
  const size = prev.length;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = cells[x * size + y];
      cell.className = 'cell';
      if (prev[x][y] && !next[x][y]) cell.classList.add('dying');
      else if (!prev[x][y] && next[x][y]) cell.classList.add('reviving');
      else cell.classList.add('steady');
    }
  }
}

function step() {
  const prev = state.grid;
  const next = nextGrid(prev);
  const duration = state.mode === 'auto' ? Math.max(80, 520 / state.speed) : 320;
  renderTransition(prev, next, duration);
  state.grid = next;
}

function stopLoop() {
  if (state.loopId) {
    clearInterval(state.loopId);
    state.loopId = null;
  }
}

function startLoop() {
  stopLoop();
  const interval = Math.max(90, 900 / state.speed);
  state.loopId = setInterval(step, interval);
}

function setMode(mode) {
  state.mode = mode;
  document.getElementById('step-mode').classList.toggle('active', mode === 'step');
  document.getElementById('auto-mode').classList.toggle('active', mode === 'auto');
  const auto = mode === 'auto';
  speedGroup.setAttribute('aria-disabled', String(!auto));
  hint.textContent = auto
    ? 'Automático: el juego avanza solo. Ajustá la velocidad.'
    : 'Step by step: presioná Espacio para iterar.';
  if (auto) startLoop();
  else stopLoop();
}

function setSize(size) {
  state.size = size;
  state.grid = makeGrid(size);
  buildBoard(size);
  renderTransition(state.grid, state.grid, 1);
}

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => setSize(Number(btn.dataset.size)));
});

document.getElementById('apply-size').addEventListener('click', () => {
  const v = Number(customInput.value);
  if (Number.isFinite(v) && v >= 8 && v <= 180) setSize(Math.floor(v));
});

document.getElementById('step-mode').addEventListener('click', () => setMode('step'));
document.getElementById('auto-mode').addEventListener('click', () => setMode('auto'));

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.speed = Number(btn.dataset.speed);
    if (state.mode === 'auto') startLoop();
  });
});

document.getElementById('randomize').addEventListener('click', () => setSize(state.size));
document.getElementById('clear').addEventListener('click', () => {
  state.grid = Array.from({ length: state.size }, () => Array(state.size).fill(false));
  renderTransition(state.grid, state.grid, 1);
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.mode === 'step') step();
  }
});

setSize(state.size);
setMode('step');
