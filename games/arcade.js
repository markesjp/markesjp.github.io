const loaders = {
  runner: () => import('./runner.js?v=20260930-6'),
  invaders: () => import('./invaders.js?v=20260930-6'),
  puzzle: () => import('./puzzle.js?v=20260930-3'),
};
const names = { runner: 'Corrida', invaders: 'Invasores', puzzle: 'Quebra-cabeça' };

export function initArcade() {
  const stage = document.querySelector('#arcade-stage');
  if (!stage || stage.dataset.arcadeInitialized === 'true') return;
  stage.dataset.arcadeInitialized = 'true';
  // Game status has its own live region; constantly changing scores stay quiet.
  stage.setAttribute('aria-live', 'off');
  const buttons = [...document.querySelectorAll('[data-game]')]
    .filter(button => Object.hasOwn(loaders, button.dataset.game));
  const abort = new AbortController();
  const frame = document.getElementById('arcade-frame');
  const fitButton = document.getElementById('arcade-fit-toggle');
  const motionButton = document.getElementById('arcade-motion-toggle');
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionChoice = null;
  try {
    const stored = localStorage.getItem('jp-arcade-motion');
    if (stored === 'enabled' || stored === 'reduced') motionChoice = stored;
  } catch {}
  const updateMotion = () => {
    const enabled = motionChoice ? motionChoice === 'enabled' : !motionMedia.matches;
    document.documentElement.dataset.arcadeMotion = enabled ? 'enabled' : 'reduced';
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(enabled));
      motionButton.setAttribute('aria-label', enabled ? 'Reduzir animações do jogo' : 'Ativar animações do jogo');
      motionButton.querySelector('.arcade-setting-label').textContent = enabled ? 'Animações ligadas' : 'Animações reduzidas';
    }
    window.dispatchEvent(new CustomEvent('jp-motion-change', {detail: {enabled}}));
  };
  motionButton?.addEventListener('click', () => {
    motionChoice = document.documentElement.dataset.arcadeMotion === 'enabled' ? 'reduced' : 'enabled';
    try { localStorage.setItem('jp-arcade-motion', motionChoice); } catch {}
    updateMotion();
  }, {signal: abort.signal});
  motionMedia.addEventListener('change', updateMotion, {signal: abort.signal});
  updateMotion();
  let mounted = null;
  let selected = null;
  let generation = 0;
  let disposed = false;
  let observer = null;
  let inView = true;
  let fit = false, placeholder = null, returnFocus = null, inertElements = [];
  let fitResize = null, fitSizing = 0;

  const sizeFit = () => {
    if (!fit || !frame) return;
    const scene = frame.querySelector('.arcade-puzzle-scene') || frame.querySelector('.arcade-game > .arcade-playfield');
    if (!scene) return;
    const overhead = frame.getBoundingClientRect().height - scene.getBoundingClientRect().height;
    const canvas = scene.querySelector('canvas');
    let naturalHeight;
    if (canvas) naturalHeight = scene.clientWidth * canvas.height / canvas.width;
    else {
      const style = getComputedStyle(scene);
      const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      naturalHeight = Math.min(320, scene.clientWidth - horizontal) + vertical;
    }
    const compact = window.matchMedia('(min-width:560px) and (max-height:500px)').matches;
    const height = compact ? window.innerHeight - 24 : Math.min(window.innerHeight - 24, Math.ceil(overhead + naturalHeight));
    const current = parseFloat(frame.style.getPropertyValue('--arcade-fit-height'));
    if (!Number.isFinite(current) || Math.abs(current - height) > 1) frame.style.setProperty('--arcade-fit-height', `${height}px`);
  };
  const observeFit = () => {
    fitResize?.disconnect();
    if (!fit) return;
    sizeFit();
    if ('ResizeObserver' in window) {
      fitResize = new ResizeObserver(scheduleFit);
      fitResize.observe(frame);
      frame.querySelectorAll('.arcade-settings,.arcade-game-head,.arcade-game-info,.arcade-help,.arcade-instructions,.arcade-status,.arcade-controls,.arcade-motion-note').forEach(element => fitResize.observe(element));
    }
  };
  const scheduleFit = () => {
    if (!fit || fitSizing) return;
    fitSizing = requestAnimationFrame(() => { fitSizing = 0; sizeFit(); });
  };
  window.addEventListener('resize', scheduleFit, {signal: abort.signal});

  const setFit = enabled => {
    if (!frame || !fitButton || enabled === fit) return;
    fit = enabled;
    if (fit) {
      returnFocus = document.activeElement;
      placeholder = document.createComment('arcade-frame-position');
      frame.before(placeholder);
      document.body.append(frame);
      inertElements = [...document.body.children].filter(element => element !== frame)
        .map(element => [element, element.inert]);
      inertElements.forEach(([element]) => { element.inert = true; });
      frame.setAttribute('role', 'dialog');
      frame.setAttribute('aria-modal', 'true');
      frame.setAttribute('aria-label', 'Jogo enquadrado na tela');
      frame.setAttribute('tabindex', '-1');
      frame.dataset.fit = 'true';
      document.body.classList.add('arcade-fit-open');
    } else {
      fitResize?.disconnect(); fitResize = null;
      cancelAnimationFrame(fitSizing); fitSizing = 0;
      frame.style.removeProperty('--arcade-fit-height');
      inertElements.forEach(([element, previous]) => { element.inert = previous; });
      inertElements = [];
      if (placeholder?.parentNode) { placeholder.before(frame); placeholder.remove(); }
      placeholder = null;
      frame.removeAttribute('role'); frame.removeAttribute('aria-modal');
      frame.removeAttribute('aria-label'); frame.removeAttribute('tabindex');
      delete frame.dataset.fit;
      document.body.classList.remove('arcade-fit-open');
    }
    fitButton.setAttribute('aria-pressed', String(fit));
    fitButton.querySelector('.arcade-setting-label').textContent = fit ? 'Sair do enquadramento' : 'Enquadrar jogo';
    fitButton.querySelector('use')?.setAttribute('href', `assets/icons.svg?v=20260930-3#${fit ? 'minimize' : 'maximize'}`);
    if (fit) observeFit();
    if (fit) fitButton.focus({preventScroll: true});
    else if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    window.dispatchEvent(new CustomEvent('jp-fit-change', {detail: {fit}}));
  };
  fitButton?.addEventListener('click', () => setFit(!fit), {signal: abort.signal});
  // Browser focus/scroll can expose a control while hiding the game heading.
  // Keep the complete game visible when starting, pausing or using controls.
  frame?.addEventListener('click', event => {
    if (fit || !event.target.closest('.arcade-controls button')) return;
    const header = document.querySelector('.header');
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const available = window.innerHeight - (header?.getBoundingClientRect().height || 0) - 32;
    const bounds = frame.getBoundingClientRect();
    if (bounds.height > available) setFit(true);
    else if (bounds.top < headerBottom + 16 || bounds.bottom > window.innerHeight - 16) {
      frame.scrollIntoView({block: 'start', behavior: motionMedia.matches ? 'auto' : 'smooth'});
    }
  }, {capture: true, signal: abort.signal});
  frame?.addEventListener('keydown', event => {
    if (!fit) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setFit(false); return; }
    if (event.key !== 'Tab') return;
    const controls = [...frame.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')]
      .filter(element => element.getClientRects().length && !element.closest('[hidden]'));
    if (!controls.length) { event.preventDefault(); frame.focus(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === frame)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, {signal: abort.signal});

  const suspend = () => {
    if (((!fit && !inView) || document.hidden) && mounted) mounted.pause?.();
  };
  const updateUrl = game => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('jogo', game);
      window.history.replaceState(null, '', url);
    } catch { /* The arcade also works in static file previews. */ }
  };
  async function select(game, { updateHistory = true } = {}) {
    if (disposed || !Object.hasOwn(loaders, game)) return;
    if (selected === game && mounted) return;
    const request = ++generation;
    mounted?.dispose();
    mounted = null;
    selected = game;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.game === game)));
    stage.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'arcade-loading';
    loading.setAttribute('role', 'status');
    loading.textContent = `Carregando ${names[game].toLowerCase()}…`;
    stage.append(loading);
    stage.setAttribute('aria-busy', 'true');
    if (updateHistory) updateUrl(game);
    try {
      const module = await loaders[game]();
      if (disposed || request !== generation) return;
      stage.replaceChildren();
      mounted = module.mount(stage);
      const gameRoot = stage.querySelector('.arcade-game');
      if (gameRoot) {
        const info = document.createElement('div');
        info.className = 'arcade-game-info';
        gameRoot.querySelectorAll('.arcade-puzzle-goal,.arcade-instructions,.arcade-status,.arcade-controls,.arcade-motion-note').forEach(element => info.append(element));
        gameRoot.append(info);
        const instructions = info.querySelector('.arcade-instructions');
        if (instructions) {
          const help = document.createElement('details');
          help.className = 'arcade-help';
          const summary = document.createElement('summary');
          summary.textContent = 'Como jogar';
          const copy = document.createElement('p');
          copy.className = 'arcade-help-copy';
          copy.textContent = instructions.textContent;
          help.append(summary, copy);
          instructions.before(help);
        }
      }
      if (fit) observeFit();
      suspend();
    } catch {
      if (disposed || request !== generation) return;
      stage.replaceChildren();
      const error = document.createElement('div');
      error.className = 'arcade-loading';
      const message = document.createElement('p');
      message.setAttribute('role', 'status');
      message.textContent = 'Não foi possível carregar este jogo. Tente novamente.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Tentar novamente';
      retry.addEventListener('click', () => select(game), { signal: abort.signal });
      error.append(message, retry);
      stage.append(error);
    } finally {
      if (request === generation) stage.setAttribute('aria-busy', 'false');
    }
  }
  buttons.forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-controls', 'arcade-stage');
    button.addEventListener('click', () => select(button.dataset.game), { signal: abort.signal });
  });
  document.addEventListener('visibilitychange', suspend, { signal: abort.signal });
  const requested = new URLSearchParams(window.location.search).get('jogo');
  if (Object.hasOwn(loaders, requested)) select(requested, { updateHistory: false });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView && selected === null) select('runner', { updateHistory: false });
      suspend();
    }, { threshold: 0 });
    observer.observe(stage.closest('#arcade') || stage);
  } else if (selected === null) {
    const placeholder = document.createElement('p');
    placeholder.className = 'arcade-loading';
    placeholder.textContent = 'Escolha um jogo para carregar.';
    stage.append(placeholder);
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++generation;
    setFit(false);
    abort.abort();
    observer?.disconnect();
    mounted?.dispose();
    mounted = null;
    stage.removeAttribute('aria-busy');
    delete stage.dataset.arcadeInitialized;
  };
  // A page restored from bfcache retains the mounted UI, paused by pagehide.
  window.addEventListener('pagehide', event => event.persisted ? mounted?.pause?.() : dispose(), { signal: abort.signal });
  return { dispose, select };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initArcade(), { once: true });
} else {
  initArcade();
}
