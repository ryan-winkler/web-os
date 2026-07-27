# Phase 01 — UI Review

**Audited:** 2026-07-27  
**Re-audited:** 2026-07-27 after UI review fixes  
**Baseline:** Abstract 6-pillar standards  
**Screenshots:** Reused from the completed design audit, plus focused 375×812 browser evidence confirming a 375px Public document, focus on `Public application`, and the visible `Public opened.` status toast.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | “Give reply” satisfies the interview contract while surrounding copy clearly states draft preparation, human review, and disabled sending. |
| 2. Visuals | 4/4 | The desktop metaphor is coherent across breakpoints; the DOOM-first opening is an explicit locked composition. |
| 3. Color | 3/4 | The rendered palette is cohesive, but 203 unique hex colors and 383 hardcoded color occurrences weaken semantic consistency. |
| 4. Typography | 2/4 | Critical terminal and key guidance now uses 12px text, but 76 declarations remain at 11px or smaller across the wider interface. |
| 5. Spacing | 3/4 | Core support, terminal, folder, and DOOM controls now meet 44px; smaller utility and Start controls remain. |
| 6. Experience Design | 3/4 | Mobile feedback, opened-window focus, and customer-clear confirmation are fixed; focus containment and secondary recovery gaps remain. |

**Overall: 19/24**

---

## Re-audit Status

| Prior Finding | Status | Evidence |
|---------------|--------|----------|
| Mobile status toast hidden | **FIXED** | The mobile rule now positions rather than hides `.toast` (`app/globals.css:2112-2117`); 375×812 browser evidence showed `display: block` and `Public opened.` |
| Opened app receives no focus | **FIXED** | `focusApp` focuses the opened `.app-window`, which is programmatically focusable (`app/page.tsx:323-324`, `app/page.tsx:904`). Browser evidence identified `Public application` as focused. |
| Customer Clear has no recovery | **FIXED** | Clearing a message/results/draft now requires confirmation (`app/page.tsx:1001-1008`). |
| Core type and target floor | **PARTIALLY FIXED** | Primary, issue-tab, terminal, key, DOOM, and folder controls now meet 44px; critical terminal/key text is 12px (`app/globals.css:427-477`, `app/globals.css:686-780`, `app/globals.css:925-952`). |
| DOOM-first opening hierarchy | **LOCKED** | Explicit user decision; accepted as the intended opening composition and removed from recommendations. |
| `AI Support Engineer (hopefully)` | **LOCKED** | Explicit user decision; accepted as intentional voice and removed from recommendations. |
| `Give reply` option | **LOCKED** | Explicit interview-brief requirement for both CLI and website; surrounding draft/review/send-boundary copy prevents delivery ambiguity. |

---

## Top 3 Priority Fixes

1. **Finish the compact type and target scale** — The core support path is corrected, but 76 small-text declarations and 15 sub-44px minimum-height rules remain — raise functional metadata and remaining utility/Start controls while consolidating the 25 font-size expressions.
2. **Complete focus containment and secondary recovery** — Focus now enters an opened window, but covered windows remain tabbable, Paint still clears immediately, and external frames lack failure fallback — make obscured windows inert and add confirmation/undo or inline recovery where user work or external content can fail.
3. **Consolidate color semantics** — The rendered palette is cohesive, but 203 unique hex values and broad blue reuse blur action, selection, and informational roles — route repeated colors through the existing semantic variables and reserve distinct tiers for action and information.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

- **LOCKED/PASS:** `Triage & give reply` preserves the interview brief’s required `Give reply` option (`app/page.tsx:998-1009`). `Sending disabled`, prepared-draft language, human review, and the fail-closed send explanation make the delivery boundary explicit.
- **LOCKED:** `AI Support Engineer (hopefully)` is intentional user-approved voice (`app/page.tsx:1457`, `app/page.tsx:1468`, `app/page.tsx:2494`) and is not an outstanding recommendation.
- Positive evidence: empty, loading, error, and fail-closed copy states remain concrete and recovery-oriented, while the new confirmation clearly states the consequence: `Clear the customer message and prepared draft?` (`app/page.tsx:1004`).

### Pillar 2: Visuals (4/4)

- **LOCKED/PASS:** The DOOM-first three-window opening is an explicit user-approved visual decision (`app/page.tsx:120-130`). It is treated as the intended hierarchy, not a defect.
- **PASS:** The current mobile and tablet initial states remove unsuitable open windows and present four literal desktop objects. `finding-001-after-mobile.png` and `finding-001-after-tablet.png` show a clear, stable responsive starting point.
- **PASS:** The focused 375×812 check found a 375px document after opening Public, so the fixed-window treatment introduces no horizontal overflow.
- **PASS:** Window chrome, files, folders, taskbar states, and icon construction retain a coherent visual language; icon-only window and taskbar controls include accessible labels (`app/page.tsx:700-769`, `app/page.tsx:888-931`).

### Pillar 3: Color (3/4)

- **WARNING:** Static analysis found 383 hardcoded color occurrences and 203 unique hex values in `app/globals.css`, despite the semantic variables declared at `app/globals.css:3-16`. Consolidate repeated blue, surface, border, text, success, warning, and danger values behind tokens.
- **WARNING:** Cool blue is used for focus, links, selected states, headings, icons, and informational emphasis (`app/globals.css:33-39`, `app/globals.css:125-130`, `app/globals.css:480`, `app/globals.css:490`). The result is attractive but makes “interactive,” “selected,” and “informational” states less distinguishable. Reserve one blue tier for actions and another neutral tier for information.
- Positive evidence: mint, amber, and danger treatments retain useful semantic distinctions for local/review/error states (`app/globals.css:11-15`, `app/globals.css:445-446`, `app/globals.css:1652-1662`), and no screenshot showed a major contrast failure in primary text or controls.

