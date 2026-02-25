const CLASSES = [
{ name: 'FIGHTER', desc: 'Brave &\nversatile',    row: 2  },
{ name: 'KNIGHT',  desc: 'Heavy armor\n& shield',  row: 4  },
{ name: 'CLERIC',  desc: 'Holy warrior\n& healer', row: 6  },
{ name: 'ROGUE',   desc: 'Swift &\ndeadly',        row: 8  },
{ name: 'RANGER',  desc: 'Scout &\nmarksman',      row: 10 },
{ name: 'MAGE',    desc: 'Arcane\npower',           row: 13 },
];

const FRAME_PX = 96; // 32px * 3x display scale

// Build character select cards
const grid = document.getElementById('class-grid');
CLASSES.forEach(cls => {
const card = document.createElement('div');
card.className = 'class-card';

const preview = document.createElement('div');
preview.className = 'class-preview';
// Show col 0 (idle, facing down) for this character's row
preview.style.backgroundPosition = `0px ${-(cls.row * FRAME_PX)}px`;

const name = document.createElement('div');
name.className = 'class-name';
name.textContent = cls.name;

const desc = document.createElement('div');
desc.className = 'class-desc';
desc.innerHTML = cls.desc.replace(/\n/g, '<br>');

card.appendChild(preview);
card.appendChild(name);
card.appendChild(desc);
card.addEventListener('click', () => startGame(cls));
grid.appendChild(card);
});

// Game state
let selectedClass = null;
let x = 272, y = 192;
const SPEED    = 3;
const ARENA_W  = 640, ARENA_H = 480;
const CHAR_W   = 96,  CHAR_H  = 96;
let direction  = 'down';
let walkFrame  = 0;   // 0 = idle, 1-3 = walk cycle
let walkTick   = 0;
const WALK_SPD = 8;   // game ticks between frame changes

const keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true;  e.preventDefault(); });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

function startGame(cls) {
selectedClass = cls;
document.getElementById('select-screen').style.display = 'none';
document.getElementById('game-screen').style.display = 'flex';
document.getElementById('hud-class').textContent = cls.name;
const char = document.getElementById('character');
char.style.left = x + 'px';
char.style.top  = y + 'px';
applySprite();
loop();
}

function applySprite() {
const char = document.getElementById('character');
let col;

if (direction === 'down') {
  col = walkFrame;                     // cols 0-3
} else if (direction === 'up') {
  col = 4 + walkFrame;                 // cols 4-7
} else {
  col = 8 + Math.min(walkFrame, 2);   // cols 8-10
}

// Left is just the right frames mirrored
if (direction === 'left') {
  char.classList.add('facing-left');
} else {
  char.classList.remove('facing-left');
}

char.style.backgroundPosition =
  `${-(col * FRAME_PX)}px ${-(selectedClass.row * FRAME_PX)}px`;

document.getElementById('hud-dir').textContent = direction.toUpperCase();
}

function loop() {
let dx = 0, dy = 0;
if (keys['ArrowUp']    || keys['w'] || keys['W']) dy = -1;
if (keys['ArrowDown']  || keys['s'] || keys['S']) dy =  1;
if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx = -1;
if (keys['ArrowRight'] || keys['d'] || keys['D']) dx =  1;

const moving = dx !== 0 || dy !== 0;

if (dy < 0) direction = 'up';
if (dy > 0) direction = 'down';
if (dx < 0) direction = 'left';
if (dx > 0) direction = 'right';

if (moving) {
  walkTick++;
  if (walkTick >= WALK_SPD) {
    walkTick  = 0;
    walkFrame = (walkFrame % 3) + 1; // 1 → 2 → 3 → 1
  }
} else {
  walkFrame = 0;
  walkTick  = 0;
}

if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

x = Math.max(0, Math.min(ARENA_W - CHAR_W, x + dx * SPEED));
y = Math.max(0, Math.min(ARENA_H - CHAR_H, y + dy * SPEED));

const char = document.getElementById('character');
char.style.left = x + 'px';
char.style.top  = y + 'px';
applySprite();
requestAnimationFrame(loop);
}
