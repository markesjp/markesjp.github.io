(() => {
  const root = document.documentElement;
  let theme = 'dark';
  try { const saved = localStorage.getItem('jp-theme'); if (saved === 'light' || saved === 'dark') theme = saved; } catch {}
  root.dataset.theme = theme;
  const update = () => {
    const dark = root.dataset.theme === 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#101216' : '#f5f6f8';
    const button = document.getElementById('theme-toggle');
    if (button) {
      const label = button.querySelector('.theme-label');
      if (label) label.textContent = dark ? 'Tema claro' : 'Tema escuro';
      else button.textContent = dark ? 'Tema claro' : 'Tema escuro';
      const use = button.querySelector('use');
      if (use) use.setAttribute('href', use.getAttribute('href').split('#')[0] + '#' + (dark ? 'sun' : 'moon'));
      button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
    }
  };
  update();
  document.addEventListener('DOMContentLoaded', () => {
    update();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('jp-theme', root.dataset.theme); } catch {}
      update();
    });
  }, { once: true });
})();
