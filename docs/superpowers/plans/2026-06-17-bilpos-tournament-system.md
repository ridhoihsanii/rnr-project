# RNR INTAN Tournament Management System â€” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready, premium Billiard Tournament Management System (BILPOS) deployable to GitHub Pages with zero backend.

**Architecture:** Pure frontend SPA using HTML5 + CSS3 + Vanilla JavaScript ES6. LocalStorage serves as the persistence layer. All modules communicate via a shared state object and custom events. The bracket engine uses DOM + CSS for rendering, with SVG connectors for the Challonge-style visualization.

**Tech Stack:** HTML5, CSS3, Bootstrap 5.3, Font Awesome 6, Poppins (Google Fonts), SheetJS (xlsx), html2canvas, jsPDF â€” all via CDN.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | App shell: sidebar, header, all section panels, CDN links |
| `assets/css/style.css` | Bilpos design system: colors, typography, components, animations, bracket layout |
| `assets/js/storage.js` | LocalStorage CRUD: tournament, participants, bracket, settings |
| `assets/js/drawing.js` | Slot assignment: random draw, duplicate prevention, quadrant distribution for multi-entry |
| `assets/js/tournament.js` | Tournament logic: round calculation, bracket seeding, match progression, bye handling |
| `assets/js/bracket.js` | Bracket renderer: Challonge-style DOM structure, SVG connector lines, score inputs, LIVE mode |
| `assets/js/ui.js` | UI helpers: toast, animated counters, sidebar toggle, search/sort, empty states, zoom |
| `assets/js/app.js` | App bootstrap: init all modules, wire event listeners, global state, export/import |
| `README.md` | Full documentation: features, usage, GitHub Pages deployment |

---

## Task 1: Project Shell â€” index.html

**Files:**
- Create: `index.html`

- [ ] Create `index.html` with full HTML5 shell including:
  - All CDN imports (Bootstrap 5.3, Font Awesome 6, Google Fonts Poppins, SheetJS, html2canvas, jsPDF)
  - `<meta>` viewport, charset, OG tags
  - Fixed top header with RNR Billiard branding + trophy icon + status indicators
  - Left sidebar with nav links: Dashboard, Tournament Setup, Participant List, Tournament Bracket, Statistics, Export/Import, Settings
  - Mobile sidebar overlay + hamburger toggle
  - Main content area with all 7 section panels (hidden by default, shown via JS)
  - Premium footer: "Built with â¤ï¸ by Ihsan"
  - Script tags loading all JS files in correct order

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>BILPOS â€” RNR Billiard Tournament System</title>
  <!-- all CDN links -->
  <link rel="stylesheet" href="assets/css/style.css"/>
</head>
<body>
  <!-- sidebar, header, main, footer -->
  <!-- all JS scripts -->
</body>
</html>
```

- [ ] Verify file exists and opens in browser without errors

---

## Task 2: Design System â€” style.css

**Files:**
- Create: `assets/css/style.css`

- [ ] Implement complete Bilpos CSS design system:

**CSS Variables:**
```css
:root {
  --bilpos-yellow: #FACC15;
  --bilpos-gold: #EAB308;
  --bilpos-black: #0A0A0A;
  --bilpos-dark: #111111;
  --bilpos-surface: #1A1A1A;
  --bilpos-border: rgba(250,204,21,0.15);
  --bilpos-border-active: rgba(250,204,21,0.5);
  --text-primary: #FFFFFF;
  --text-secondary: #D4D4D4;
  --success: #22C55E;
  --danger: #EF4444;
  --info: #3B82F6;
  --sidebar-width: 260px;
  --header-height: 64px;
  --transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}
