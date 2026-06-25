# Bracket Visual Fix — Design Spec
**Date:** 2026-06-25  
**Status:** Approved

## Problem

Two visual issues affect the tournament bracket UI:

1. **Connector lines untidy** — the bracket connector lines are faint and hard to see, and for some tournament sizes the junction between `connector-top` and `connector-bottom` pseudo-elements has a 1px rendering gap.

2. **Match card inconsistencies after match results** — the "WIN"/"LOSE" badge widths differ (3 vs 4 chars), causing score inputs to misalign vertically between P1 and P2 rows. Font size is inconsistent between name labels (11px) and select dropdowns (10px).

## Scope

Pure CSS changes in `Bracket.css`. No changes to React components (`.jsx` files), JS logic, or build config.

## Design

### Section 1 — Connector Lines

**Color:** All three connector pseudo-elements (`has-left-arm::before`, `connector-top::after`, `connector-bottom::after`) share the same color. Change from `rgba(55, 75, 100, 0.85)` to `rgba(100, 140, 180, 0.9)` — brighter and more visible on the dark background.

**Junction gap fix:** The `connector-top::after` and `connector-bottom::after` pseudo-elements meet at the same pixel. Sub-pixel rendering can leave a 1px gap. Fix by extending `connector-bottom::after` height by 2px:
```css
height: calc(var(--connector-h, 54px) + 2px);
```
The 2px extension causes the bottom arm to overlap the top arm by 2px, eliminating the gap invisibly.

**Light theme connector:** Change `#cbd5e1` → `#8a9bb0` for the same brightness improvement.

### Section 2 — Match Card Styling

**Font size consistency:** `.participant-label` and `.participant-name` are currently `11px`. Change both to `10px` to match `.participant-select`. All name/label text in match cards will be uniform.

**Badge width fix:** `.badge` currently has no fixed width, so "WIN" (3 chars) renders narrower than "LOSE" (4 chars). Add `min-width: 36px; text-align: center;` to `.badge`. This ensures both badges occupy the same horizontal space → score input `<input>` elements in the P1 and P2 rows align at the same x position.

**Score pinned to right:** Add `margin-left: auto;` to `.score-input` as a fallback, so score inputs always float to the right edge of the participant row, regardless of name length.

## Files Changed

| File | Change |
|------|--------|
| `src/components/Bracket.css` | Connector colors, junction gap fix, font sizes, badge min-width, score margin |

## Out of Scope

- No changes to `bracketUtils.js` margin/height math (verified correct)
- No changes to `.jsx` component files
- No changes to light theme layout beyond connector color

## Verification

After changes, rebuild bundle (`npm run build`) and visually verify:
1. Connector lines are clearly visible on dark background for all tournament sizes (4, 8, 16, 32)
2. No gap at the junction point between top and bottom connector arms for bottom-half matches
3. P1 and P2 score inputs are vertically aligned in round 2+ match cards
4. Font sizes in match cards look uniform between dropdown and name-display states
