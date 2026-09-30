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
    <div class="arcade-puzzle-board arcade-playfield" tabindex="0" role="group" aria-label="Tabuleiro deslizante três por três" aria-describedby="${id}-instructions"></div>
    <p class="arcade-puzzle-goal">Objetivo: 1 2 3 / 4 5 6 / 7 8 □</p>
    <p class="arcade-instructions" id="${id}-instructions">Clique em uma peça ao lado do espaço vazio para deslizá-la. Com o foco no tabuleiro, as setas movem o espaço vazio. Ordene de 1 a 8, deixando o vazio no canto inferior direito. Todo tabuleiro gerado tem solução.</p>
    <p class="arcade-status" role="status" aria-live="polite">Este é o objetivo. Inicie para embaralhar.</p>
    <div class="arcade-controls"><button type="button" class="arcade-primary" data-start>Iniciar</button></div>`;
  host.append(root);
  const boardNode = root.querySelector('.arcade-puzzle-board');
  const status = root.querySelector('.arcade-status');
  const scoreNode = root.querySelector('[data-score]');
  const startButton = root.querySelector('[data-start]');
  let board = [...GOAL], moves = 0, state = 'ready', disposed = false;
  const buttons = GOAL.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => move(index, true), { signal: abort.signal });
    boardNode.append(button);
    return button;
  });
  function render() {
    const empty = board.indexOf(0);
    buttons.forEach((button, index) => {
      const number = board[index];
      const movable = state === 'playing' && adjacent(index, empty);
      button.textContent = number || '';
      button.dataset.empty = String(number === 0);
      button.dataset.movable = String(movable);
      button.disabled = !movable;
      button.setAttribute('aria-label', number ? `Peça ${number}, linha ${Math.floor(index / 3) + 1}, coluna ${index % 3 + 1}${movable ? ', pode deslizar' : ''}` : 'Espaço vazio');
      button.setAttribute('aria-hidden', String(number === 0));
    });
    scoreNode.textContent = moves;
    root.dataset.state = state;
  }
  function move(index, focusPiece = false) {
    if (disposed || state !== 'playing') return;
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
    if (state === 'won') startButton.focus({ preventScroll: true });
    else if (focusPiece && !buttons[empty].disabled) buttons[empty].focus({ preventScroll: true });
    else if (focusPiece) boardNode.focus({ preventScroll: true });
  }
  startButton.addEventListener('click', () => {
    if (disposed) return;
    board = shuffle(); moves = 0; state = 'playing';
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
  render();
  return { dispose() { if (disposed) return; disposed = true; abort.abort(); root.remove(); } };
}
