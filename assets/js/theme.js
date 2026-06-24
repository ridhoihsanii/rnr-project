// Theme toggle: mirrors portfolio-ihsan behavior
document.addEventListener('DOMContentLoaded', function () {
  var html = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  var themeIcon = document.getElementById('themeIcon');

  if (!themeBtn) return;

  var savedTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  themeBtn.addEventListener('click', function () {
    var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
  });

  function applyTheme(theme) {
    html.dataset.theme = theme;
    if (themeIcon) themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
});