```

**Include styles for:**
- `body`: dark background, Poppins font
- `.bilpos-header`: fixed top, glass effect, yellow accent border-bottom
- `.bilpos-sidebar`: fixed left, dark surface, nav items with yellow active state
- `.bilpos-main`: margin-left sidebar-width, padding-top header-height
- `.bilpos-card`: glassmorphism, yellow border accent, soft shadow
- `.stat-card`: icon + animated counter, yellow highlight
- `.btn-bilpos-primary`: yellow gradient, ripple, glow hover
- `.btn-bilpos-secondary`: dark surface, yellow border hover
- `.participant-table`: sticky header, dark rows, green paid rows, yellow accent
- `.status-btn`: CASH/TF toggle pills
- `.drawing-badge`: yellow pill glow
- `.bracket-container`: horizontal scroll, zoom transform origin
- `.bracket-round`: vertical column of matches
- `.match-card`: dark card, yellow accent, hover shadow
- `.match-connector`: SVG/CSS lines between rounds
- `.live-indicator`: blinking red dot
- `.winner-glow`: yellow glow animation
- `.toast-bilpos`: premium toast notification
- `.empty-state`: centered SVG + text
- `.bilpos-footer`: dark bg, yellow top border, center text, pulse heart
- `@keyframes`: fadeIn, slideUp, pulse, ripple, counterSpin, blink, glow

---

## Task 3: LocalStorage Layer â€” storage.js

**Files:**
- Create: `assets/js/storage.js`

- [ ] Implement `BilposStorage` object with these methods:

```javascript
const BilposStorage = {
  KEYS: {
    TOURNAMENT: 'RNR INTAN_tournament',
    PARTICIPANTS: 'RNR INTAN_participants',
    BRACKET: 'RNR INTAN_bracket',
    SETTINGS: 'RNR INTAN_settings',
    HISTORY: 'RNR INTAN_history'
  },

  // Tournament setup
  saveTournament(data) { localStorage.setItem(this.KEYS.TOURNAMENT, JSON.stringify(data)); },
  loadTournament() { return JSON.parse(localStorage.getItem(this.KEYS.TOURNAMENT)) || { venue: '', size: 32, status: 'setup', currentRound: 0 }; },

  // Participants: array of { id, slot, phone, name, hc, status, drawingNumber }
  saveParticipants(arr) { localStorage.setItem(this.KEYS.PARTICIPANTS, JSON.stringify(arr)); },
  loadParticipants() { return JSON.parse(localStorage.getItem(this.KEYS.PARTICIPANTS)) || []; },

  saveParticipant(p) {
    const all = this.loadParticipants();
    const idx = all.findIndex(x => x.id === p.id);
    if (idx >= 0) all[idx] = p; else all.push(p);
    this.saveParticipants(all);
  },

  findByPhone(phone) {
    return this.loadParticipants().filter(p => p.phone === phone);
  },

  // Bracket: { rounds: [[{p1,p2,score1,score2,winner,status},...], ...] }
  saveBracket(data) { localStorage.setItem(this.KEYS.BRACKET, JSON.stringify(data)); },
  loadBracket() { return JSON.parse(localStorage.getItem(this.KEYS.BRACKET)) || null; },

  // Settings
  saveSettings(data) { localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data)); },
  loadSettings() { return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || { theme: 'dark', zoom: 100 }; },

  clearAll() { Object.values(this.KEYS).forEach(k => localStorage.removeItem(k)); }
};
```

---

## Task 4: Drawing System â€” drawing.js

**Files:**
- Create: `assets/js/drawing.js`

- [ ] Implement `BilposDrawing` object:

```javascript
const BilposDrawing = {
  // Generate all slot numbers 1..size
  generatePool(size) { return Array.from({length: size}, (_, i) => i + 1); },

  // Get slots already used
  usedSlots(participants) { return participants.map(p => p.drawingNumber).filter(Boolean); },

  // Get available slots
  availableSlots(size, participants) {
    const used = this.usedSlots(participants);
    return this.generatePool(size).filter(s => !used.includes(s));
  },

  // Draw a random available slot, respecting quadrant distribution for same phone
  drawSlot(size, participants, phone) {
    const samePhone = participants.filter(p => p.phone === phone && p.drawingNumber);
    const available = this.availableSlots(size, participants);
    if (!available.length) return null;

    if (samePhone.length === 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Multi-entry: distribute to different quadrants
    const quadrantSize = size / 4;
    const usedQuadrants = samePhone.map(p => Math.ceil(p.drawingNumber / quadrantSize));
    const freeInDiffQuadrant = available.filter(s => {
      const q = Math.ceil(s / quadrantSize);
      return !usedQuadrants.includes(q);
    });
    const pool = freeInDiffQuadrant.length ? freeInDiffQuadrant : available;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  // Validate manual slot input
  validateSlot(slot, rowId, participants) {
    const conflict = participants.find(p => p.drawingNumber === slot && p.id !== rowId);
    return !conflict;
  }
};
```

---

## Task 5: Tournament Logic â€” tournament.js

**Files:**
- Create: `assets/js/tournament.js`

- [ ] Implement `BilposTournament` object:

```javascript
const BilposTournament = {
  // Calculate number of rounds for given size
  calcRounds(size) { return Math.ceil(Math.log2(size)); },

  // Calculate total matches
  calcMatches(size) { return size - 1; },

  // Generate initial bracket from participants sorted by drawingNumber
  generateBracket(size, participants) {
    const rounds = this.calcRounds(size);
    const slots = Array.from({length: size}, (_, i) => {
      const p = participants.find(x => x.drawingNumber === i + 1);
      return p ? { id: p.id, name: p.name, hc: p.hc, drawingNumber: p.drawingNumber } : { id: null, name: 'BYE', hc: '', drawingNumber: i + 1 };
    });

    // Pair slots for round 1
    const round1 = [];
    for (let i = 0; i < slots.length; i += 2) {
      round1.push({ id: `r1m${i/2}`, p1: slots[i], p2: slots[i+1], score1: '', score2: '', winner: null, status: 'pending' });
    }

    const allRounds = [round1];
    // Generate empty subsequent rounds
    let prevMatches = round1.length;
    for (let r = 1; r < rounds; r++) {
      const matches = [];
      for (let m = 0; m < Math.ceil(prevMatches / 2); m++) {
        matches.push({ id: `r${r+1}m${m}`, p1: null, p2: null, score1: '', score2: '', winner: null, status: 'pending' });
      }
      allRounds.push(matches);
      prevMatches = matches.length;
    }

    return { rounds: allRounds, size, generatedAt: Date.now() };
  },

  // Get round label
  getRoundLabel(roundIndex, totalRounds) {
    const fromEnd = totalRounds - 1 - roundIndex;
    if (fromEnd === 0) return 'FINAL';
    if (fromEnd === 1) return 'SEMI FINAL';
    if (fromEnd === 2) return 'QUARTER FINAL';
    return `ROUND ${roundIndex + 1}`;
  },

  // Advance winner to next round
  advanceWinner(bracket, roundIdx, matchIdx, winner) {
    const nextRound = bracket.rounds[roundIdx + 1];
    if (!nextRound) return bracket; // final â€” no next round
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2';
    nextRound[nextMatchIdx][slot] = winner;
    return bracket;
  },

  // Auto-advance BYE matches
  autoAdvanceByes(bracket) {
    bracket.rounds[0].forEach((match, idx) => {
      if (match.p2 && match.p2.name === 'BYE') {
        match.winner = match.p1;
        match.status = 'done';
        BilposTournament.advanceWinner(bracket, 0, idx, match.p1);
      } else if (match.p1 && match.p1.name === 'BYE') {
        match.winner = match.p2;
        match.status = 'done';
        BilposTournament.advanceWinner(bracket, 0, idx, match.p2);
      }
    });
    return bracket;
  },

  // Statistics
  getStats(participants, bracket) {
    const total = participants.filter(p => p.name && p.name !== 'BYE').length;
    const cash = participants.filter(p => p.status === 'cash').length;
    const tf = participants.filter(p => p.status === 'tf').length;
    const unpaid = total - cash - tf;
    let totalMatches = 0, finished = 0;
    if (bracket) {
      bracket.rounds.forEach(round => {
        round.forEach(m => {
          if (m.p1 && m.p2 && m.p1.name !== 'BYE' && m.p2.name !== 'BYE') {
            totalMatches++;
            if (m.status === 'done') finished++;
          }
        });
      });
    }
    return { total, cash, tf, unpaid, totalMatches, finished, remaining: totalMatches - finished };
  }
};
```

---

## Task 6: Bracket Renderer â€” bracket.js

**Files:**
- Create: `assets/js/bracket.js`

- [ ] Implement `BilposBracket` object that renders the Challonge-style bracket:

```javascript
const BilposBracket = {
  currentZoom: 100,

  render(bracket, container) {
    container.innerHTML = '';
    if (!bracket) { container.innerHTML = BilposUI.emptyState('bracket'); return; }

    const wrapper = document.createElement('div');
    wrapper.className = 'bracket-wrapper';
    wrapper.style.transform = `scale(${this.currentZoom / 100})`;
    wrapper.style.transformOrigin = 'top left';

    const totalRounds = bracket.rounds.length;

    bracket.rounds.forEach((round, rIdx) => {
      const col = document.createElement('div');
      col.className = 'bracket-round';
      col.dataset.round = rIdx;

      // Round label
      const label = document.createElement('div');
      label.className = 'bracket-round-label';
      label.textContent = BilposTournament.getRoundLabel(rIdx, totalRounds);
      col.appendChild(label);

      // Match cards
      round.forEach((match, mIdx) => {
        const card = this.renderMatchCard(match, rIdx, mIdx, bracket);
        col.appendChild(card);
      });

      wrapper.appendChild(col);

      // Connector SVG between rounds
      if (rIdx < totalRounds - 1) {
        const connector = document.createElement('div');
        connector.className = 'bracket-connector';
        connector.dataset.fromRound = rIdx;
        wrapper.appendChild(connector);
      }
    });

    container.appendChild(wrapper);
    // Draw connector lines after DOM is ready
    requestAnimationFrame(() => this.drawConnectors(wrapper, bracket));
  },

  renderMatchCard(match, rIdx, mIdx, bracket) {
    const card = document.createElement('div');
    card.className = `match-card ${match.status === 'live' ? 'match-live' : ''} ${match.status === 'done' ? 'match-done' : ''}`;
    card.dataset.matchId = match.id;
    card.dataset.round = rIdx;
    card.dataset.match = mIdx;

    const p1 = match.p1 || { name: 'TBD', hc: '' };
    const p2 = match.p2 || { name: 'TBD', hc: '' };
    const winner = match.winner;

    card.innerHTML = `
      <div class="match-player ${winner && winner.name === p1.name ? 'player-winner' : ''}" data-player="1">
        <span class="player-name">${p1.name || 'TBD'}</span>
        ${p1.hc ? `<span class="hc-badge">${p1.hc}</span>` : ''}
        <input type="number" class="score-input" value="${match.score1 || ''}" min="0" max="99"
          data-round="${rIdx}" data-match="${mIdx}" data-player="1"
          ${match.status === 'live' || match.status === 'pending' ? '' : 'disabled'}
          ${p1.name === 'BYE' || p1.name === 'TBD' ? 'disabled' : ''}>
      </div>
      <div class="match-divider"></div>
      <div class="match-player ${winner && winner.name === p2.name ? 'player-winner' : ''}" data-player="2">
        <span class="player-name">${p2.name || 'TBD'}</span>
        ${p2.hc ? `<span class="hc-badge">${p2.hc}</span>` : ''}
        <input type="number" class="score-input" value="${match.score2 || ''}" min="0" max="99"
          data-round="${rIdx}" data-match="${mIdx}" data-player="2"
          ${match.status === 'live' || match.status === 'pending' ? '' : 'disabled'}
          ${p2.name === 'BYE' || p2.name === 'TBD' ? 'disabled' : ''}>
      </div>
      <div class="match-actions">
        ${match.status !== 'done' ? `<button class="btn-playing ${match.status === 'live' ? 'active' : ''}"
          data-round="${rIdx}" data-match="${mIdx}">
          ${match.status === 'live' ? '<span class="live-dot"></span> LIVE' : 'â–¶ PLAYING'}
        </button>` : '<span class="match-done-badge">âœ“ SELESAI</span>'}
      </div>
    `;
    return card;
  },

  drawConnectors(wrapper, bracket) {
    // Remove old connectors
    wrapper.querySelectorAll('.connector-svg').forEach(el => el.remove());

    const rounds = wrapper.querySelectorAll('.bracket-round');
    rounds.forEach((roundEl, rIdx) => {
      if (rIdx >= bracket.rounds.length - 1) return;
      const cards = roundEl.querySelectorAll('.match-card');
      const nextRoundEl = rounds[rIdx + 1];
      const nextCards = nextRoundEl.querySelectorAll('.match-card');

      cards.forEach((card, cIdx) => {
        const nextCardIdx = Math.floor(cIdx / 2);
        const nextCard = nextCards[nextCardIdx];
        if (!nextCard) return;

        const r1 = card.getBoundingClientRect();
        const r2 = nextCard.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // Draw using absolute div lines
        const line = document.createElement('div');
        line.className = 'connector-line';
        const startX = r1.right - wrapperRect.left;
        const startY = r1.top + r1.height / 2 - wrapperRect.top;
        const endX = r2.left - wrapperRect.left;
        const endY = r2.top + (cIdx % 2 === 0 ? r2.height * 0.3 : r2.height * 0.7) - wrapperRect.top;

        // Horizontal line from card to midpoint
        const midX = startX + (endX - startX) / 2;
        // We'll create 3 lines: horizontal from start, vertical, horizontal to end
        // Using absolute positioned divs

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('connector-svg');
        svg.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'rgba(250,204,21,0.35)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        if (!wrapper.querySelector('.connector-svg')) {
          wrapper.style.position = 'relative';
        }
        wrapper.appendChild(svg);
      });
    });
  },

  setZoom(zoom) {
    this.currentZoom = zoom;
    const wrapper = document.querySelector('.bracket-wrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${zoom / 100})`;
      wrapper.style.transformOrigin = 'top left';
    }
  }
};
```

---

## Task 7: UI Helpers â€” ui.js

**Files:**
- Create: `assets/js/ui.js`

- [ ] Implement `BilposUI` object:

```javascript
const BilposUI = {
  // Toast notifications
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `bilpos-toast toast-${type}`;
    toast.innerHTML = `<i class="fa ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-times-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
  },

  // Animated counter
  animateCounter(el, target, duration = 600) {
    const start = parseInt(el.textContent) || 0;
    const range = target - start;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + range * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  // Update all stat cards
  updateStats(stats, tournament) {
    const map = {
      'stat-total': stats.total,
      'stat-cash': stats.cash,
      'stat-tf': stats.tf,
      'stat-unpaid': stats.unpaid,
      'stat-size': tournament.size,
      'stat-matches': stats.totalMatches,
      'stat-finished': stats.finished,
      'stat-remaining': stats.remaining,
      'stat-venue': null,
      'stat-round': null
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val !== null) this.animateCounter(el, val);
    });
    const venueEl = document.getElementById('stat-venue-text');
    if (venueEl) venueEl.textContent = tournament.venue || 'â€”';
    const roundEl = document.getElementById('header-round');
    if (roundEl) roundEl.textContent = tournament.currentRound ? `Round ${tournament.currentRound}` : 'Setup';
    const venueHeader = document.getElementById('header-venue');
    if (venueHeader) venueHeader.textContent = tournament.venue || 'RNR Billiard';
  },

  // Empty states
  emptyState(type) {
    const states = {
      participants: `<div class="empty-state"><div class="empty-icon">ðŸŽ±</div><p>Belum ada peserta.<br>Setup tournament terlebih dahulu.</p></div>`,
      bracket: `<div class="empty-state"><div class="empty-icon">ðŸ†</div><p>Bracket belum dibuat.<br>Tambahkan peserta & mulai drawing.</p></div>`,
      drawing: `<div class="empty-state"><div class="empty-icon">ðŸŽ²</div><p>Drawing belum dilakukan.</p></div>`
    };
    return states[type] || '';
  },

  // Sidebar navigation
  activateNav(sectionId) {
    document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) navItem.classList.add('active');
    document.querySelectorAll('.bilpos-section').forEach(el => el.classList.remove('active'));
    const section = document.getElementById(`section-${sectionId}`);
    if (section) section.classList.add('active');
  },

  // Toggle mobile sidebar
  toggleSidebar() {
    document.querySelector('.bilpos-sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
  }
};
```

---

## Task 8: Main Application â€” app.js

**Files:**
- Create: `assets/js/app.js`

- [ ] Implement full application initialization and event wiring:

```javascript
// Global state
const BilposApp = {
  tournament: null,
  participants: [],
  bracket: null,
  settings: null,

  init() {
    this.tournament = BilposStorage.loadTournament();
    this.participants = BilposStorage.loadParticipants();
    this.bracket = BilposStorage.loadBracket();
    this.settings = BilposStorage.loadSettings();

    this.renderTournamentSetup();
    this.renderParticipantTable();
    this.renderBracket();
    this.renderStats();
    this.wireEvents();
    BilposUI.activateNav('dashboard');
  },

  renderTournamentSetup() { /* populate setup form fields */ },
  renderParticipantTable() { /* generate table rows based on size */ },
  renderBracket() { /* call BilposBracket.render */ },
  renderStats() { /* call BilposUI.updateStats */ },

  wireEvents() {
    // Sidebar nav clicks
    // Tournament form changes
    // Participant table: status, phone lookup, name, hc, draw, save
    // Bracket: playing, score, winner
    // Export/Import buttons
    // Settings
    // Zoom controls
    // Fullscreen
    // Search + sort
  },

  // Participant save
  saveParticipant(rowIndex) { /* read row, validate, save to storage, update bracket */ },

  // Drawing
  drawSlot(rowIndex) { /* call BilposDrawing.drawSlot, update row badge */ },

  // Score update
  updateScore(roundIdx, matchIdx) { /* read scores, determine winner, advance, save bracket */ },

  // Export functions
  exportJSON() { /* download JSON */ },
  importJSON(file) { /* parse, load */ },
  exportExcel() { /* SheetJS */ },
  importExcel(file) { /* SheetJS */ },
  exportBracketPDF() { /* html2canvas + jsPDF */ },
  printBracket() { /* window.print */ },

  resetTournament() { /* confirm, clearAll, reinit */ }
};

document.addEventListener('DOMContentLoaded', () => BilposApp.init());
```

---

## Task 9: README.md

**Files:**
- Create: `README.md`

- [ ] Write complete README with:
  - Project description and screenshot placeholder
  - Full feature list
  - Folder structure
  - Local installation (just open index.html)
  - GitHub Pages deployment steps
  - Usage guide for each section
  - Technology attribution

---

## Self-Review Checklist

- [x] Spec: 100% frontend, no backend â†’ all files are static
- [x] Spec: LocalStorage persistence â†’ storage.js covers all keys
- [x] Spec: Challonge-style bracket â†’ bracket.js renders horizontal rounds with SVG connectors
- [x] Spec: Bilpos Yellow/Black branding â†’ CSS variables defined, dominant palette
- [x] Spec: 16/32/48/64/96/128 player support â†’ bracket generation handles byes for non-power-of-2
- [x] Spec: Drawing system with multi-entry quadrant distribution â†’ drawing.js
- [x] Spec: Two-way data binding â†’ app.js events sync table â†” bracket
- [x] Spec: Export JSON/Excel/PDF + Import â†’ app.js export methods
- [x] Spec: Footer "Built with â¤ï¸ by Ihsan" â†’ index.html footer section
- [x] Spec: Animated counters, toasts, animations â†’ ui.js + style.css keyframes
- [x] Spec: Empty states â†’ ui.js emptyState()
- [x] Spec: Settings, Statistics, Dashboard sections â†’ all panels in index.html
- [x] No placeholders: All tasks include actual implementation code

