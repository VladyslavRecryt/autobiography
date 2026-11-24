const root = document.documentElement;
const themeButton = document.querySelector('.theme');
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  root.dataset.theme = theme;
  const label = theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему';
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  themeColor.content = theme === 'dark' ? '#101312' : '#f3f5f0';
}

applyTheme(root.dataset.theme);
themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('vlad-theme', theme); } catch {}
});

const nav = document.querySelector('nav');
const navLinks = [...nav.querySelectorAll('a')];
const navTargets = navLinks.map(link => document.querySelector(link.hash));
const header = nav.closest('header');
const compactLayout = matchMedia('(max-width: 740px), (pointer: coarse)');
let activeIndex = -1;
let lensIndex = -1;
let hoveredLink = null;
let scrollFrame = 0;

function moveLens() {
  const focusedLink = nav.querySelector('a:focus-visible');
  const previewIndex = navLinks.indexOf(hoveredLink || focusedLink);
  const nextIndex = Math.max(0, previewIndex >= 0 ? previewIndex : activeIndex);
  if (lensIndex === nextIndex) return;
  lensIndex = nextIndex;
  nav.style.setProperty('--nav-index', lensIndex);
}

function visibleSection() {
  if (compactLayout.matches) return navLinks.findIndex(link => link.hash === location.hash);
  const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (scrollY >= maxScroll - 2) {
    const anchorIndex = navLinks.findIndex(link => link.hash === location.hash);
    if (maxScroll <= 2) return anchorIndex;
    if (anchorIndex >= 0) {
      const section = navTargets[anchorIndex];
      const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
      if (scrollY + section.getBoundingClientRect().top - margin >= maxScroll - 2) return anchorIndex;
    }
    return navTargets.length - 1;
  }
  const marker = Math.max(header.offsetHeight + 24, innerHeight * .4);
  for (let index = navTargets.length - 1; index >= 0; index--) {
    if (navTargets[index].getBoundingClientRect().top <= marker) return index;
  }
  return -1;
}

function updateActiveSection() {
  scrollFrame = 0;
  const nextIndex = visibleSection();
  if (activeIndex !== nextIndex) {
    navLinks[activeIndex]?.removeAttribute('aria-current');
    activeIndex = nextIndex;
    navLinks[activeIndex]?.setAttribute('aria-current', 'location');
  }
  moveLens();
}

function queueSectionUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActiveSection);
}

function syncScrollTracking() {
  if (compactLayout.matches) window.removeEventListener('scroll', queueSectionUpdate);
  else window.addEventListener('scroll', queueSectionUpdate, { passive: true });
  queueSectionUpdate();
}

nav.addEventListener('pointerover', event => {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  hoveredLink = event.target.closest('a');
  moveLens();
});
nav.addEventListener('pointerleave', () => { hoveredLink = null; moveLens(); });
nav.addEventListener('focusin', moveLens);
nav.addEventListener('focusout', () => queueMicrotask(moveLens));
window.addEventListener('resize', queueSectionUpdate);
window.addEventListener('hashchange', queueSectionUpdate);
compactLayout.addEventListener('change', syncScrollTracking);
syncScrollTracking();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (!compactLayout.matches && !reduceMotion.matches && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('reveal-in');
      reveal.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll('.section-heading, .project, .split > div, .profile-panel')
    .forEach(element => {
      if (element.getBoundingClientRect().top >= innerHeight) reveal.observe(element);
    });
}

if (!compactLayout.matches && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const sculpture = document.querySelector('.sculpture');
  const art = document.querySelector('.art');
  art.addEventListener('pointermove', event => {
    if (reduceMotion.matches) return;
    const bounds = art.getBoundingClientRect();
    sculpture.style.setProperty('--tilt-x', (0.5 - (event.clientY - bounds.top) / bounds.height) * 15 + 'deg');
    sculpture.style.setProperty('--tilt-y', ((event.clientX - bounds.left) / bounds.width - 0.5) * 18 + 'deg');
  });
  art.addEventListener('pointerleave', () => {
    sculpture.style.removeProperty('--tilt-x');
    sculpture.style.removeProperty('--tilt-y');
  });
  document.querySelectorAll('a.glass-surface, button.glass-surface, summary.glass-surface, nav').forEach(surface => {
    surface.addEventListener('pointermove', event => {
      if (reduceMotion.matches) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--shine-x', (event.clientX - bounds.left) / bounds.width * 100 + '%');
      surface.style.setProperty('--shine-y', (event.clientY - bounds.top) / bounds.height * 100 + '%');
    });
    surface.addEventListener('pointerleave', () => {
      surface.style.removeProperty('--shine-x');
      surface.style.removeProperty('--shine-y');
    });
  });
}

