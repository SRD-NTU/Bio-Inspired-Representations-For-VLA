'use strict';

const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let savedTheme;
try { savedTheme = localStorage.getItem('cortact-theme'); } catch { /* Storage is optional. */ }
function setTheme(theme) {
  root.dataset.theme = theme;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
  themeToggle.title = `Switch to ${nextTheme} theme`;
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#161b22' : '#f6f8fa';
}
setTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : systemTheme.matches ? 'dark' : 'light');
themeToggle.addEventListener('click', () => {
  savedTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(savedTheme);
  try { localStorage.setItem('cortact-theme', savedTheme); } catch { /* Storage is optional. */ }
});
systemTheme.addEventListener('change', event => { if (!savedTheme) setTheme(event.matches ? 'dark' : 'light'); });

const navigation = [...document.querySelectorAll('.section-nav a')];
const sections = navigation.map(link => document.querySelector(link.getAttribute('href')));
let scheduled = false;
function updateNavigation() {
  let current = sections[0];
  for (const section of sections) { if (section.getBoundingClientRect().top <= 150) current = section; }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) current = sections[sections.length - 1];
  navigation.forEach(link => {
    const active = link.hash === `#${current.id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); } }, { passive: true });
updateNavigation();

let printState = [];
window.addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('.task-table')].map(details => [details, details.open]);
  printState.forEach(([details]) => { details.open = true; });
});
window.addEventListener('afterprint', () => { printState.forEach(([details, open]) => { details.open = open; }); });
