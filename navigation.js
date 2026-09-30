(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window)) return;
  const sections = [...document.querySelectorAll('.section-heading, .featured, .project-row, .about, .toolkit, .contact-title, .case-section')];
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
  }, { threshold: 0.06 });
  if (!reduced.matches) {
    for (const section of sections) { section.classList.add('reveal'); reveal.observe(section); }
    document.documentElement.classList.add('reveal-ready');
  }
  const links = [...document.querySelectorAll('.header nav a[href^="#"]')];
  const targets = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const visible = new Map();
  const active = new IntersectionObserver((entries) => {
    for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRect.height : 0);
    const current = [...visible].sort((a,b)=>b[1]-a[1])[0];
    for (const link of links) {
      if (current?.[1] > 0 && link.getAttribute('href') === '#' + current[0]) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-100px 0px -30% 0px', threshold: [0,0.05,0.15,0.3] });
  targets.forEach(target=>active.observe(target));
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) { document.documentElement.classList.remove('reveal-ready'); reveal.disconnect(); }
  });
})();
