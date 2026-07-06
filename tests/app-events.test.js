const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.items = [];
  }

  _sync() {
    this.element._className = this.items.join(' ');
  }

  setFromString(value) {
    this.items = String(value || '')
      .split(/\s+/)
      .filter(Boolean);
    this._sync();
  }

  contains(token) {
    return this.items.includes(token);
  }

  add(token) {
    if (!this.items.includes(token)) {
      this.items.push(token);
      this._sync();
    }
  }

  remove(token) {
    const idx = this.items.indexOf(token);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this._sync();
    }
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.textContent = '';
    this.value = '';
    this.listeners = {};
    this._className = '';
    this.classList = new FakeClassList(this);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get id() {
    return this._id || '';
  }

  set id(value) {
    if (this._id) {
      delete this.ownerDocument.nodesById[this._id];
    }

    this._id = value ? String(value) : '';

    if (this._id) {
      this.ownerDocument.nodesById[this._id] = this;
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, handler) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(handler);
  }

  dispatchEvent(eventName, eventObject) {
    const handlers = this.listeners[eventName] || [];
    handlers.forEach((handler) => handler(eventObject));
  }

  querySelector(selector) {
    const matches = this.querySelectorAll(selector);
    return matches.length ? matches[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];

    function walk(node) {
      for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i];

        if (matchesSelector(child, selector)) {
          results.push(child);
        }

        walk(child);
      }
    }

    walk(this);
    return results;
  }
}

