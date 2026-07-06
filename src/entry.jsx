import React from 'react';
import { createRoot } from 'react-dom/client';
import BracketPage from './components/BracketPage';

var _root = null;

function mountBracket() {
  var rootEl = document.getElementById('bracket-react-root');
  if (!rootEl) return;
  if (!_root) {
    _root = createRoot(rootEl);
  }
  _root.render(React.createElement(BracketPage));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountBracket);
} else {
  mountBracket();
}

// Fire bilpos:bracket-activated when the Bracket nav tab is clicked so
// BracketPage can re-read fresh participant data from BilposStorage.
document.addEventListener('DOMContentLoaded', function() {
  var navItem = document.querySelector('.sidebar-nav-item[data-section="bracket"]');
  if (navItem) {
    navItem.addEventListener('click', function() {
      window.dispatchEvent(new CustomEvent('RNR INTAN:bracket-activated'));
    });
  }
});


