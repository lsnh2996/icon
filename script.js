(function () {
'use strict';

// ── Sprite constants ──────────────────────────────────
var FRAME_PX = 32, TOTAL_CHARS = 21;
var ANIM = {
  down:  [0,1,2,3],
  up:    [4,5,6,7],
  right: [8,9,10,9],
  left:  [8,9,10,9]
};

// Character names for the selector
var CHAR_NAMES = [
  'Robot','Knight','Warrior','Berserker',
  'Paladin','Mage','Priest','Fighter',
  'Ranger','Rogue','Brawler','Dark Knight',
  'Crusader','Witch','Ninja','Champion',
  'Guardian','Dragon Knight','Aqua Knight','Sentinel',
  'Warlord'
];

// ── DOM refs ──────────────────────────────────────────
var selectScreen = document.getElementById('select-screen');
var gameScreen   = document.getElementById('game-screen');
var charGrid     = document.getElementById('char-grid');
var playBtn      = document.getElementById('play-btn');
var changeBtn    = document.getElementById('change-char-btn');
var stageEl      = document.getElementById('stage');
var playerEl     = document.getElementById('player');
var wrapEl       = document.getElementById('playerWrap');
var hudEl        = document.getElementById('hud');
var timerEl      = document.getElementById('timer');
var controlsEl   = document.getElementById('controls');
var jBase        = document.getElementById('joystick-base');
var jThumb       = document.getElementById('joystick-thumb');
var mScoreEl     = document.getElementById('mobile-score-display');

// ── Character selection ───────────────────────────────
var selectedChar = 0; // row index 0-20

// Build the grid
for (var r = 0; r < TOTAL_CHARS; r++) {
  (function(row) {
    var card = document.createElement('div');
    card.className = 'char-card' + (row === 0 ? ' selected' : '');
    card.setAttribute('data-row', row);

    var preview = document.createElement('div');
    preview.className = 'char-preview';
    // Show col 0 (idle down) of this character row, scaled 2x in the 64px box
    // Sheet is 384x672 native; we scale to show 32px frame in 64px box = 2x
    preview.style.backgroundSize = '768px 1344px';
    preview.style.backgroundPosition = '0px ' + (-row * 64) + 'px';

    var label = document.createElement('span');
    label.textContent = CHAR_NAMES[row];

    card.appendChild(preview);
    card.appendChild(label);
    card.addEventListener('click', function() { selectCharacter(row); });
    card.addEventListener('touchend', function(e) { e.preventDefault(); selectCharacter(row); });
    charGrid.appendChild(card);
  })(r);
}

function selectCharacter(row) {
  selectedChar = row;
  var cards = charGrid.querySelectorAll('.char-card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.toggle('selected', parseInt(cards[i].getAttribute('data-row')) === row);
  }
}

playBtn.addEventListener('click', startGame);
playBtn.addEventListener('touchend', function(e) { e.preventDefault(); startGame(); });

changeBtn.addEventListener('click', goToSelect);
changeBtn.addEventListener('touchend', function(e) { e.preventDefault(); goToSelect(); });

function goToSelect() {
  // Pause game
  gameOver = true;
  // Clear stage
  var goEl = stageEl.querySelector('.game-over');
  if (goEl) goEl.remove();
  collectibles.forEach(function(c) { c.el.remove(); });
  collectibles = [];
  // Show select screen
  gameScreen.classList.add('hidden');
  selectScreen.classList.remove('hidden');
}

function startGame() {
  selectScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  // Apply selected character
  playerEl.style.backgroundPosition = '0px ' + (-selectedChar * FRAME_PX) + 'px';
  // Reset game state
  score = 0; timeLeft = GAME_DURATION; gameOver = false;
  player.x = 60; player.y = 60; player.vx = 0; player.vy = 0;
  direction = 'down'; walkFrame = 0; walkTick = 0;
  collectibles.forEach(function(c) { c.el.remove(); });
  collectibles = [];
  var goEl = stageEl.querySelector('.game-over');
  if (goEl) goEl.remove();
  refreshWalls();
  requestAnimationFrame(function() {
    ensureCollectibles();
    if (!hasTouchScreen) stageEl.focus();
  });
}

// ── Touch detection ───────────────────────────────────
var hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
function applyLayout() {
  controlsEl.style.display = hasTouchScreen ? 'flex' : 'none';
}
applyLayout();

function getStageDims() {
  return { w: stageEl.clientWidth, h: stageEl.clientHeight };
}

// ── Player state ──────────────────────────────────────
var player = { x: 60, y: 60, w: 32, h: 32, speed: 170, vx: 0, vy: 0, accel: 1900 };
var direction = 'down', walkFrame = 0, walkTick = 0;
var WALK_TICKS = 7;

// ── Keyboard input ────────────────────────────────────
var keys = Object.create(null);
window.addEventListener('keydown', function(e) {
  keys[e.key] = true;
  if (/^Arrow|^[wasdWASD]$/.test(e.key)) e.preventDefault();
}, { passive: false });
window.addEventListener('keyup', function(e) { keys[e.key] = false; });

// ── Joystick ──────────────────────────────────────────
var joyX = 0, joyY = 0;
var joyActive = false, joyPointerId = null;
var JOY_MAX = (110 - 46) / 2;

function getJoyCenter() {
  var r = jBase.getBoundingClientRect();
  return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
}
function updateJoy(clientX, clientY) {
  var c = getJoyCenter();
  var dx = clientX - c.cx, dy = clientY - c.cy;
  var dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > JOY_MAX) { dx = dx/dist*JOY_MAX; dy = dy/dist*JOY_MAX; }
  joyX = dx/JOY_MAX; joyY = dy/JOY_MAX;
  jThumb.style.transform = 'translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px))';
}
function onJoyStart(e) {
  e.preventDefault();
  if (joyActive) return;
  var pt = e.changedTouches ? e.changedTouches[0] : e;
  joyActive = true; joyPointerId = (pt.identifier !== undefined) ? pt.identifier : -1;
  updateJoy(pt.clientX, pt.clientY);
}
function onJoyMove(e) {
  if (!joyActive) return;
  e.preventDefault();
  var pt = null;
  if (e.changedTouches) {
    for (var i=0; i<e.changedTouches.length; i++)
      if (e.changedTouches[i].identifier === joyPointerId) { pt = e.changedTouches[i]; break; }
  } else { pt = e; }
  if (pt) updateJoy(pt.clientX, pt.clientY);
}
function onJoyEnd(e) {
  if (!joyActive) return;
  if (e.changedTouches) {
    var found = false;
    for (var i=0; i<e.changedTouches.length; i++)
      if (e.changedTouches[i].identifier === joyPointerId) { found=true; break; }
    if (!found) return;
  }
  joyActive = false; joyPointerId = null;
  joyX = 0; joyY = 0;
  jThumb.style.transform = 'translate(-50%,-50%)';
}
controlsEl.addEventListener('touchstart', onJoyStart, { passive: false });
window.addEventListener('touchmove',   onJoyMove,  { passive: false });
window.addEventListener('touchend',    onJoyEnd,   { passive: false });
window.addEventListener('touchcancel', onJoyEnd,   { passive: false });

// ── Utilities ─────────────────────────────────────────
var clamp   = function(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); };
var overlap = function(a,b){ return !(a.x+a.w<=b.x||a.x>=b.x+b.w||a.y+a.h<=b.y||a.y>=b.y+b.h); };

