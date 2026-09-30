import { palette, mix, path, panel } from './scene.js';

export function mount(host) {
  const abort = new AbortController();
  const id = `invaders-${Math.random().toString(36).slice(2, 8)}`;
  const root = document.createElement('article');
  root.className = 'arcade-game';
  root.innerHTML = `
    <div class="arcade-game-head"><h3>Invasores</h3><p class="arcade-score" aria-live="off">Alvos: <span data-score>0</span> / 18 · Vidas: <span data-lives>3</span></p></div>
    <div class="arcade-playfield" tabindex="0" role="group" aria-label="Área de jogo dos invasores" aria-describedby="${id}-instructions"><canvas width="720" height="390" role="img" aria-label="Interceptor defende uma órbita planetária contra uma formação de naves inimigas"></canvas></div>
    <p class="arcade-instructions" id="${id}-instructions">← e → movem a nave; Espaço dispara; Escape pausa. No celular, segure os botões. Elimine os 18 alvos antes que alcancem a nave. Você tem três vidas.</p>
    <p class="arcade-status" role="status" aria-live="polite">Pronto para defender a órbita.</p>
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
  const stars = Array.from({ length: 62 }, (_, index) => ({ x: (index * 139 + 43) % 720, y: (index * 71 + 17) % 390, depth: 1 + index % 3 }));
  let state = 'ready', disposed = false, raf = 0, lastTime = 0;
  let playerX = 342, lives = 3, eliminated = 0, invulnerable = 0;
  let aliens = [], shots = [], enemyShots = [], direction = 1, fireCooldown = 0, enemyCooldown = 1;
  let colors = palette(), elapsed = 0, particles = [], muzzle = 0;

  function formation() {
    return Array.from({ length: 18 }, (_, index) => ({ x: 134 + (index % 6) * 70, y: 48 + Math.floor(index / 6) * 40, column: index % 6, kind: Math.floor(index / 6) }));
  }
  aliens = formation();
  function clearInputs() { keys.clear(); pointers.clear(); }
  function pressed(action) {
    if (keys.has(action)) return true;
    for (const value of pointers.values()) if (value === action) return true;
    return false;
  }
  function setState(next, message) {
    state = next; root.dataset.state = next; status.textContent = message;
    pauseButton.disabled = !['running', 'paused'].includes(next);
    pauseButton.textContent = next === 'paused' ? 'Continuar' : 'Pausar';
    startButton.textContent = next === 'ready' ? 'Iniciar' : 'Reiniciar';
    touchButtons.forEach(button => { button.disabled = next !== 'running'; });
  }
  function draw() {
    ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, 720, 390);
    const nebula = ctx.createRadialGradient(490, 115, 5, 490, 115, 390);
    nebula.addColorStop(0, mix(colors.bg, colors.enemy, .15)); nebula.addColorStop(1, colors.bg);
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, 720, 390);
    // Three depth bands drift independently; no drift in reduced-motion mode.
    stars.forEach(star => {
      const y = motion.matches ? star.y : (star.y + elapsed * star.depth * 5) % 390;
      ctx.globalAlpha = .25 + star.depth * .18; ctx.fillStyle = colors.star;
      ctx.fillRect(star.x, y, star.depth === 3 ? 2 : 1, star.depth === 3 ? 2 : 1);
    });
    ctx.globalAlpha = 1;
    // A distant ringed planet provides an orbital setting rather than a flat sky.
    ctx.save(); ctx.translate(610, 269); ctx.rotate(-.28);
    ctx.strokeStyle = mix(colors.bg, colors.enemy, .23); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.ellipse(0, 0, 133, 29, 0, 0, Math.PI * 2); ctx.stroke();
    const planet = ctx.createLinearGradient(-75, -70, 75, 75);
    planet.addColorStop(0, mix(colors.bg, colors.enemy, .29)); planet.addColorStop(1, mix(colors.bg, colors.enemy, .07));
    ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = mix(colors.bg, colors.enemy, .17); ctx.lineWidth = 2;
    [-35, -10, 18, 43].forEach(y => { ctx.beginPath(); ctx.ellipse(0, y, Math.sqrt(80 ** 2 - y ** 2), 9, 0, 0, Math.PI); ctx.stroke(); });
    ctx.strokeStyle = mix(colors.bg, colors.enemy, .3); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, 133, 29, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = mix(colors.bg, colors.grid, .7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(18, 369); ctx.lineTo(702, 369); ctx.stroke();
    for (let x = 24; x < 710; x += 48) { ctx.beginPath(); ctx.moveTo(x, 369); ctx.lineTo(x, 374); ctx.stroke(); }
    aliens.forEach(alien => {
      const wing = motion.matches ? 1 : Math.sin(elapsed * 5 + alien.column * .5) * 2;
      const x = alien.x, y = alien.y;
      const hull = alien.kind === 0 ? colors.obstacle : colors.enemy;
      path(ctx, [[x, y + 15], [x + 5, y + 5 + wing], [x + 11, y + 7], [x + 14, y], [x + 18, y + 7], [x + 23, y + 5 - wing], [x + 28, y + 15], [x + 20, y + 18], [x + 8, y + 18]], hull);
      path(ctx, [[x + 10, y + 7], [x + 14, y + 3], [x + 19, y + 8], [x + 17, y + 12], [x + 12, y + 12]], mix(hull, colors.bg, .65));
      ctx.fillStyle = colors.projectile; ctx.fillRect(x + 13, y + 7, 3, 2);
      ctx.fillStyle = mix(colors.bg, hull, .6);
      ctx.fillRect(x + 4, y + 18, 3, 3 + Math.max(0, wing));
      ctx.fillRect(x + 21, y + 18, 3, 3 + Math.max(0, -wing));
    });
    const engine = motion.matches ? 4 : 5 + Math.sin(elapsed * 25) * 2;
    path(ctx, [[playerX + 12, 358], [playerX + 16, 358 + engine], [playerX + 20, 358]], colors.obstacle);
    path(ctx, [[playerX + 23, 358], [playerX + 27, 358 + engine], [playerX + 31, 358]], colors.obstacle);
    ctx.globalAlpha = invulnerable && !motion.matches ? .68 + Math.sin(elapsed * 6) * .18 : 1;
    path(ctx, [[playerX, 359], [playerX + 3, 347], [playerX + 12, 343], [playerX + 18, 333], [playerX + 24, 343], [playerX + 33, 347], [playerX + 36, 359], [playerX + 24, 355], [playerX + 12, 355]], colors.player);
    path(ctx, [[playerX + 14, 347], [playerX + 18, 339], [playerX + 22, 347], [playerX + 20, 351], [playerX + 16, 351]], mix(colors.player, colors.bg, .73));
    ctx.globalAlpha = 1;
    if (invulnerable) {
      ctx.strokeStyle = mix(colors.bg, colors.player, .6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(playerX + 18, 348, 25, 22, 0, 0, Math.PI * 2); ctx.stroke();
    }
    shots.forEach(shot => {
      ctx.fillStyle = mix(colors.bg, colors.projectile, .25); ctx.fillRect(shot.x, shot.y + 7, 3, 19);
      ctx.fillStyle = colors.projectile; ctx.fillRect(shot.x, shot.y, 3, 12);
    });
    enemyShots.forEach(shot => {
      ctx.fillStyle = mix(colors.bg, colors.danger, .28); ctx.fillRect(shot.x, shot.y - 10, 4, 16);
      ctx.fillStyle = colors.danger; path(ctx, [[shot.x + 2, shot.y], [shot.x + 5, shot.y + 6], [shot.x + 2, shot.y + 12], [shot.x - 1, shot.y + 6]], colors.danger);
    });
    if (!motion.matches) {
      if (muzzle > 0) { ctx.fillStyle = colors.projectile; ctx.fillRect(playerX + 15, 324, 6, 7); }
      particles.forEach(particle => {
        ctx.globalAlpha = particle.life / particle.duration;
        ctx.fillStyle = colors[particle.color]; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      ctx.globalAlpha = 1;
    }
    if (state !== 'running') {
      panel(ctx, colors, ({ ready: 'Defenda seu espaço.', paused: 'Pausa', won: 'Formação eliminada', lost: 'Fim da defesa' })[state], state === 'paused' ? 'Use Continuar para voltar.' : state === 'ready' ? 'Uma formação se aproxima da órbita.' : `${eliminated} de 18 alvos eliminados`, 167, 174, 386);
    }
  }
  function impact(x, y, color) {
    if (motion.matches) return;
    for (let i = 0; i < 11 && particles.length < 64; i++) {
      const angle = (Math.PI * 2 * i) / 11;
      const speed = 22 + Math.random() * 46, duration = .3 + Math.random() * .22;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: i % 3 === 0 ? 3 : 2, life: duration, duration, color });
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
    shots.push({ x: playerX + 16, y: 329 }); fireCooldown = .24; muzzle = .06;
  }
  function end(won) {
    stop(); setState(won ? 'won' : 'lost', won ? 'Você eliminou os 18 invasores. Vitória!' : `Fim da partida. ${eliminated} alvos eliminados. Reinicie para tentar novamente.`); draw();
  }
  function tick(time) {
    raf = 0;
    if (state !== 'running' || disposed) return;
    if (document.hidden) { pause(); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .035) : 0;
    lastTime = time; elapsed += dt; invulnerable = Math.max(0, invulnerable - dt); muzzle = Math.max(0, muzzle - dt);
    particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    particles = particles.filter(p => p.life > 0);
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
      if (hit >= 0) {
        impact(aliens[hit].x + 14, aliens[hit].y + 10, 'enemy');
        aliens.splice(hit, 1); shot.y = -100; eliminated++; scoreNode.textContent = eliminated;
      }
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
      impact(playerX + 18, 347, 'danger');
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
    elapsed = 0; particles = []; muzzle = 0;
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
  listen(window, 'jp-theme-change', () => { colors = palette(); draw(); });
  motion.addEventListener('change', () => { root.querySelector('.arcade-motion-note').hidden = !motion.matches; draw(); }, { signal: abort.signal });
  root.querySelector('.arcade-motion-note').hidden = !motion.matches;
  draw();
  return { pause, dispose() { if (disposed) return; disposed = true; stop(); abort.abort(); root.remove(); } };
}
