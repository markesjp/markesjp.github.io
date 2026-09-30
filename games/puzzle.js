import { reducedMotion } from './scene.js?v=20260930-3';

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
function adjacent(index, empty) {
  return Math.abs(Math.floor(index / 3) - Math.floor(empty / 3)) + Math.abs(index % 3 - empty % 3) === 1;
}
function solved(board) { return board.every((number, index) => number === GOAL[index]); }
function shuffle() {
  const board = [...GOAL];
  let empty = 8, previous = -1;
  // Every shuffle is a sequence of legal moves from the goal: always solvable.
  do {
    for (let step = 0; step < 100; step++) {
      const candidates = board.map((_, index) => index).filter(index => index !== previous && adjacent(index, empty));
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      [board[empty], board[next]] = [board[next], board[empty]];
      previous = empty; empty = next;
    }
  } while (solved(board));
  return board;
}

export function mount(host) {
  const abort = new AbortController();
  const id = `puzzle-${Math.random().toString(36).slice(2, 8)}`;
  const root = document.createElement('article');
  root.className = 'arcade-game';
  root.innerHTML = `
    <div class="arcade-game-head"><h3>Oito peças, um espaço</h3><p class="arcade-score" aria-live="off">Movimentos: <span data-score>0</span></p></div>
    <div class="arcade-puzzle-scene">
      <svg class="arcade-puzzle-art" viewBox="0 0 760 380" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><pattern id="${id}-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="var(--arcade-canvas-grid)" stroke-width=".65"/></pattern></defs>
        <rect width="760" height="380" fill="url(#${id}-grid)"/>
        <g fill="none" stroke="var(--arcade-player)" stroke-width="1"><circle cx="620" cy="172" r="91"/><circle cx="620" cy="172" r="72"/><circle cx="620" cy="172" r="48"/><path d="M505 172h230M620 55v235M26 315h166M26 321h55"/></g>
        <g fill="none" stroke="var(--arcade-obstacle)"><path d="M0 144C80 112 82 215 149 188S200 134 246 178M0 165C90 125 88 245 151 212S202 156 248 204M0 187C100 148 83 268 154 238S209 175 253 232"/></g>
      </svg>
      <div class="arcade-puzzle-board arcade-playfield" tabindex="0" role="group" aria-label="Tabuleiro deslizante três por três" aria-describedby="${id}-instructions"></div>
    </div>
    <p class="arcade-puzzle-goal">Objetivo: 1 2 3 / 4 5 6 / 7 8 □</p>
    <p class="arcade-instructions" id="${id}-instructions">Clique em uma peça ao lado do espaço vazio para deslizá-la. Com o foco no tabuleiro, as setas movem o espaço vazio. Ordene de 1 a 8, deixando o vazio no canto inferior direito. Todo tabuleiro gerado tem solução.</p>
    <p class="arcade-status" role="status" aria-live="polite">Este é o objetivo. Inicie para embaralhar.</p>
    <div class="arcade-controls"><button type="button" class="arcade-primary" data-start>Iniciar</button></div>`;
  host.append(root);
  const boardNode = root.querySelector('.arcade-puzzle-board');
  const status = root.querySelector('.arcade-status');
  const scoreNode = root.querySelector('[data-score]');
  const startButton = root.querySelector('[data-start]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let board = [...GOAL], moves = 0, state = 'ready', disposed = false;
  let activeAnimation = null, animationGeneration = 0;
  const buttons = GOAL.map(number => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.tile = number;
    if (number) {
      const goalIndex = number - 1;
      button.innerHTML = `<svg class="arcade-puzzle-tile-art" viewBox="${(goalIndex % 3) * 100} ${Math.floor(goalIndex / 3) * 100} 100 100" aria-hidden="true">
        <g fill="none" stroke="var(--arcade-player)" stroke-width="1.5"><circle cx="161" cy="149" r="108"/><circle cx="161" cy="149" r="88"/><circle cx="161" cy="149" r="67"/><circle cx="161" cy="149" r="45"/></g>
        <g fill="none" stroke="var(--arcade-obstacle)" stroke-width="2"><path d="M-20 218C49 93 95 245 148 142S223 100 320 41M-20 239C50 113 100 266 157 161S239 121 320 61M-20 260C50 135 107 286 167 182S249 141 320 81"/></g>
      </svg><span class="arcade-puzzle-number">${number}</span>`;
    }
    button.addEventListener('click', () => move(board.indexOf(number), true), { signal: abort.signal });
    boardNode.append(button);
    return button;
  });
  function cancelSlide() {
    ++animationGeneration;
    activeAnimation?.cancel(); activeAnimation = null;
    boardNode.removeAttribute('aria-busy');
  }
  function slide(number, from, to) {
    if (reducedMotion() || document.hidden) return;
    const tile = buttons.find(button => Number(button.dataset.tile) === number);
    if (!tile.animate) return;
    const step = (boardNode.getBoundingClientRect().width + 8) / 3;
    const dx = ((from % 3) - (to % 3)) * step;
    const dy = (Math.floor(from / 3) - Math.floor(to / 3)) * step;
    const generation = ++animationGeneration;
    activeAnimation = tile.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)' });
    boardNode.setAttribute('aria-busy', 'true');
    const complete = () => {
      if (generation !== animationGeneration) return;
      activeAnimation = null; boardNode.removeAttribute('aria-busy');
    };
    activeAnimation.finished.then(complete, complete);
  }
  function render() {
    const empty = board.indexOf(0);
    buttons.forEach(button => {
      const number = Number(button.dataset.tile);
      const index = board.indexOf(number);
      const movable = number !== 0 && state === 'playing' && adjacent(index, empty);
      button.style.left = `calc(${index % 3} * (100% + 8px) / 3)`;
      button.style.top = `calc(${Math.floor(index / 3)} * (100% + 8px) / 3)`;
      button.dataset.position = index;
      button.dataset.empty = String(number === 0);
      button.dataset.movable = String(movable);
      button.disabled = !movable;
      button.setAttribute('aria-label', number ? `Peça ${number}, linha ${Math.floor(index / 3) + 1}, coluna ${index % 3 + 1}${movable ? ', pode deslizar' : ''}` : 'Espaço vazio');
      button.setAttribute('aria-hidden', String(number === 0));
    });
    scoreNode.textContent = moves;
    root.dataset.state = state;
    boardNode.dataset.solved = String(state === 'won');
  }
  function move(index, focusPiece = false) {
    if (disposed || document.hidden || activeAnimation || state !== 'playing') return;
    const empty = board.indexOf(0);
    if (!adjacent(index, empty)) return;
    const number = board[index];
    [board[index], board[empty]] = [board[empty], board[index]];
    moves++;
    if (solved(board)) {
      state = 'won';
      status.textContent = `Resolvido! Você organizou o tabuleiro em ${moves} movimentos.`;
    } else {
      status.textContent = `Peça ${number} movida. Vazio na linha ${Math.floor(index / 3) + 1}, coluna ${index % 3 + 1}.`;
    }
    render();
    slide(number, index, empty);
    if (state === 'won') startButton.focus({ preventScroll: true });
    else if (focusPiece) buttons.find(button => Number(button.dataset.tile) === number).focus({ preventScroll: true });
  }
  startButton.addEventListener('click', () => {
    if (disposed) return;
    cancelSlide(); board = shuffle(); moves = 0; state = 'playing';
    startButton.textContent = 'Novo tabuleiro';
    status.textContent = 'Tabuleiro embaralhado. Mova as peças vizinhas do espaço vazio.';
    render(); boardNode.focus({ preventScroll: true });
  }, { signal: abort.signal });
  boardNode.addEventListener('keydown', event => {
    if (state !== 'playing') return;
    const empty = board.indexOf(0);
    const row = Math.floor(empty / 3), column = empty % 3;
    const targets = {
      ArrowUp: row > 0 ? empty - 3 : -1,
      ArrowDown: row < 2 ? empty + 3 : -1,
      ArrowLeft: column > 0 ? empty - 1 : -1,
      ArrowRight: column < 2 ? empty + 1 : -1,
    };
    if (!(event.code in targets)) return;
    event.preventDefault();
    if (targets[event.code] >= 0) { move(targets[event.code]); boardNode.focus({ preventScroll: true }); }
  }, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSlide(); }, { signal: abort.signal });
  window.addEventListener('blur', cancelSlide, { signal: abort.signal });
  motion.addEventListener('change', cancelSlide, { signal: abort.signal });
  window.addEventListener('jp-motion-change', cancelSlide, { signal: abort.signal });
  window.addEventListener('jp-fit-change', cancelSlide, { signal: abort.signal });
  render();
  return { pause: cancelSlide, dispose() { if (disposed) return; disposed = true; cancelSlide(); abort.abort(); root.remove(); } };
}