### Pillar 4: Typography (2/4)

- **WARNING:** The stylesheet still contains 76 font-size declarations at 11px or below: 2 at 8px, 14 at 9px, 30 at 10px, and 30 at 11px. These sizes remain in desktop filenames, file/folder metadata, Start results, status text, and secondary utilities (`app/globals.css:255-289`, `app/globals.css:577-649`, `app/globals.css:1001-1109`, `app/globals.css:1537-1615`).
- **WARNING:** The implemented scale has 25 distinct font-size expressions and seven explicit numeric weights (`650`, `700`, `750`, `780`, `800`, `850`, `900`). The hierarchy looks deliberate in screenshots, but the token sprawl makes similar metadata and actions render at subtly different sizes and weights.
- **FIXED:** Critical terminal runtime text, key summary, and session-key safety guidance now render at 12px; terminal buttons moved from 9px to 11px (`app/globals.css:686-737`). The priority functional guidance is no longer the smallest text.
- Positive evidence: Geist and Geist Mono are applied consistently to interface versus code/file content (`app/layout.tsx:3-7`, `app/layout.tsx:27-30`), and headings establish a clear editorial hierarchy.

### Pillar 5: Spacing (3/4)

- **FIXED:** Primary buttons, issue tabs, terminal actions, session-key controls, DOOM manual access, and folder navigation/download controls now meet a 44px minimum (`app/globals.css:427-477`, `app/globals.css:692-735`, `app/globals.css:759-780`, `app/globals.css:925-952`).
- **WARNING:** Static analysis still finds 15 sub-44px `min-height` declarations. Interactive examples include 38px file actions (`app/globals.css:553-579`), 34px scratchpad/code/camera/Paint controls (`app/globals.css:1080-1091`), 34px Start secondary actions and a 32px Reset layout button (`app/globals.css:1538-1548`, `app/globals.css:1583`), and 40px tray actions (`app/globals.css:1665-1673`).
- **WARNING:** The stylesheet uses 22 distinct `gap` values from 0 through 24px, plus 111 padding and 105 margin declarations. The screenshots remain visually aligned, but the near-continuous spacing values do not form a maintainable spacing scale. Collapse these to a small 4/8/12/16/24-based set.
- Positive evidence: mobile window insets, single-column fallbacks, and taskbar allocation avoid viewport overflow in the reviewed 375×812 and 768×1024 states (`app/globals.css:2012-2131`).

### Pillar 6: Experience Design (3/4)

- **FIXED:** Mobile no longer hides the shared live status. The 375×812 browser check showed `.toast` as `display: block` with `Public opened.` (`app/globals.css:1951-1965`, `app/globals.css:2112-2117`).
- **FIXED:** Opening or restoring an app now moves focus to a programmatically focusable window (`app/page.tsx:317-327`, `app/page.tsx:901-905`). Browser evidence confirmed `Public application` was focused after opening.
- **FIXED:** Customer Clear now confirms before removing the message, routed results, and prepared draft (`app/page.tsx:1001-1008`).
- **WARNING:** Focus enters the active window, but covered windows are not made `inert`, so their controls can remain in the tab sequence. Paint also still clears its canvas immediately (`app/page.tsx:2151-2157`, `app/page.tsx:2167-2170`).
- **WARNING:** External DOOM and Badger iframes have titles and sandboxes but no loading or failure state (`app/page.tsx:1663-1672`, `app/page.tsx:2294-2307`). Add an inline timeout/failure message with the existing manual or creator link as recovery.
- Positive evidence: loading/error states, disabled actions, fail-closed sending, live regions, skip-link, visible focus, and reduced-motion support remain intact.

---

## Verification Evidence

- Live `http://localhost:3000/`: HTTP 200 and visible workstation content confirmed before screenshot work.
- Screenshot safety gate: `.planning/ui-reviews/.gitignore` created before the capture attempt.
- Fresh CLI screenshot attempt: unavailable because `chromium_headless_shell-1234` is not installed.
- Reused current-state screenshots: `first-impression.png`, `finding-001-after-mobile.png`, `finding-001-after-tablet.png`, `finding-002-after.png`, `finding-003-after.png`, `finding-004-after.png`, and `finding-005-after.png`.
- Focused 375×812 browser evidence: Public kept document width at 375px, focused `Public application`, and displayed `Public opened.` in the live toast.
- `npm test`: build completed; 13 tests passed, 0 failed.
- `npm run lint`: completed with 0 errors.
- Registry audit: skipped because `components.json` is absent and there is no UI-SPEC third-party registry table.

## Files Audited

- `AGENTS.md`
- `README.md`
- `/home/ryan/.gstack/projects/site/designs/design-audit-20260727/DESIGN-REVIEW.md`
- `app/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `tests/desktop-features.test.mjs`
- `tests/design-responsive-initial-state.test.mjs`
- `tests/design-router-action.test.mjs`
- `tests/design-search-results.test.mjs`
- `tests/ui-review-fixes.test.mjs`
