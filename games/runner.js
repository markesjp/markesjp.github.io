export function mount(host) {
  const abort = new AbortController();
  const id = `runner-${Math.random().toString(36).slice(2, 8)}`;
  const root = document.createElement('article');
  root.className = 'arcade-game';
  root.innerHTML = `
    <div class="arcade-game-head"><h3>Corrida de obstáculos</h3><p class="arcade-score" aria-live="off">Pontos: <span data-score>0</span> / 1.000</p></div>
    <div class="arcade-playfield" tabindex="0" role="group" aria-label="Área da corrida" aria-describedby="${id}-instructions">
      <canvas width="720" height="300" role="img" aria-label="Personagem salta obstáculos em uma pista horizontal"></canvas>
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
  const onMotion = () => { motionNote.hidden = !motion.matches; draw(); };
  const GROUND = 244;
  let state = 'ready', raf = 0, lastTime = 0, elapsed = 0;
  let y = GROUND - 40, velocity = 0, obstacles = [], nextSpawn = 1.4;
  let score = 0, disposed = false;

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
    ctx.fillStyle = '#0e131c'; ctx.fillRect(0, 0, 720, 300);
    ctx.strokeStyle = '#3d4d64'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, GROUND + .5); ctx.lineTo(700, GROUND + .5); ctx.stroke();
    // Decorative marks are static when reduced motion is requested.
    const offset = motion.matches ? 0 : (elapsed * 115) % 96;
    ctx.fillStyle = '#263347';
    for (let x = 24 - offset; x < 720; x += 96) ctx.fillRect(x, 264, 28, 2);
    ctx.fillStyle = '#c4d0f3'; ctx.fillRect(82, y, 30, 34);
    ctx.fillRect(98, y - 8, 22, 21);
    ctx.fillStyle = '#101620'; ctx.fillRect(112, y - 2, 4, 4);
    ctx.fillStyle = '#c4d0f3';
    const stride = !motion.matches && state === 'running' && y >= GROUND - 40 && Math.floor(elapsed * 10) % 2;
    ctx.fillRect(85, y + 34, 8, stride ? 4 : 6);
    ctx.fillRect(103, y + 34, 8, stride ? 6 : 4);
    ctx.fillStyle = '#d7ab87';
    obstacles.forEach(obstacle => {
      ctx.fillRect(obstacle.x, GROUND - obstacle.h, obstacle.w, obstacle.h);
      ctx.fillRect(obstacle.x - 5, GROUND - obstacle.h + 10, 5, 9);
      ctx.fillRect(obstacle.x + obstacle.w, GROUND - obstacle.h + 17, 5, 10);
    });
    if (state !== 'running') {
      ctx.fillStyle = '#0e131cd9'; ctx.fillRect(168, 78, 405, 80);
      ctx.fillStyle = '#edf0f7'; ctx.textAlign = 'center';
      ctx.font = '500 24px system-ui, sans-serif';
      ctx.fillText(({ ready: 'Um salto de cada vez.', paused: 'Pausa', lost: 'Fim da corrida', won: 'Percurso concluído' })[state], 370, 111);
      ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#b9c5d9';
      ctx.fillText(state === 'paused' ? 'Use Continuar para voltar.' : state === 'ready' ? 'Inicie quando estiver pronto.' : `Sua pontuação: ${score}`, 370, 139);
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
    velocity += 1580 * dt; y = Math.min(GROUND - 40, y + velocity * dt);
    if (y >= GROUND - 40) velocity = 0;
    const speed = Math.min(390, 255 + elapsed * 3);
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
  onMotion();
  return { pause, dispose() { if (disposed) return; disposed = true; stop(); abort.abort(); root.remove(); } };
}
