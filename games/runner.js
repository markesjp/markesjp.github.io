import { palette, mix, path, panel, reducedMotion } from './scene.js?v=20260930-3';

// Eight distinct running poses: front/back stride, lifted boots, bob and arms.
const RUN_CYCLE = [
  [-10, 8, 0, 5, -1, 7], [-5, 10, 0, 8, -2, 5],
  [1, 6, 0, 6, -3, 1], [8, -2, 1, 0, -2, -5],
  [10, -8, 5, 0, -1, -7], [5, -10, 8, 0, -2, -5],
  [-1, -6, 6, 0, -3, -1], [-8, 2, 0, 1, -2, 5],
];

export function mount(host) {
  const abort = new AbortController();
  const id = `runner-${Math.random().toString(36).slice(2, 8)}`;
  const root = document.createElement('article');
  root.className = 'arcade-game';
  root.innerHTML = `
    <div class="arcade-game-head"><h3>Corrida de obstáculos</h3><p class="arcade-score" aria-live="off">Pontos: <span data-score>0</span> / 1.000</p></div>
    <div class="arcade-playfield" tabindex="0" role="group" aria-label="Área da corrida" aria-describedby="${id}-instructions">
      <canvas width="720" height="300" role="img" aria-label="Explorador corre e salta entre rochas de um deserto com montanhas ao fundo"></canvas>
    </div>
    <p class="arcade-instructions" id="${id}-instructions">Pule com Espaço, ↑ ou o botão Pular. Escape pausa. Alcance 1.000 pontos sem bater. Clique em Iniciar e mantenha o foco na pista para usar o teclado.</p>
    <p class="arcade-status" role="status" aria-live="polite">Pronto para correr.</p>
    <div class="arcade-controls"><button type="button" class="arcade-primary" data-start>Iniciar</button><button type="button" data-pause disabled>Pausar</button><button type="button" class="arcade-touch-control" data-jump disabled>Pular ↑</button></div>
    <p class="arcade-motion-note" hidden>Movimento reduzido: sem efeitos decorativos. A pista continua em movimento durante a partida; você pode pausá-la a qualquer momento.</p>`;
  host.append(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { root.remove(); throw new Error('Canvas indisponível'); }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 720 * dpr;
  canvas.height = 300 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const field = root.querySelector('.arcade-playfield');
  const scoreNode = root.querySelector('[data-score]');
  const status = root.querySelector('.arcade-status');
  const startButton = root.querySelector('[data-start]');
  const pauseButton = root.querySelector('[data-pause]');
  const jumpButton = root.querySelector('[data-jump]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionNote = root.querySelector('.arcade-motion-note');
  let reduce = reducedMotion();
  const onMotion = () => { reduce = reducedMotion(); motionNote.hidden = !reduce; if (reduce) particles = []; draw(); };
  const GROUND = 244;
  let state = 'ready', raf = 0, lastTime = 0, elapsed = 0;
  let y = GROUND - 40, velocity = 0, obstacles = [], nextSpawn = 1.4;
  let score = 0, disposed = false;
  let colors = palette(), distance = 0, landing = 0, dustClock = 0, particles = [];

  function setState(next, message) {
    state = next;
    status.textContent = message;
    const running = next === 'running';
    pauseButton.disabled = !running && next !== 'paused';
    pauseButton.textContent = next === 'paused' ? 'Continuar' : 'Pausar';
    jumpButton.disabled = !running;
    startButton.textContent = next === 'ready' ? 'Iniciar' : 'Reiniciar';
    root.dataset.state = next;
  }
  function draw() {
    const decorDistance = reduce ? 0 : distance;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, colors.bg); sky.addColorStop(1, mix(colors.bg, colors.obstacle, .13));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 720, 300);
    // A low sun/moon anchors the horizon, while ridges scroll at separate speeds.
    ctx.save(); ctx.globalAlpha = colors.light ? .75 : .25;
    ctx.fillStyle = colors.obstacle; ctx.beginPath(); ctx.arc(600, 72, 32, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .18; ctx.strokeStyle = colors.obstacle;
    ctx.beginPath(); ctx.arc(600, 72, 44, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (!colors.light) {
      ctx.fillStyle = mix(colors.bg, colors.star, .48);
      for (let i = 0; i < 20; i++) ctx.fillRect((i * 137 + 25) % 720, (i * 29 + 18) % 95, 1, 1);
    }
    const ridge = (base, height, speed, shade, step) => {
      const offset = (decorDistance * speed) % step;
      const points = [[-step, GROUND]];
      for (let x = -step; x <= 720 + step; x += step) {
        points.push([x - offset, base], [x + step * .28 - offset, base - height], [x + step * .55 - offset, base - height * .74], [x + step * .82 - offset, base - height * .21]);
      }
      points.push([720 + step, GROUND]); path(ctx, points, mix(colors.bg, colors.obstacle, shade));
    };
    ridge(203, 78, .055, .13, 274);
    ridge(222, 51, .15, .2, 192);
    ridge(242, 25, .32, .29, 162);
    // Foreground track moves at the same speed as the gameplay obstacles.
    ctx.fillStyle = mix(colors.bg, colors.obstacle, .16); ctx.fillRect(0, GROUND, 720, 56);
    ctx.fillStyle = mix(colors.bg, colors.obstacle, .64); ctx.fillRect(0, GROUND, 720, 2);
    ctx.fillStyle = mix(colors.bg, colors.obstacle, .31);
    for (let i = -1; i < 15; i++) {
      const x = i * 61 - decorDistance % 61;
      ctx.fillRect(x, 260 + (i % 3) * 7, 10 + (i % 2) * 5, 2);
      ctx.fillRect(x + 26, 283 - (i % 3) * 2, 4, 2);
    }
    ctx.fillStyle = mix(colors.bg, colors.ink, .09);
    ctx.beginPath(); ctx.ellipse(101, GROUND + 4, 23 - (GROUND - 40 - y) * .08, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Compact desert courier: articulated boots, visor, satchel and scarf.
    const airborne = y < GROUND - 40 - 1;
    const animate = !reduce && (state === 'running' || state === 'paused');
    const pose = animate && !airborne ? RUN_CYCLE[Math.floor(elapsed * 14) % RUN_CYCLE.length] : [0, 0, 0, 0, 0, 0];
    const [frontStride, backStride, frontLift, backLift, bob, arms] = pose;
    const squash = reduce ? 0 : Math.max(0, landing / .16);
    const stretch = !reduce && airborne && velocity < 0 ? .035 : 0;
    ctx.save(); ctx.translate(82, y + 40 + bob);
    ctx.scale(1 + squash * .09 - stretch, 1 - squash * .18 + stretch);
    const leg = (hip, stride, lift, back = false) => {
      ctx.strokeStyle = mix(colors.player, colors.bg, back ? .4 : .14); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(hip, -14); ctx.lineTo(hip + stride * .45, -8 - lift * .45);
      ctx.lineTo(hip + stride, -3 - lift - bob); ctx.stroke();
      ctx.fillStyle = mix(colors.player, colors.bg, back ? .4 : .12);
      ctx.fillRect(hip + stride - 2, -5 - lift - bob, 9, 5);
    };
    ctx.lineCap = 'round';
    leg(8, airborne ? -5 : backStride, airborne ? 7 : backLift, true);
    leg(23, airborne ? 6 : frontStride, airborne ? 4 : frontLift);
    // The far arm swings in opposition before the torso is drawn.
    ctx.lineWidth = 5; ctx.strokeStyle = mix(colors.player, colors.bg, .4);
    ctx.beginPath(); ctx.moveTo(7, -26); ctx.lineTo(3 - arms * .6, -18); ctx.lineTo(7 - arms, -12); ctx.stroke();
    ctx.fillStyle = colors.player; ctx.fillRect(2, -37, 29, 26);
    ctx.fillStyle = mix(colors.player, colors.bg, .18); ctx.fillRect(-4, -32, 10, 17);
    ctx.fillStyle = colors.player; ctx.fillRect(11, -48, 24, 20);
    ctx.fillStyle = mix(colors.bg, colors.player, .08); ctx.fillRect(18, -42, 17, 7);
    ctx.fillStyle = colors.projectile; ctx.fillRect(29, -40, 3, 3);
    ctx.fillStyle = colors.obstacle;
    ctx.fillRect(8, -29, 25, 4);
    const flutter = animate ? Math.sin(elapsed * 13) * 5 : 1;
    path(ctx, [[10, -27], [-17, -23 + flutter], [-11, -30 - flutter * .4], [9, -30]], colors.obstacle);
    ctx.lineWidth = 5; ctx.strokeStyle = mix(colors.player, colors.bg, .16);
    ctx.beginPath(); ctx.moveTo(26, -25);
    ctx.lineTo(29 + arms * .4, airborne ? -25 : -19);
    ctx.lineTo(31 + arms, airborne ? -31 : -13); ctx.stroke();
    ctx.fillStyle = colors.obstacle; ctx.fillRect(28 + arms, airborne ? -33 : -15, 6, 5);
    ctx.restore();
    obstacles.forEach(obstacle => {
      const x = obstacle.x, top = GROUND - obstacle.h;
      path(ctx, [[x, GROUND], [x + 2, top + 8], [x + obstacle.w * .45, top], [x + obstacle.w, top + 9], [x + obstacle.w, GROUND]], colors.obstacle);
      path(ctx, [[x + obstacle.w * .45, top], [x + obstacle.w, top + 9], [x + obstacle.w, GROUND], [x + obstacle.w * .62, GROUND]], mix(colors.obstacle, colors.bg, .25));
      ctx.strokeStyle = mix(colors.obstacle, colors.ink, .25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 5, top + 14); ctx.lineTo(x + obstacle.w * .45, top + 10); ctx.stroke();
    });
    if (!reduce) particles.forEach(particle => {
      ctx.globalAlpha = particle.life / particle.duration;
      ctx.fillStyle = colors.obstacle; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
    if (state !== 'running') {
      panel(ctx, colors, ({ ready: 'Um salto de cada vez.', paused: 'Pausa', lost: 'Fim da corrida', won: 'Percurso concluído' })[state], state === 'paused' ? 'Use Continuar para voltar.' : state === 'ready' ? 'Uma travessia pelo deserto.' : `Sua pontuação: ${score}`, 194, 74, 332);
    }
  }
  function dust(count) {
    if (reduce) return;
    for (let i = 0; i < count && particles.length < 28; i++) {
      const duration = .3 + Math.random() * .24;
      particles.push({ x: 91, y: GROUND - 2, vx: -35 - Math.random() * 55, vy: -18 - Math.random() * 30, size: 2 + Math.random() * 2, life: duration, duration });
    }
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
  function pause() {
    if (state !== 'running') return;
    stop(); setState('paused', 'Partida pausada. Use Continuar para voltar.'); draw();
  }
  function resume() {
    if (state !== 'paused' || document.hidden || disposed) return;
    setState('running', 'Correndo. Pule os obstáculos.');
    lastTime = 0; field.focus({ preventScroll: true }); raf = requestAnimationFrame(tick);
  }
  function jump() {
    if (state === 'running' && y >= GROUND - 40 - .5) velocity = -590;
  }
  function end(won) {
    stop(); setState(won ? 'won' : 'lost', won ? 'Você concluiu o percurso com 1.000 pontos!' : `Você bateu em um obstáculo. ${score} pontos. Reinicie para tentar novamente.`); draw();
  }
  function tick(time) {
    raf = 0;
    if (state !== 'running' || disposed) return;
    if (document.hidden) { pause(); return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .04) : 0;
    lastTime = time; elapsed += dt;
    const wasAirborne = y < GROUND - 40 - 1;
    velocity += 1580 * dt; y = Math.min(GROUND - 40, y + velocity * dt);
    landing = Math.max(0, landing - dt);
    if (y >= GROUND - 40) {
      velocity = 0;
      if (wasAirborne) { landing = .16; dust(9); }
      dustClock += dt;
      if (dustClock > .12) { dust(1); dustClock = 0; }
    }
    const speed = Math.min(390, 255 + elapsed * 3);
    distance += speed * dt;
    particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; });
    particles = particles.filter(p => p.life > 0);
    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      obstacles.push({ x: 740, w: 18 + Math.random() * 11, h: 30 + Math.random() * 24 });
      nextSpawn = 1.25 + Math.random() * .65;
    }
    obstacles.forEach(obstacle => { obstacle.x -= speed * dt; });
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.w > -10);
    // A small inset matches the visible body and forgives the tiny feet.
    if (obstacles.some(o => 86 < o.x + o.w && 111 > o.x && y + 36 > GROUND - o.h && y + 4 < GROUND)) { end(false); return; }
    const nextScore = Math.min(1000, Math.floor(elapsed * 25));
    if (nextScore !== score) { score = nextScore; scoreNode.textContent = score; }
    if (score >= 1000) { end(true); return; }
    draw(); raf = requestAnimationFrame(tick);
  }
  function start() {
    if (disposed || document.hidden) return;
    stop(); elapsed = 0; score = 0; scoreNode.textContent = '0';
    y = GROUND - 40; velocity = 0; obstacles = []; nextSpawn = 1.4;
    distance = 0; landing = 0; dustClock = 0; particles = [];
    setState('running', 'Correndo. Pule os obstáculos.');
    field.focus({ preventScroll: true }); draw(); raf = requestAnimationFrame(tick);
  }
  const listen = (node, event, handler) => node.addEventListener(event, handler, { signal: abort.signal });
  listen(startButton, 'click', start);
  listen(pauseButton, 'click', () => state === 'paused' ? resume() : pause());
  listen(jumpButton, 'pointerdown', event => { event.preventDefault(); jump(); });
  listen(jumpButton, 'click', event => { if (event.detail === 0) jump(); });
  listen(field, 'keydown', event => {
    if (event.code === 'Escape') { event.preventDefault(); pause(); }
    if (['Space', 'ArrowUp'].includes(event.code)) { event.preventDefault(); if (!event.repeat) jump(); }
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  listen(window, 'blur', pause);
  // Clicking the game's own controls transfers focus from the field; focusout
  // is handled at the root so the pause button can keep its intended action.
  listen(root, 'focusout', event => { if (!root.contains(event.relatedTarget)) pause(); });
  motion.addEventListener('change', onMotion, { signal: abort.signal });
  listen(window, 'jp-motion-change', onMotion);
  listen(window, 'jp-theme-change', () => { colors = palette(); draw(); });
  onMotion();
  return { pause, dispose() { if (disposed) return; disposed = true; stop(); abort.abort(); root.remove(); } };
}
