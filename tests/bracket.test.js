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

  add() {
    for (let i = 0; i < arguments.length; i += 1) {
      const token = arguments[i];
      if (token && !this.items.includes(token)) {
        this.items.push(token);
      }
    }
    this._sync();
  }

  remove() {
    for (let i = 0; i < arguments.length; i += 1) {
      const token = arguments[i];
      this.items = this.items.filter((item) => item !== token);
    }
    this._sync();
  }

  contains(token) {
    return this.items.includes(token);
  }

  toggle(token, force) {
    if (force === true) {
      this.add(token);
      return true;
    }

    if (force === false) {
      this.remove(token);
      return false;
    }

    if (this.contains(token)) {
      this.remove(token);
      return false;
    }

    this.add(token);
    return true;
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.namespaceURI = null;
    this.children = [];
    this.parentNode = null;
    this.offsetParent = null;
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.textContent = '';
    this.disabled = false;
    this.value = '';
    this.type = '';
    this.min = '';
    this.max = '';
    this.clientWidth = 0;
    this.clientHeight = 0;
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this._className = '';
    this.classList = new FakeClassList(this);
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get innerHTML() {
    return this._innerHTML || '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this.children = [];
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
    child.offsetParent = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((node) => node !== child);
    child.parentNode = null;
    child.offsetParent = null;
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);

    if (name === 'id') {
      this.id = value;
      return;
    }

    if (name === 'class') {
      this.className = value;
      return;
    }

    if (name.indexOf('data-') === 0) {
      this.dataset[toDatasetKey(name.slice(5))] = String(value);
      return;
    }

    if (name === 'disabled') {
      this.disabled = true;
      return;
    }

    this[name] = value;
  }

  getAttribute(name) {
    if (name.indexOf('data-') === 0) {
      return this.dataset[toDatasetKey(name.slice(5))];
    }

    if (name === 'class') {
      return this.className;
    }

    return this.attributes[name];
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

  const attrMatch = selector.match(/^\[data-([^=]+)="([^"]+)"\]$/);
  if (attrMatch) {
    return String(element.dataset[toDatasetKey(attrMatch[1])]) === attrMatch[2];
  }

  return false;
}