// ── Walls ─────────────────────────────────────────────
var walls = [];
function refreshWalls() {
  var sr = stageEl.getBoundingClientRect();
  walls = Array.prototype.slice.call(document.querySelectorAll('.wall')).map(function(w) {
    var r = w.getBoundingClientRect();
    return { x:r.left-sr.left, y:r.top-sr.top, w:r.width, h:r.height };
  });
}

function onResize() {
  hasTouchScreen = ('ontouchstart' in window)||(navigator.maxTouchPoints>0);
  applyLayout();
  refreshWalls();
  var s = getStageDims();
  player.x = clamp(player.x,0,s.w-player.w);
  player.y = clamp(player.y,0,s.h-player.h);
  collectibles.forEach(function(c){
    c.x=clamp(c.x,0,s.w-c.w); c.y=clamp(c.y,0,s.h-c.h);
    c.el.style.transform='translate('+c.x+'px,'+c.y+'px)';
  });
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', function(){ setTimeout(onResize,150); });

// ── Collectibles ──────────────────────────────────────
var score = 0, nextId = 1;
var EMOJIS = ['💎','🪙'];
var collectibles = [];

function addCollectible(char, x, y) {
  var el = document.createElement('div');
  el.className = 'collectible';
  var sp = document.createElement('span');
  sp.textContent = char; el.appendChild(sp);
  stageEl.appendChild(el);
  var c = { id:nextId++, x:x, y:y, w:22, h:22, el:el };
  el.style.transform = 'translate('+x+'px,'+y+'px)';
  return c;
}
function canPlace(rect) {
  var s=getStageDims(), m=12;
  if(rect.x<m||rect.y<m||rect.x+rect.w>s.w-m||rect.y+rect.h>s.h-m) return false;
  if(overlap({x:rect.x-m,y:rect.y-m,w:rect.w+m*2,h:rect.h+m*2},player)) return false;
  for(var i=0;i<walls.length;i++) if(overlap(rect,walls[i])) return false;
  for(var j=0;j<collectibles.length;j++) if(overlap(rect,collectibles[j])) return false;
  return true;
}
function spawnCollectible() {
  var s=getStageDims();
  if(s.w<10||s.h<10) return;
  var r, tries=0;
  do { r={x:Math.random()*(s.w-44)+12,y:Math.random()*(s.h-44)+12,w:22,h:22}; }
  while(!canPlace(r)&&++tries<300);
  collectibles.push(addCollectible(EMOJIS[Math.floor(Math.random()*EMOJIS.length)],r.x,r.y));
}
function ensureCollectibles() {
  while(collectibles.length<6) spawnCollectible();
}
function popText(x,y) {
  var el=document.createElement('div');
  el.className='pop'; el.textContent='+1';
  el.style.transform='translate('+x+'px,'+y+'px)';
  stageEl.appendChild(el);
  setTimeout(function(){ el.remove(); },650);
}

// ── Sprite ────────────────────────────────────────────
function applySprite() {
  var col = ANIM[direction][walkFrame % ANIM[direction].length];
  playerEl.style.backgroundPosition = (-col*FRAME_PX)+'px '+(-selectedChar*FRAME_PX)+'px';
  if(direction==='left') playerEl.classList.add('facing-left');
  else playerEl.classList.remove('facing-left');
}

// ── Movement ──────────────────────────────────────────
function moveAxis(axis, delta) {
  if(!delta) return;
  var next={x:player.x,y:player.y,w:player.w,h:player.h};
  next[axis]+=delta;
  for(var i=0;i<walls.length;i++){
    if(overlap(next,walls[i])){
      var w=walls[i];
      if(axis==='x') next.x=delta>0?w.x-player.w:w.x+w.w;
      else           next.y=delta>0?w.y-player.h:w.y+w.h;
      break;
    }
  }
  player[axis]=next[axis];
}

// ── Timer / Game over ─────────────────────────────────
var GAME_DURATION = 30;
var timeLeft = GAME_DURATION, gameOver = false;

function showGameOver() {
  gameOver = true;
  var el = document.createElement('div');
  el.className = 'game-over';
  el.innerHTML = '<h2>Time\'s Up!</h2><p>Final Score: <strong style="color:#fbbf24">'+score+'</strong></p><div class="btn-row"><button class="btn-play-again" id="restartBtn">Play Again</button><button class="btn-change-char" id="changeCharBtn">Change Character</button></div>';
  stageEl.appendChild(el);
  document.getElementById('restartBtn').addEventListener('click', function(){
    el.remove(); startGame();
  });
  document.getElementById('changeCharBtn').addEventListener('click', function(){
    el.remove(); goToSelect();
  });
}

function updateHUD() {
  hudEl.textContent  = 'Score: '+score;
  mScoreEl.textContent = score;
  var secs = Math.ceil(timeLeft);
  timerEl.textContent = secs+'s';
  if(secs<=5) timerEl.classList.add('urgent');
  else timerEl.classList.remove('urgent');
}

// ── Game loop ─────────────────────────────────────────
var last = performance.now();
var loopRunning = false;

function loop(now) {
  var dt = Math.min((now-last)/1000, 0.05);
  last = now;

  if(gameOver) { requestAnimationFrame(loop); return; }

  timeLeft = Math.max(0, timeLeft-dt);
  updateHUD();
  if(timeLeft<=0) { showGameOver(); requestAnimationFrame(loop); return; }

  var ix=joyX, iy=joyY;
  if(keys['ArrowLeft'] ||keys['a']||keys['A']) ix-=1;
  if(keys['ArrowRight']||keys['d']||keys['D']) ix+=1;
  if(keys['ArrowUp']   ||keys['w']||keys['W']) iy-=1;
  if(keys['ArrowDown'] ||keys['s']||keys['S']) iy+=1;
  var mag=Math.sqrt(ix*ix+iy*iy);
  if(mag>1){ix/=mag;iy/=mag;}

  var tvx=ix*player.speed, tvy=iy*player.speed, snap=5;
  player.vx = Math.abs(tvx-player.vx)<snap ? tvx : player.vx+player.accel*((tvx>player.vx)?1:-1)*dt;
  player.vy = Math.abs(tvy-player.vy)<snap ? tvy : player.vy+player.accel*((tvy>player.vy)?1:-1)*dt;

  moveAxis('x', player.vx*dt);
  moveAxis('y', player.vy*dt);

  var s=getStageDims();
  player.x=clamp(player.x,0,s.w-player.w);
  player.y=clamp(player.y,0,s.h-player.h);

  // Use INPUT to drive animation, not velocity.
  // Velocity stays non-zero while decelerating or when hitting a wall,
  // which caused the character to appear stuck in a walk cycle.
  var inputMoving = mag > 0.1;
  if(inputMoving) {
    if(Math.abs(iy)>Math.abs(ix)) direction=iy<0?'up':'down';
    else                          direction=ix<0?'left':'right';
    if(++walkTick>=WALK_TICKS){walkTick=0;walkFrame=(walkFrame+1)%4;}
  } else {
    walkFrame=0; walkTick=0;
  }

  for(var i=collectibles.length-1;i>=0;i--){
    if(overlap(player,collectibles[i])){
      score++;
      popText(collectibles[i].x,collectibles[i].y);
      collectibles[i].el.remove();
      collectibles.splice(i,1);
      setTimeout(spawnCollectible,150);
    }
  }

  wrapEl.style.transform='translate('+player.x+'px,'+player.y+'px)';
  applySprite();

  requestAnimationFrame(loop);
}

// Start the RAF loop once (it always keeps running, gated by gameOver flag)
requestAnimationFrame(loop);

})();
