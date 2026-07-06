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

  toggle(token) {
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
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.textContent = '';
    this._className = '';
    this.classList = new FakeClassList(this);
    this.clientWidth = 120;
    this.clientHeight = 48;
    this.offsetLeft = 0;
    this.offsetTop = 0;
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

  removeChild(child) {
    this.children = this.children.filter((node) => node !== child);
    child.parentNode = null;
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
      this.dataset[name.slice(5)] = String(value);
    }
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

  const attrMatch = selector.match(/^\[data-([^=]+)="([^"]+)"\]$/);
  if (attrMatch) {
    return element.dataset[attrMatch[1]] === attrMatch[2];
  }

  const classAttrMatch = selector.match(/^\.([^\[]+)\[data-([^=]+)="([^"]+)"\]$/);
  if (classAttrMatch) {
    return (
      element.classList.contains(classAttrMatch[1]) &&
      element.dataset[classAttrMatch[2]] === classAttrMatch[3]
    );
  }

  return false;
}

class FakeDocument {
  constructor() {
    this.nodesById = {};
    this.body = new FakeElement('body', this);
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
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildContext() {
  const document = new FakeDocument();
  const window = {
    document: document,
    innerWidth: 1280
  };
  let frameTime = 0;

  const context = {
    window: window,
    document: document,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    performance: {
      now: function () {
        return Date.now();
      }
    },
    requestAnimationFrame: function (callback) {
      frameTime += 16;
      return setTimeout(function () {
        callback(frameTime);
      }, 0);
    }
  };

  window.setTimeout = context.setTimeout;
  window.clearTimeout = context.clearTimeout;
  window.performance = context.performance;
  window.requestAnimationFrame = context.requestAnimationFrame;

  return context;
}

function createElement(document, tagName, options) {
  const element = document.createElement(tagName);
  const config = options || {};

  if (config.id) {
    element.id = config.id;
  }

  if (config.className) {
    element.className = config.className;
  }

  if (config.textContent) {
    element.textContent = config.textContent;
  }

  if (config.dataset) {
    Object.keys(config.dataset).forEach((key) => {
      element.dataset[key] = config.dataset[key];
    });
  }

  if (config.clientWidth) {
    element.clientWidth = config.clientWidth;
  }

  if (config.clientHeight) {
    element.clientHeight = config.clientHeight;
  }

  if (config.offsetLeft != null) {
    element.offsetLeft = config.offsetLeft;
  }

  if (config.offsetTop != null) {
    element.offsetTop = config.offsetTop;
  }

  return element;
}

function mountBaseDom(document) {
  const toastContainer = createElement(document, 'div', { id: 'toast-container' });
  const sidebar = createElement(document, 'aside', { className: 'RNR INTAN-sidebar' });
  const overlay = createElement(document, 'div', { className: 'sidebar-overlay' });
  const headerVenue = createElement(document, 'div', { id: 'header-venue' });
  const headerStatus = createElement(document, 'div', { id: 'header-status' });
  const headerRound = createElement(document, 'div', { id: 'header-round' });
  const statVenue = createElement(document, 'div', { id: 'stat-venue-text' });
  const loadingTarget = createElement(document, 'div', { id: 'loading-target' });

  const statIds = [
    'stat-total',
    'stat-cash',
    'stat-tf',
    'stat-unpaid',
    'stat-size',
    'stat-matches',
    'stat-finished',
    'stat-remaining'
  ];

  document.body.appendChild(toastContainer);
  document.body.appendChild(sidebar);
  document.body.appendChild(overlay);
  document.body.appendChild(headerVenue);
  document.body.appendChild(headerStatus);
  document.body.appendChild(headerRound);
  document.body.appendChild(statVenue);
  document.body.appendChild(loadingTarget);

  statIds.forEach((id) => {
    document.body.appendChild(createElement(document, 'div', { id: id, textContent: '0' }));
  });

  const dashboardNav = createElement(document, 'button', {
    className: 'sidebar-nav-item active',
    dataset: { section: 'dashboard' }
  });
  const participantsNav = createElement(document, 'button', {
    className: 'sidebar-nav-item',
    dataset: { section: 'participants' }
  });
  const dashboardSection = createElement(document, 'section', {
    id: 'section-dashboard',
    className: 'RNR INTAN-section active'
  });
  const participantsSection = createElement(document, 'section', {
    id: 'section-participants',
    className: 'RNR INTAN-section'
  });

  document.body.appendChild(dashboardNav);
  document.body.appendChild(participantsNav);
  document.body.appendChild(dashboardSection);
  document.body.appendChild(participantsSection);
}

function loadUi() {
  const uiPath = path.join(process.cwd(), 'assets', 'js', 'ui.js');
  const source = fs.readFileSync(uiPath, 'utf8');
  const context = buildContext();

  mountBaseDom(context.document);
  vm.createContext(context);
  vm.runInContext(source, context);

  return {
    context: context,
    BilposUI: context.window.BilposUI
  };
}

test('RNR INTANUI exposes the required public API', () => {
  const uiPath = path.join(process.cwd(), 'assets', 'js', 'ui.js');
  assert.ok(fs.existsSync(uiPath), 'assets/js/ui.js should exist');

  const loaded = loadUi();
  const ui = loaded.BilposUI;

  assert.ok(ui, 'window.BilposUI should be defined');
  [
    'showToast',
    'animateCounter',
    'updateStats',
    'updateHeader',
    'emptyState',
    'activateNav',
    'toggleSidebar',
    'closeSidebar',
    'showLoading',
    'hideLoading',
    'rippleEffect'
  ].forEach((method) => {
    assert.equal(typeof ui[method], 'function', method + ' should be a function');
  });
});

test('showToast renders and auto-dismisses stacked toasts', async () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;
  const toastContainer = document.getElementById('toast-container');

  ui.showToast('Saved', 'success', 40);
  ui.showToast('Heads up', 'warning', 40);

  assert.equal(toastContainer.children.length, 2);
  assert.equal(toastContainer.children[0].classList.contains('toast-success'), true);
  assert.equal(toastContainer.children[1].classList.contains('toast-warning'), true);

  await wait(15);
  assert.equal(toastContainer.children[0].classList.contains('show'), true);

  await wait(360);
  assert.equal(toastContainer.children.length, 0);
});

test('animateCounter updates numbers with easing and skips null elements', async () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;
  const statTotal = document.getElementById('stat-total');

  statTotal.textContent = '4';
  ui.animateCounter(statTotal, 12, 30);
  ui.animateCounter(null, 10, 30);

  await wait(60);
  assert.equal(statTotal.textContent, '12');
});

test('updateStats updates numeric cards and venue text', async () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;

  ui.updateStats(
    {
      total: 16,
      cash: 10,
      tf: 3,
      unpaid: 3,
      totalMatches: 15,
      finished: 7,
      remaining: 8
    },
    {
      size: 32,
      venue: 'Arena A'
    }
  );

  await wait(700);
  assert.equal(document.getElementById('stat-total').textContent, '16');
  assert.equal(document.getElementById('stat-cash').textContent, '10');
  assert.equal(document.getElementById('stat-size').textContent, '32');
  assert.equal(document.getElementById('stat-remaining').textContent, '8');
  assert.equal(document.getElementById('stat-venue-text').textContent, 'Arena A');
});

