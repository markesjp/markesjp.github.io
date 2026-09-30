(() => {
  const root = document.documentElement;
  const valid = value => value === 'light' || value === 'dark';
  let initial = 'dark';
  try { const saved = localStorage.getItem('jp-theme'); if (valid(saved)) initial = saved; } catch {}

  const updateControls = () => {
    const dark = root.dataset.theme === 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#101216' : '#f4f5f7';
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const text = dark ? 'Tema claro' : 'Tema escuro';
    const label = button.querySelector('.theme-label');
    if (label) label.textContent = text;
    else button.textContent = text;
    const use = button.querySelector('use');
    if (use) {
      const href = use.getAttribute('href') || '';
      use.setAttribute('href', href.split('#')[0] + '#' + (dark ? 'sun' : 'moon'));
    }
    button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  };
  const apply = (theme, persist = false) => {
    if (!valid(theme)) return;
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem('jp-theme', theme); } catch {} }
    updateControls();
    // Canvas renderers refresh their palette without restarting the current game.
    window.dispatchEvent(new CustomEvent('jp-theme-change', { detail: { theme } }));
  };
  apply(initial);
  const bind = () => {
    updateControls();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  window.addEventListener('storage', event => {
    if (event.key === 'jp-theme') apply(valid(event.newValue) ? event.newValue : 'dark');
  });
})();
