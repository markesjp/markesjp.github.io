const loaders = {
  runner: () => import('./runner.js'),
  invaders: () => import('./invaders.js'),
  puzzle: () => import('./puzzle.js'),
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
  let mounted = null;
  let selected = null;
  let generation = 0;
  let disposed = false;
  let observer = null;
  let inView = true;

  const suspend = () => {
    if ((!inView || document.hidden) && mounted) mounted.pause?.();
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
