export function mount(host) {
  const abort = new AbortController();
  const id = `invaders-${Math.random().toString(36).slice(2, 8)}`;
  const root = document.createElement('article');
  root.className = 'arcade-game';
  root.innerHTML = `
    <div class="arcade-game-head"><h3>Invasores</h3><p class="arcade-score" aria-live="off">Alvos: <span data-score>0</span> / 18 · Vidas: <span data-lives>3</span></p></div>
    <div class="arcade-playfield" tabindex="0" role="group" aria-label="Área de jogo dos invasores" aria-describedby="${id}-instructions"><canvas width="720" height="390" role="img" aria-label="Nave se move horizontalmente e dispara contra uma formação de invasores"></canvas></div>
    <p class="arcade-instructions" id="${id}-instructions">← e → movem a nave; Espaço dispara; Escape pausa. No celular, segure os botões. Elimine os 18 alvos antes que alcancem a nave. Você tem três vidas.</p>
    <p class="arcade-status" role="status" aria-live="polite">Pronto para defender a pista.</p>
    <div class="arcade-controls"><button type="button" class="arcade-primary" data-start>Iniciar</button><button type="button" data-pause disabled>Pausar</button><button type="button" class="arcade-touch-control" data-control="left" aria-label="Mover para a esquerda" disabled>←</button><button type="button" class="arcade-touch-control" data-control="fire" disabled>Disparar</button><button type="button" class="arcade-touch-control" data-control="right" aria-label="Mover para a direita" disabled>→</button></div>
    <p class="arcade-motion-note" hidden>Movimento reduzido: sem estrelas animadas ou flashes. As naves continuam em movimento durante a partida; use Pausar quando quiser.</p>`;
  host.append(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { root.remove(); throw new Error('Canvas indisponível'); }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 720 * dpr; canvas.height = 390 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const field = root.querySelector('.arcade-playfield');
  const status = root.querySelector('.arcade-status');
  const startButton = root.querySelector('[data-start]');
  const pauseButton = root.querySelector('[data-pause]');
  const touchButtons = [...root.querySelectorAll('[data-control]')];
  const scoreNode = root.querySelector('[data-score]');
  const livesNode = root.querySelector('[data-lives]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const keys = new Set();
  const pointers = new Map();
  const stars = Array.from({ length: 32 }, (_, index) => ({ x: (index * 139 + 43) % 720, y: (index * 71 + 17) % 338 }));
  let state = 'ready', disposed = false, raf = 0, lastTime = 0;
  let playerX = 342, lives = 3, eliminated = 0, invulnerable = 0;
  let aliens = [], shots = [], enemyShots = [], direction = 1, fireCooldown = 0, enemyCooldown = 1;

  function formation() {
    return Array.from({ length: 18 }, (_, index) => ({ x: 134 + (index % 6) * 70, y: 48 + Math.floor(index / 6) * 40, column: index % 6 }));
  }
  aliens = formation();
  function clearInputs() { keys.clear(); pointers.clear(); }
  function pressed(action) { return keys.has(action) || [...pointers.values()].includes(action); }
  function setState(next, message) {
    state = next; root.dataset.state = next; status.textContent = message;
    pauseButton.disabled = !['running', 'paused'].includes(next);
    pauseButton.textContent = next === 'paused' ? 'Continuar' : 'Pausar';
    startButton.textContent = next === 'ready' ? 'Iniciar' : 'Reiniciar';
    touchButtons.forEach(button => { button.disabled = next !== 'running'; });
  }
  function draw() {
    ctx.fillStyle = '#0e131c'; ctx.fillRect(0, 0, 720, 390);
    ctx.fillStyle = '#344256'; stars.forEach(star => ctx.fillRect(star.x, star.y, 2, 2));
    ctx.strokeStyle = '#3d4d64'; ctx.beginPath(); ctx.moveTo(18, 369); ctx.lineTo(702, 369); ctx.stroke();
    aliens.forEach((alien, index) => {
      ctx.fillStyle = index % 2 ? '#a8bcd8' : '#c4d0f3';
      ctx.fillRect(alien.x + 3, alien.y, 22, 17);
      ctx.fillRect(alien.x, alien.y + 6, 28, 10);
      ctx.fillRect(alien.x + 3, alien.y + 17, 4, 4);
      ctx.fillRect(alien.x + 21, alien.y + 17, 4, 4);
      ctx.fillStyle = '#111723'; ctx.fillRect(alien.x + 7, alien.y + 6, 4, 4); ctx.fillRect(alien.x + 17, alien.y + 6, 4, 4);
    });
    ctx.fillStyle = '#c4d0f3';
    if (!invulnerable || motion.matches || Math.floor(invulnerable * 10) % 2 === 0) {
      ctx.fillRect(playerX, 346, 36, 13); ctx.fillRect(playerX + 13, 333, 10, 13);
    }
    if (invulnerable) { ctx.strokeStyle = '#9eb4d3'; ctx.strokeRect(playerX - 4, 328, 44, 36); }
    ctx.fillStyle = '#e9f1ff'; shots.forEach(shot => ctx.fillRect(shot.x, shot.y, 3, 12));
    ctx.fillStyle = '#dfa887'; enemyShots.forEach(shot => ctx.fillRect(shot.x, shot.y, 4, 12));
    if (state !== 'running') {
      ctx.fillStyle = '#0e131ce8'; ctx.fillRect(134, 167, 452, 84);
      ctx.textAlign = 'center'; ctx.fillStyle = '#edf0f7'; ctx.font = '500 24px system-ui, sans-serif';
      ctx.fillText(({ ready: 'Defenda seu espaço.', paused: 'Pausa', won: 'Formação eliminada', lost: 'Fim da defesa' })[state], 360, 200);
      ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#bac6d9';
      ctx.fillText(state === 'paused' ? 'Use Continuar para voltar.' : state === 'ready' ? 'Inicie quando estiver pronto.' : `${eliminated} de 18 alvos eliminados`, 360, 228);
    }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; lastTime = 0; clearInputs(); }
  function pause() {
    if (state !== 'running') return;
    stop(); setState('paused', 'Partida pausada. Use Continuar para voltar.'); draw();
  }
  function resume() {
    if (state !== 'paused' || document.hidden || disposed) return;
    setState('running', 'Defenda a nave e elimine os alvos.');
    field.focus({ preventScroll: true }); lastTime = 0; raf = requestAnimationFrame(tick);
  }
  function fire() {
    if (state !== 'running' || fireCooldown > 0 || shots.length >= 4) return;
    shots.push({ x: playerX + 16, y: 329 }); fireCooldown = .24;
  }
  function end(won) {
    stop(); setState(won ? 'won' : 'lost', won ? 'Você eliminou os 18 invasores. Vitória!' : `Fim da partida. ${eliminated} alvos eliminados. Reinicie para tentar novamente.`); draw();
  }
  function tick(time) {
    raf = 0;
    if (state !== 'running' || disposed) return;
    if (document.hidden) { pause(); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .035) : 0;
    lastTime = time; invulnerable = Math.max(0, invulnerable - dt);
    playerX = Math.max(18, Math.min(666, playerX + (Number(pressed('right')) - Number(pressed('left'))) * 330 * dt));
    fireCooldown = Math.max(0, fireCooldown - dt);
    if (pressed('fire')) fire();
    const alienSpeed = 38 + eliminated * 3.1;
    aliens.forEach(alien => { alien.x += direction * alienSpeed * dt; });
    if (aliens.some(alien => alien.x < 20 || alien.x + 28 > 700)) {
      direction *= -1;
      aliens.forEach(alien => { alien.y += 18; alien.x = Math.max(20, Math.min(672, alien.x)); });
    }
    shots.forEach(shot => { shot.y -= 445 * dt; });
    enemyShots.forEach(shot => { shot.y += (160 + eliminated * 3) * dt; });
    for (const shot of shots) {
      const hit = aliens.findIndex(alien => shot.x + 3 >= alien.x && shot.x <= alien.x + 28 && shot.y <= alien.y + 21 && shot.y + 12 >= alien.y);
      if (hit >= 0) { aliens.splice(hit, 1); shot.y = -100; eliminated++; scoreNode.textContent = eliminated; }
    }
    shots = shots.filter(shot => shot.y > -15);
    if (aliens.length === 0) { end(true); return; }
    enemyCooldown -= dt;
    if (enemyCooldown <= 0 && enemyShots.length < 7) {
      const columns = [...new Set(aliens.map(alien => alien.column))];
      const column = columns[Math.floor(Math.random() * columns.length)];
      const shooter = aliens.filter(alien => alien.column === column).reduce((a, b) => a.y > b.y ? a : b);
      enemyShots.push({ x: shooter.x + 12, y: shooter.y + 22 });
      enemyCooldown = .9 + Math.random() * .55;
    }
    if (!invulnerable && enemyShots.some(shot => shot.x + 4 > playerX && shot.x < playerX + 36 && shot.y + 12 >= 333 && shot.y <= 359)) {
      lives--; livesNode.textContent = lives; invulnerable = 1.4; enemyShots = [];
      if (lives <= 0) { end(false); return; }
      status.textContent = `Nave atingida. ${lives === 1 ? 'Uma vida restante' : `${lives} vidas restantes`}.`;
    }
    enemyShots = enemyShots.filter(shot => shot.y < 390);
    if (aliens.some(alien => alien.y + 21 >= 333)) { end(false); return; }
    draw(); raf = requestAnimationFrame(tick);
  }
  function start() {
    if (disposed || document.hidden) return;
    stop(); aliens = formation(); shots = []; enemyShots = []; direction = 1;
    playerX = 342; lives = 3; eliminated = 0; invulnerable = 0; fireCooldown = 0; enemyCooldown = 1.1;
    livesNode.textContent = '3'; scoreNode.textContent = '0';
    setState('running', 'Defenda a nave e elimine os alvos.');
    field.focus({ preventScroll: true }); draw(); raf = requestAnimationFrame(tick);
  }
  const listen = (node, event, handler) => node.addEventListener(event, handler, { signal: abort.signal });
  listen(startButton, 'click', start);
  listen(pauseButton, 'click', () => state === 'paused' ? resume() : pause());
  const keyActions = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire' };
  listen(field, 'keydown', event => {
    if (event.code === 'Escape') { event.preventDefault(); pause(); return; }
    const action = keyActions[event.code];
    if (!action) return;
    event.preventDefault();
    if (state === 'running') { keys.add(action); if (action === 'fire') fire(); }
  });
  listen(field, 'keyup', event => {
    const action = keyActions[event.code];
    if (action) { event.preventDefault(); keys.delete(action); }
  });
  touchButtons.forEach(button => {
    listen(button, 'pointerdown', event => {
      if (state !== 'running') return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.control);
      if (button.dataset.control === 'fire') fire();
    });
    const release = event => pointers.delete(event.pointerId);
    listen(button, 'pointerup', release);
    listen(button, 'pointercancel', release);
    listen(button, 'lostpointercapture', release);
    // Keyboard activation of the touch controls gives one discrete action.
    listen(button, 'click', event => {
      if (event.detail !== 0 || state !== 'running') return;
      if (button.dataset.control === 'fire') fire();
      else playerX = Math.max(18, Math.min(666, playerX + (button.dataset.control === 'left' ? -30 : 30)));
    });
  });
  listen(root, 'focusout', event => { clearInputs(); if (!root.contains(event.relatedTarget)) pause(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  listen(window, 'blur', pause);
  motion.addEventListener('change', () => { root.querySelector('.arcade-motion-note').hidden = !motion.matches; draw(); }, { signal: abort.signal });
  root.querySelector('.arcade-motion-note').hidden = !motion.matches;
  draw();
  return { pause, dispose() { if (disposed) return; disposed = true; stop(); abort.abort(); root.remove(); } };
}
