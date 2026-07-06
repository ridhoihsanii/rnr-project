# Bracket Size Sync Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dispatch `bilpos:bracket-activated` event dari `app.js` saat ukuran tournament berubah dan saat tab Bracket diklik, sehingga React component `BracketPage` otomatis me-regenerate bracket.

**Architecture:** Dua `dispatchEvent` calls ditambahkan ke `app.js`. Tidak ada perubahan di `BracketPage.jsx` karena listener sudah ada dan `loadInitialState()` sudah menangani regenerasi bracket ketika size berbeda.

**Tech Stack:** Vanilla JS (app.js), Node.js test runner (`node --test`), fake DOM via vm context

## Global Constraints

- Tidak boleh mengubah `BracketPage.jsx`, `bracketUtils.js`, `tournament.js`, atau `storage.js`
- Harus backward compatible â€” guard `dispatchEvent` agar tidak throw jika tidak tersedia
- Ikuti code style `app.js` yang sudah ada: `var`, function expressions, `typeof` guards
- Test menggunakan `node:test` dan `node:assert/strict` (NO jest, NO mocha)
- Test command: `node --test tests/app-events.test.js`

---

## File Structure

| File | Action | Keterangan |
|------|--------|------------|
| `assets/js/app.js` | Modify | Tambah dua `dispatchEvent` calls |
| `tests/app-events.test.js` | Modify | Tambah dua test baru + upgrade fake window |

---

### Task 1: Dispatch event saat ukuran tournament berubah

**Files:**
- Modify: `assets/js/app.js` (sekitar baris 258-267, `input-size` change handler)
- Test: `tests/app-events.test.js`

**Interfaces:**
- Produces: `window.dispatchEvent` dipanggil dengan event bertipe `'RNR INTAN:bracket-activated'` setiap kali `input-size` di-change

---

- [ ] **Step 1: Upgrade fake window di `loadApp` untuk tracking events**

Di `tests/app-events.test.js`, ubah fungsi `loadApp` (sekitar baris 197-277). Tambahkan `dispatchedEvents`, `window.dispatchEvent`, dan `CustomEvent` ke context. Perubahan ada di dalam blok `loadApp`:

```js
function loadApp(options) {
  const document = new FakeDocument();
  const window = { document: document };
  const config = options || {};
  const toastCalls = [];
  const savedParticipantsCalls = [];
  const savedBracketCalls = [];
  const dispatchedEvents = [];           // <-- TAMBAH INI
  let participants = config.participants ? config.participants.slice() : [];

  // Tambahkan addEventListener dan dispatchEvent ke fake window:
  window.addEventListener = function(eventName, handler) {};  // no-op untuk test
  window.dispatchEvent = function(event) {                    // <-- TAMBAH INI
    dispatchedEvents.push(event && event.type ? event.type : String(event));
  };

  const context = {
    window: window,
    document: document,
    console: console,
    CustomEvent: function(type) { return { type: type }; },  // <-- TAMBAH INI
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
      saveTournament: function(data) {},                      // <-- TAMBAH INI (agar tidak throw)
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
      updateHeader: function() {}                             // <-- TAMBAH INI
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
    dispatchedEvents: dispatchedEvents,                      // <-- EXPOSE INI
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
```

- [ ] **Step 2: Tulis failing test untuk size-change dispatch**

Tambahkan test berikut di bagian bawah `tests/app-events.test.js`:

```js
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
```

- [ ] **Step 3: Jalankan test untuk verifikasi FAIL**

```
node --test tests/app-events.test.js
```

Expected: Test baru FAIL dengan pesan `Expected bilpos:bracket-activated to be dispatched when size changes`

- [ ] **Step 4: Implementasi â€” tambah helper function dan dispatch di `input-size` handler**

Di `assets/js/app.js`, tambahkan helper `dispatchBracketActivated` di dalam IIFE (setelah `getElement` function, sekitar baris 16), dan dispatch di handler `input-size`:

**Tambah helper** (setelah baris `function getElement(id) { ... }` sekitar baris 11-16):

```js
  function dispatchBracketActivated() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      var event = typeof CustomEvent === 'function'
        ? new CustomEvent('RNR INTAN:bracket-activated')
        : { type: 'RNR INTAN:bracket-activated' };
      window.dispatchEvent(event);
    }
  }
```

**Ubah handler `input-size`** (baris 258-267), tambah satu baris dispatch:

```js
      var inputSize = getElement('input-size');
      if (inputSize) {
        inputSize.addEventListener('change', function (e) {
          var size = parseInt(e.target.value, 10);
          self.tournament.size = size;
          BilposStorage.saveTournament(self.tournament);
          dispatchBracketActivated();
          self.renderParticipantTable();
          self.renderStats();
        });
      }
```

- [ ] **Step 5: Jalankan test untuk verifikasi PASS**

```
node --test tests/app-events.test.js
```

Expected output (test baru PASS â€” test lama mungkin masih fail karena pre-existing issues):
```
âœ” size change dispatches bilpos:bracket-activated event
```

- [ ] **Step 6: Commit**

```bash
git add assets/js/app.js tests/app-events.test.js
git commit -m "fix: dispatch bilpos:bracket-activated when tournament size changes"
```

---

### Task 2: Dispatch event saat tab Bracket diklik di nav

**Files:**
- Modify: `assets/js/app.js` (sekitar baris 237-246, sidebar-nav-item click handler)
- Test: `tests/app-events.test.js`

**Interfaces:**
- Consumes: helper `dispatchBracketActivated()` dari Task 1
- Produces: `window.dispatchEvent` dipanggil dengan event `'RNR INTAN:bracket-activated'` ketika nav item dengan `data-section="bracket"` diklik

---

- [ ] **Step 1: Tulis failing test untuk nav bracket click dispatch**

Tambahkan test berikut di bagian bawah `tests/app-events.test.js` (setelah test dari Task 1):

```js
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
```

- [ ] **Step 2: Jalankan test untuk verifikasi FAIL**

```
node --test tests/app-events.test.js
```

Expected: Test baru FAIL dengan pesan `Expected bilpos:bracket-activated to be dispatched when bracket nav is clicked`

- [ ] **Step 3: Implementasi â€” tambah dispatch di sidebar-nav click handler**

Di `assets/js/app.js`, ubah blok `sidebar-nav-item` click handler (baris 237-246):

```js
      document.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var section = item.dataset.section;
          document.querySelectorAll('.sidebar-nav-item').forEach(function (it) { it.classList.remove('active'); });
          item.classList.add('active');
          var el = document.getElementById('section-' + section);
          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (section === 'statistics') self.renderStats();
          if (section === 'bracket') dispatchBracketActivated();
        });
      });
```

- [ ] **Step 4: Jalankan test untuk verifikasi PASS**

```
node --test tests/app-events.test.js
```

Expected output (kedua test baru PASS):
```
âœ” size change dispatches bilpos:bracket-activated event
âœ” clicking bracket nav item dispatches bilpos:bracket-activated event
```

- [ ] **Step 5: Jalankan semua unit test untuk pastikan tidak ada regresi baru**

```
node --test tests/tournament.test.js
```

Expected: `pass 1, fail 0` (sama seperti baseline)

- [ ] **Step 6: Commit**

```bash
git add assets/js/app.js tests/app-events.test.js
git commit -m "fix: dispatch bilpos:bracket-activated when bracket nav tab is clicked"
```