class FakeDocument {
  constructor() {
    this.nodesById = {};
    this.body = new FakeElement('body', this);
    this.fullscreenElement = null;
    this.exitFullscreenCalls = 0;
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createElementNS(namespaceURI, tagName) {
    const element = new FakeElement(tagName, this);
    element.namespaceURI = namespaceURI;
    return element;
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

  exitFullscreen() {
    this.exitFullscreenCalls += 1;
    this.fullscreenElement = null;
  }
}

function buildContext() {
  const document = new FakeDocument();
  const window = {
    document: document
  };
  let frameTime = 0;

  const context = {
    window: window,
    document: document,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    requestAnimationFrame(callback) {
      frameTime += 16;
      return callback(frameTime);
    }
  };

  window.requestAnimationFrame = context.requestAnimationFrame;
  window.BilposUI = {
    emptyState(type) {
      return type === 'bracket' ? '<div>empty bracket</div>' : '';
    }
  };
  context.BilposUI = window.BilposUI;
  window.BilposTournament = {
    getRoundLabel(roundIndex, totalRounds) {
      if (roundIndex === totalRounds - 1) {
        return 'FINAL';
      }

      if (roundIndex === totalRounds - 2) {
        return 'SEMI FINAL';
      }

      return 'ROUND ' + (roundIndex + 1);
    }
  };
  context.BilposTournament = window.BilposTournament;

  return context;
}

function createElement(document, tagName, options) {
  const element = document.createElement(tagName);
  const config = options || {};

  if (config.className) {
    element.className = config.className;
  }

  if (config.dataset) {
    Object.keys(config.dataset).forEach((key) => {
      element.dataset[key] = String(config.dataset[key]);
    });
  }

  if (config.offsetLeft != null) {
    element.offsetLeft = config.offsetLeft;
  }

  if (config.offsetTop != null) {
    element.offsetTop = config.offsetTop;
  }

  if (config.offsetWidth != null) {
    element.offsetWidth = config.offsetWidth;
  }

  if (config.offsetHeight != null) {
    element.offsetHeight = config.offsetHeight;
  }

  return element;
}

function loadBracket() {
  const bracketPath = path.join(process.cwd(), 'assets', 'js', 'bracket.js');
  const source = fs.readFileSync(bracketPath, 'utf8');
  const context = buildContext();

  vm.createContext(context);
  vm.runInContext(source, context);

  return {
    context: context,
    BilposBracket: context.window.BilposBracket
  };
}

function createBracketFixture() {
  return {
    rounds: [
      [
        {
          id: 'r0m0',
          p1: { id: 'p1', name: 'Alpha', hc: '3', drawingNumber: 1 },
          p2: { id: 'p2', name: 'Bravo', hc: '5', drawingNumber: 2 },
          score1: 7,
          score2: 4,
          winner: { id: 'p1', name: 'Alpha', hc: '3', drawingNumber: 1 },
          status: 'done'
        },
        {
          id: 'r0m1',
          p1: { id: 'p3', name: 'Charlie', hc: '2', drawingNumber: 3 },
          p2: null,
          score1: '',
          score2: '',
          winner: null,
          status: 'pending'
        },
        {
          id: 'r0m2',
          p1: { id: 'p4', name: 'Delta', hc: '4', drawingNumber: 4 },
          p2: { id: 'bye', name: 'BYE', hc: '', drawingNumber: 5 },
          score1: '',
          score2: '',
          winner: null,
          status: 'pending'
        },
        {
          id: 'r0m3',
          p1: { id: 'p5', name: 'Echo', hc: '1', drawingNumber: 6 },
          p2: { id: 'p6', name: 'Foxtrot', hc: '6', drawingNumber: 7 },
          score1: 2,
          score2: 3,
          winner: null,
          status: 'live'
        }
      ],
      [
        {
          id: 'r1m0',
          p1: { id: 'p1', name: 'Alpha', hc: '3', drawingNumber: 1 },
          p2: null,
          score1: '',
          score2: '',
          winner: null,
          status: 'pending'
        },
        {
          id: 'r1m1',
          p1: null,
          p2: { id: 'p6', name: 'Foxtrot', hc: '6', drawingNumber: 7 },
          score1: '',
          score2: '',
          winner: null,
          status: 'pending'
        }
      ],
      [
        {
          id: 'r2m0',
          p1: null,
          p2: null,
          score1: '',
          score2: '',
          winner: null,
          status: 'pending'
        }
      ]
    ]
  };
}

test('RNR INTANBracket exposes the required public API', () => {
  const bracketPath = path.join(process.cwd(), 'assets', 'js', 'bracket.js');
  assert.ok(fs.existsSync(bracketPath), 'assets/js/bracket.js should exist');

  const loaded = loadBracket();
  const api = loaded.BilposBracket;

  assert.ok(api, 'window.BilposBracket should be defined');
  ['render', 'renderMatchCard', 'drawConnectors', 'setZoom', 'toggleFullscreen', 'centerBracket'].forEach((method) => {
    assert.equal(typeof api[method], 'function', method + ' should be a function');
  });
  assert.equal(api.currentZoom, 100);
  assert.equal(api.renderMatchCard.length, 4, 'renderMatchCard should declare totalRounds');
});

test('render shows empty state for a missing bracket', () => {
  const loaded = loadBracket();
  const api = loaded.BilposBracket;
  const container = createElement(loaded.context.document, 'div');

  api.render(null, container);

  assert.equal(container.innerHTML, '<div>empty bracket</div>');
});

test('render falls back safely when BilposUI or BilposTournament globals are unavailable', () => {
  const loaded = loadBracket();
  const api = loaded.BilposBracket;
  const document = loaded.context.document;
  const emptyContainer = createElement(document, 'div');
  const bracketContainer = createElement(document, 'div');
  const bracket = createBracketFixture();

  delete loaded.context.BilposUI;
  delete loaded.context.BilposTournament;
  delete loaded.context.window.BilposUI;
  delete loaded.context.window.BilposTournament;

  api.render(null, emptyContainer);
  api.render(bracket, bracketContainer);

  assert.equal(
    emptyContainer.innerHTML,
    '<div class="empty-state"><div class="empty-icon">ðŸ†</div><h5>Bracket Belum Dibuat</h5></div>'
  );
  assert.equal(
    bracketContainer.querySelector('.bracket-round-label').textContent,
    'Round 1'
  );
});

test('render builds horizontal rounds, match cards, and match states', () => {
  const loaded = loadBracket();
  const api = loaded.BilposBracket;
  const document = loaded.context.document;
  const container = createElement(document, 'div');
  const bracket = createBracketFixture();

  document.body.appendChild(container);
  api.render(bracket, container);

  const wrapper = container.querySelector('.bracket-wrapper');
  const rounds = wrapper.querySelectorAll('.bracket-round');
  const cards = wrapper.querySelectorAll('.match-card');
  const doneBadge = wrapper.querySelector('.match-done-badge');
  const liveButton = wrapper.querySelector('.btn-playing[data-match="3"]');
  const byeCard = wrapper.querySelector('.match-card[data-match-id="r0m2"]');
  const tbdName = wrapper.querySelector('.tbd');

  assert.ok(wrapper);
  assert.equal(wrapper.style.transform, 'scale(1)');
  assert.equal(wrapper.style.transformOrigin, 'top left');
  assert.equal(rounds.length, 3);
  assert.equal(cards.length, 7);
  assert.equal(rounds[0].querySelector('.bracket-round-label').textContent, 'ROUND 1');
  assert.equal(rounds[1].querySelector('.bracket-round-label').textContent, 'SEMI FINAL');
  assert.equal(rounds[2].querySelector('.bracket-round-label').textContent, 'FINAL');
  assert.equal(doneBadge.textContent, 'âœ“ SELESAI');
  assert.equal(liveButton.classList.contains('active'), true);
  assert.equal(liveButton.querySelector('.live-dot') != null, true);
  assert.equal(byeCard.classList.contains('match-bye'), true);
  assert.equal(byeCard.querySelector('.btn-playing').disabled, true);
  assert.equal(byeCard.querySelector('.match-player[data-player="2"]').classList.contains('player-bye'), true);
  assert.equal(tbdName.textContent, 'TBD');
  assert.equal(wrapper.querySelector('.match-card[data-match-id="r0m0"]').querySelectorAll('.score-input').length, 2);
  assert.equal(wrapper.querySelector('.match-card[data-match-id="r0m0"]').querySelector('.score-input[data-player="1"]').disabled, true);
  assert.equal(wrapper.querySelector('.match-card[data-match-id="r0m1"]').querySelectorAll('.score-input').length, 1);
  assert.equal(wrapper.querySelector('.match-card[data-match-id="r0m0"]').querySelector('.match-player[data-player="1"]').classList.contains('player-winner'), true);
});

test('drawConnectors creates L-shaped SVG paths between adjacent rounds', () => {
  const loaded = loadBracket();
  const api = loaded.BilposBracket;
  const document = loaded.context.document;
  const container = createElement(document, 'div');
  const bracket = createBracketFixture();

  document.body.appendChild(container);
  api.render(bracket, container);

  const wrapper = container.querySelector('.bracket-wrapper');
  const svg = wrapper.querySelector('.connector-svg');
  const paths = svg.querySelectorAll('.connector-path');

  assert.ok(svg);
  assert.equal(paths.length, 6);
  assert.equal(paths[0].getAttribute('d'), 'M 240 104 H 276 V 136 H 312');
  assert.equal(paths[1].getAttribute('d'), 'M 240 224 H 276 V 192 H 312');
  assert.equal(paths[4].getAttribute('d'), 'M 552 164 H 588 V 256 H 624');
});

test('source removes readonly offset writes and duplicate content-height calls', () => {
  const bracketPath = path.join(process.cwd(), 'assets', 'js', 'bracket.js');
  const source = fs.readFileSync(bracketPath, 'utf8');

  assert.doesNotMatch(source, /element\.offset(?:Left|Top|Width|Height)\s*=/);
  assert.equal(source.match(/getContentHeight\(/g).length, 2);
});

test('setZoom, toggleFullscreen, and centerBracket update UI helpers safely', () => {
  const loaded = loadBracket();
  const api = loaded.BilposBracket;
  const document = loaded.context.document;
  const container = createElement(document, 'div');
  const wrapper = createElement(document, 'div', { className: 'bracket-wrapper' });
  const zoom50 = createElement(document, 'button', { className: 'zoom-btn', dataset: { zoom: 50 } });
  const zoom100 = createElement(document, 'button', { className: 'zoom-btn', dataset: { zoom: 100 } });

  document.body.appendChild(container);
  document.body.appendChild(wrapper);
  document.body.appendChild(zoom50);
  document.body.appendChild(zoom100);

  container.requestFullscreen = function () {
    document.fullscreenElement = container;
  };
  container.scrollLeft = 120;
  container.scrollTop = 80;

  api.setZoom(50);
  assert.equal(api.currentZoom, 50);
  assert.equal(wrapper.style.transform, 'scale(0.5)');
  assert.equal(zoom50.classList.contains('active'), true);
  assert.equal(zoom100.classList.contains('active'), false);

  api.toggleFullscreen(container);
  assert.equal(document.fullscreenElement, container);
  api.toggleFullscreen(container);
  assert.equal(document.exitFullscreenCalls, 1);

  api.centerBracket(container);
  assert.equal(container.scrollLeft, 0);
  assert.equal(container.scrollTop, 0);
});