function toDatasetKey(name) {
  return String(name || '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function matchesSelector(element, selector) {
  if (!selector) {
    return false;
  }

  if (selector.charAt(0) === '#') {
    return element.id === selector.slice(1);
  }

  if (selector.charAt(0) === '.' && selector.indexOf('[') === -1) {
    return element.classList.contains(selector.slice(1));
  }

  const classAttrMatch = selector.match(/^\.([^\[]+)\[data-([^=]+)="([^"]+)"\]$/);
  if (classAttrMatch) {
    return (
      element.classList.contains(classAttrMatch[1]) &&
      String(element.dataset[toDatasetKey(classAttrMatch[2])]) === classAttrMatch[3]
    );
  }

  return false;
}

class FakeDocument {
  constructor() {
    this.nodesById = {};
    this.body = new FakeElement('body', this);
    this.listeners = {};
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    return this.nodesById[id] || null;
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }
}

function appendElement(document, tagName, config) {
  const element = document.createElement(tagName);
  const options = config || {};

  if (options.id) {
    element.id = options.id;
  }

  if (options.className) {
    element.className = options.className;
  }

  if (options.value != null) {
    element.value = String(options.value);
  }

  if (options.textContent != null) {
    element.textContent = String(options.textContent);
  }

  if (options.dataset) {
    Object.keys(options.dataset).forEach((key) => {
      element.dataset[key] = String(options.dataset[key]);
    });
  }

  document.body.appendChild(element);
  return element;
}

function loadApp(options) {
  const document = new FakeDocument();
  const window = { document: document };
  const config = options || {};
  const toastCalls = [];
  const savedParticipantsCalls = [];
  const savedBracketCalls = [];
  const dispatchedEvents = [];
  let participants = config.participants ? config.participants.slice() : [];

  window.addEventListener = function(eventName, handler) {};
  window.dispatchEvent = function(event) {
    dispatchedEvents.push(event && event.type ? event.type : String(event));
  };

  const context = {
    window: window,
    document: document,
    console: console,
    CustomEvent: function(type) { return { type: type }; },
    BilposStorage: {
      loadTournament: function () {
        return { size: 2, venue: '', status: '' };
      },
      loadParticipants: function () {
        return participants;
      },
      loadBracket: function () {
        return config.bracket || null;
      },
      loadSettings: function () {
        return { zoom: 100 };
      },
      saveTournament: function(data) {},
      saveParticipants: function (nextParticipants) {
        participants = nextParticipants;
        savedParticipantsCalls.push(nextParticipants);
      },
      saveBracket: function (bracket) {
        savedBracketCalls.push(bracket);
      }
    },
    BilposDrawing: {
      drawSlot: config.drawSlot || function () {
        return null;
      }
    },
    BilposTournament: {
      advanceWinner: config.advanceWinner || function (bracket, roundIdx, matchIdx, winner) {
        return {
          bracket: bracket,
          roundIdx: roundIdx,
          matchIdx: matchIdx,
          winner: winner
        };
      }
    },
    BilposUI: {
      showToast: function (message, type) {
        toastCalls.push({ message: message, type: type });
      },
      updateHeader: function() {}
    }
  };

  window.BilposStorage = context.BilposStorage;
  window.BilposDrawing = context.BilposDrawing;
  window.BilposTournament = context.BilposTournament;
  window.BilposUI = context.BilposUI;

  const appPath = path.join(process.cwd(), 'assets', 'js', 'app.js');
  const source = fs.readFileSync(appPath, 'utf8');
  vm.createContext(context);
  vm.runInContext(source, context);

  return {
    BilposApp: context.window.BilposApp,
    document: document,
    window: window,
    toastCalls: toastCalls,
    dispatchedEvents: dispatchedEvents,
    getSavedParticipantsCalls: function () {
      return savedParticipantsCalls;
    },
    getSavedBracketCalls: function () {
      return savedBracketCalls;
    },
    getParticipants: function () {
      return participants;
    }
  };
}

test('draw all persists assigned drawing numbers to storage', () => {
  const participants = [
    { id: 'row-1', phone: '08111', drawingNumber: null },
    { id: 'row-2', phone: '08222', drawingNumber: null }
  ];
  const loaded = loadApp({
    participants: participants,
    drawSlot: function (size, currentParticipants, phone) {
      return phone === '08111' ? 1 : 2;
    }
  });
  const app = loaded.BilposApp;
  const drawAllButton = appendElement(loaded.document, 'button', { id: 'btn-draw-all' });

  appendElement(loaded.document, 'input', {
    className: 'phone-input',
    dataset: { row: 1 },
    value: '08111'
  });
  appendElement(loaded.document, 'input', {
    className: 'phone-input',
    dataset: { row: 2 },
    value: '08222'
  });
  appendElement(loaded.document, 'span', {
    className: 'drawing-badge',
    dataset: { row: 1 },
    textContent: ''
  });
  appendElement(loaded.document, 'span', {
    className: 'drawing-badge',
    dataset: { row: 2 },
    textContent: ''
  });

  app.tournament = { size: 2 };
  app.wireEvents();
  drawAllButton.dispatchEvent('click', {});

  assert.equal(loaded.getSavedParticipantsCalls().length, 1);
  assert.equal(loaded.getParticipants()[0].drawingNumber, 1);
  assert.equal(loaded.getParticipants()[1].drawingNumber, 2);
  assert.equal(app.participants, loaded.getParticipants());
});

test('score change keeps partial scores live without advancing winner', () => {
  const bracket = {
    rounds: [[{
      id: 'r0m0',
      p1: { id: 'p1', name: 'Alpha' },
      p2: { id: 'p2', name: 'Bravo' },
      score1: '',
      score2: '',
      winner: null,
      status: 'pending'
    }]]
  };
  const advanceCalls = [];
  const loaded = loadApp({
    bracket: bracket,
    advanceWinner: function (nextBracket, roundIdx, matchIdx, winner) {
      advanceCalls.push({ nextBracket: nextBracket, roundIdx: roundIdx, matchIdx: matchIdx, winner: winner });
      return nextBracket;
    }
  });
  const app = loaded.BilposApp;
  const bracketRenderArea = appendElement(loaded.document, 'div', { id: 'bracket-render-area' });
  const scoreInput = appendElement(loaded.document, 'input', {
    className: 'score-input',
    dataset: { round: 0, match: 0, player: 1 },
    value: '5'
  });

  app.bracket = bracket;
  app.renderBracket = function () {};
  app.renderStats = function () {};
  app.wireEvents();
  bracketRenderArea.dispatchEvent('change', { target: scoreInput });

  assert.equal(app.bracket.rounds[0][0].score1, '5');
  assert.equal(app.bracket.rounds[0][0].winner, null);
  assert.equal(app.bracket.rounds[0][0].status, 'live');
  assert.equal(advanceCalls.length, 0);
});

test('size change dispatches bilpos:bracket-activated event', () => {
  const loaded = loadApp();
  const app = loaded.BilposApp;

  app.tournament = { size: 32, fee: 0 };
  app.renderParticipantTable = function() {};
  app.renderStats = function() {};

  appendElement(loaded.document, 'input', { id: 'input-size', value: '16' });

  app.wireEvents();

  const sizeInput = loaded.document.getElementById('input-size');
  sizeInput.value = '16';
  sizeInput.dispatchEvent('change', { target: sizeInput });

  assert.ok(
    loaded.dispatchedEvents.includes('RNR INTAN:bracket-activated'),
    'Expected bilpos:bracket-activated to be dispatched when size changes'
  );
});

test('clicking bracket nav item dispatches bilpos:bracket-activated event', () => {
  const loaded = loadApp();
  const app = loaded.BilposApp;

  app.tournament = { size: 32, fee: 0 };
  app.renderStats = function() {};
  app.renderParticipantTable = function() {};

  // Tambah nav items ke fake DOM
  const bracketNavItem = appendElement(loaded.document, 'div', {
    className: 'sidebar-nav-item',
    dataset: { section: 'bracket' }
  });
  appendElement(loaded.document, 'div', {
    id: 'section-bracket'
  });

  app.wireEvents();
  bracketNavItem.dispatchEvent('click', {});

  assert.ok(
    loaded.dispatchedEvents.includes('RNR INTAN:bracket-activated'),
    'Expected bilpos:bracket-activated to be dispatched when bracket nav is clicked'
  );
});