test('updateHeader maps tournament header values safely', () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;

  ui.updateHeader({
    venue: 'Main Hall',
    status: 'ongoing',
    currentRound: 3
  });

  assert.equal(document.getElementById('header-venue').textContent, 'Main Hall');
  assert.equal(document.getElementById('header-status').textContent, 'Ongoing');
  assert.equal(document.getElementById('header-round').textContent, 'Round 3');
});

test('emptyState returns the expected premium empty-state markup', () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;

  assert.match(ui.emptyState('participants'), /Belum Ada Peserta/);
  assert.match(ui.emptyState('bracket'), /Bracket Belum Dibuat/);
  assert.match(ui.emptyState('drawing'), /Drawing Belum Dilakukan/);
  assert.equal(ui.emptyState('unknown'), '');
});

test('activateNav switches active nav and closes sidebar on mobile', () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const context = loaded.context;
  const document = context.document;
  const sidebar = document.querySelector('.bilpos-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  sidebar.classList.add('open');
  overlay.classList.add('active');
  context.window.innerWidth = 480;

  ui.activateNav('participants');

  assert.equal(document.querySelector('.sidebar-nav-item[data-section="participants"]').classList.contains('active'), true);
  assert.equal(document.getElementById('section-dashboard').classList.contains('active'), false);
  assert.equal(document.getElementById('section-participants').classList.contains('active'), true);
  assert.equal(sidebar.classList.contains('open'), false);
  assert.equal(overlay.classList.contains('active'), false);
});

test('toggleSidebar and closeSidebar manage sidebar visibility safely', () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;
  const sidebar = document.querySelector('.bilpos-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  ui.toggleSidebar();
  assert.equal(sidebar.classList.contains('open'), true);
  assert.equal(overlay.classList.contains('active'), true);

  ui.closeSidebar();
  assert.equal(sidebar.classList.contains('open'), false);
  assert.equal(overlay.classList.contains('active'), false);
});

test('showLoading and hideLoading manage skeleton placeholders', () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;
  const container = document.getElementById('loading-target');

  ui.showLoading('loading-target');

  const skeleton = container.querySelector('.skeleton-loading');
  assert.ok(skeleton);
  assert.equal(skeleton.children.length, 3);

  ui.hideLoading('loading-target');
  assert.equal(container.querySelector('.skeleton-loading'), null);
});

test('rippleEffect adds a ripple element at the click point and removes it', async () => {
  const loaded = loadUi();
  const ui = loaded.BilposUI;
  const document = loaded.context.document;
  const button = createElement(document, 'button', {
    clientWidth: 140,
    clientHeight: 40,
    offsetLeft: 20,
    offsetTop: 10
  });

  document.body.appendChild(button);

  ui.rippleEffect({
    currentTarget: button,
    clientX: 60,
    clientY: 30
  });

  const ripple = button.querySelector('.ripple');
  assert.ok(ripple);
  assert.equal(ripple.style.left, '-30px');
  assert.equal(ripple.style.top, '-50px');

  await wait(650);
  assert.equal(button.querySelector('.ripple'), null);
});

