## Task 1: HTML Integration

**Files:**
- Modify: `index.html`

**Interfaces:**
- Produces: `#section-bracket` section with `#bracket-react-root` div; `[data-section="bracket"]` nav item; `bracket.bundle.js` script; `bracket.bundle.css` link

- [ ] **Step 1: Add Bracket nav item to the top taskbar**

Open `index.html` and find the `<nav class="top-taskbar">` block (lines ~26-30). Add the Bracket item after the existing three items:

```html
<div class="sidebar-nav-item" data-section="bracket">
  <i class="fas fa-sitemap"></i> Bracket
</div>
```

The full `<nav>` block should look like:
```html
<nav class="top-taskbar">
  <div class="sidebar-nav-item" data-section="dashboard">Dashboard</div>
  <div class="sidebar-nav-item" data-section="setup">Tournament Setup</div>
  <div class="sidebar-nav-item" data-section="participants">List Peserta Bilpos</div>
  <div class="sidebar-nav-item" data-section="bracket">
    <i class="fas fa-sitemap"></i> Bracket
  </div>
</nav>
```

- [ ] **Step 2: Add the bracket section inside `<main>`**

In `index.html`, find the closing `</section>` of `section-participants` (around line ~169). Add the new section immediately after it, before the `<footer>`:

```html
<section class="bilpos-section" id="section-bracket">
  <div class="section-header">
    <div class="section-title">
      <i class="fas fa-sitemap"></i>
      Tournament Bracket
    </div>
  </div>
  <div id="bracket-react-root"></div>
</section>
```

- [ ] **Step 3: Add the CSS link and JS script**

In `index.html`, inside `<head>`, add after the existing `<link rel="stylesheet" href="assets/css/style.css">` line:
```html
<link rel="stylesheet" href="assets/js/bracket.bundle.css">
```

At the bottom of `<body>`, after `<script src="assets/js/app.js"></script>`, add:
```html
<script src="assets/js/bracket.bundle.js"></script>
```

- [ ] **Step 4: Verify HTML is valid**

Run:
```
node -e "const fs = require('fs'); const html = fs.readFileSync('index.html','utf8'); ['section-bracket','bracket-react-root','data-section=\"bracket\"','bracket.bundle.js','bracket.bundle.css'].forEach(s => { if (!html.includes(s)) throw new Error('Missing: ' + s); }); console.log('HTML checks passed');"
```

Expected output: `HTML checks passed`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add bracket section and nav item to index.html"
```

---

