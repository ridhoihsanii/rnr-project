# Design: Bracket Auto-Update Berdasarkan Ukuran Tournament

**Date:** 2026-06-25  
**Status:** Approved

## Problem

Bracket tournament tidak langsung terupdate ketika ukuran tournament (size) diubah. Ada dua bug terkait:

1. **Bug #1 â€” `storage` event tidak menyala di tab sama**: `BracketPage.jsx` mendengarkan `window.addEventListener('storage', ...)` untuk mendeteksi perubahan `bilpos_tournament`. Namun Web Storage API hanya mengirim event ini ke tab/window **lain**, bukan di tab yang sama tempat `localStorage.setItem()` dipanggil.

2. **Bug #2 â€” `bilpos:bracket-activated` tidak pernah di-dispatch**: `BracketPage.jsx` juga mendengarkan event `bilpos:bracket-activated` untuk reload state ketika tab Bracket diklik. Namun di `app.js`, klik sidebar nav hanya melakukan scroll ke section â€” event ini tidak pernah di-dispatch.

## Root Cause

- `app.js` baris 260-266: menyimpan ukuran baru ke localStorage, tapi tidak memberi tahu React component
- `app.js` baris 237-244: klik nav tidak dispatch `bilpos:bracket-activated`

## Solution: Custom Event Dispatch

**Approach terpilih:** Dispatch `bilpos:bracket-activated` dari dua tempat di `app.js`. Tidak ada perubahan di `BracketPage.jsx` karena listener sudah ada dan `loadInitialState()` sudah punya logika regenerasi bracket jika `saved.bracket.size !== size`.

## Changes Required

### File: `assets/js/app.js`

**Change 1** â€” Saat nav "Bracket" diklik, dispatch `bilpos:bracket-activated`:

```js
// Dalam sidebar-nav-item click handler (baris ~238-244)
if (section === 'bracket') {
  window.dispatchEvent(new CustomEvent('RNR INTAN:bracket-activated'));
}
```

**Change 2** â€” Saat `input-size` berubah, dispatch `bilpos:bracket-activated` setelah save:

```js
// Dalam inputSize change handler (baris ~260-266)
window.dispatchEvent(new CustomEvent('RNR INTAN:bracket-activated'));
```

## How It Works After Fix

1. User ubah ukuran tournament di "Tournament Setup" â†’ `saveTournament()` dipanggil â†’ `bilpos:bracket-activated` di-dispatch â†’ `BracketPage` re-read storage â†’ `loadInitialState()` mendeteksi `size` berbeda â†’ bracket baru di-generate.

2. User klik tab "Bracket" â†’ `bilpos:bracket-activated` di-dispatch â†’ bracket reload dari storage terbaru.

## No Changes Needed

- `BracketPage.jsx`: Listener sudah ada, `loadInitialState()` sudah handle regenerasi.
- `bracketUtils.js`, `tournament.js`, `storage.js`: Tidak terpengaruh.

## Testing

- Ubah ukuran tournament dari 32 ke 16 â†’ bracket harus langsung menampilkan 8 match di round pertama.
- Refresh atau navigasi ke tab lain lalu kembali ke Bracket â†’ bracket harus tetap sinkron dengan ukuran terbaru.

