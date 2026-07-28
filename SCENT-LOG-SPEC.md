# Scent Log — Application Specification

A mobile-first fragrance wear-testing tracker built for a content creator with a ~160-bottle collection (predominantly dupes/clones, ~20 older designers, 2 niche). Its purpose is to capture structured wear-test data in the field and convert it into reference material for video scripts.

This document is the complete specification. It is written to be handed to Claude Code as context for extending the existing single-file build, or as a brief for rebuilding it as a proper application.

---

## 1. Current implementation

| | |
|---|---|
| **Form factor** | Single self-contained `.html` file |
| **Filename** | `index.html` (~97 KB) |
| **Stack** | Vanilla HTML / CSS / JS. No framework, no build step, no bundler |
| **Runtime** | Any browser. Installs to the iOS Home Screen as a real PWA (manifest + service worker); still runs unchanged inside a Claude Artifact |
| **Persistence** | Storage adapter — `window.storage` in Artifacts, `localStorage` in a normal browser, in-memory as a last resort. Plus JSON backup / restore to file |
| **External deps** | Google Fonts only (Libre Caslon Text, Manrope) |
| **Target device** | iPhone, portrait, one-handed use while out of the house |

The entire app is one file: `<style>` block, static markup for all sheets/overlays, then a single `<script>` block containing state, render functions, and event bindings. Rendering is string-template based — `render()` regenerates `#content.innerHTML` and re-binds listeners each time.

---

## 2. Core concept

A **test** is one wearing of one fragrance, from spray to finish. Tests are logged in real time across three phases, then closed out with a detailed profile.

Two independent **notebooks** partition all data:
- **StevnScents** — the creator's public fragrance-review brand (budget/dupe focus). Accent color: amber.
- **Fallowmark** — a separate fragrance & lifestyle house. Accent color: clover green.

Notebooks share the same schema and UI but never mix records. Switching notebooks re-themes the entire interface via a `body` class.

> **Current state:** only StevnScents is active. The Fallowmark tab is hidden (`.tab-bar { display:none }`) and the notebook switcher is not shown, since there is nothing to switch between. The `notebook` field, the Fallowmark accent tokens and all filtering logic are untouched — restoring the tab is a markup and one-line CSS change, and any existing Fallowmark records are hidden rather than deleted.

---

## 3. Data model

### 3.1 Storage envelope

Single key, personal scope:

```js
await window.storage.set('scent-log-tests', JSON.stringify({
  tests: Test[],
  activeTab: 'stevnscents' | 'fallowmark',
  activeView: 'tests' | 'collection' | 'insights' | 'compare' | 'guide',
  sortBy: SortKey
}), false);
```

### 3.2 `Test` object

Every field defaults via a `norm()` function so older records gain new fields as empty values without migration scripts.

```ts
interface Test {
  // Identity
  id: string;                    // 't' + timestamp + random
  notebook: 'stevnscents' | 'fallowmark';
  kind: 'test' | 'bottle';       // 'bottle' = a Collection entry, not a wearing.
                                 // Bottles share this shape but use only the identity,
                                 // reference and economics fields. Every test-based view
                                 // filters them out via isBottle().

  // Collection-only
  photo: string;                 // filename in data/photos/, blob held in IndexedDB
  bottleNotes: string;           // free text about this specific bottle
  added: string;                 // ISO, when it entered the collection

  // Naming — brand is REQUIRED, name is REQUIRED, flanker optional
  house: string;                 // brand, e.g. "Lattafa"
  name: string;                  // e.g. "Khamrah"
  flanker: string;               // e.g. "Qahwa" — blank if original
  type: 'Dupe' | 'Designer' | 'Niche' | 'Indie';
  inspired: string;              // "brand markets it as inspired by X"

  // Reference metadata
  concentration: 'EDC'|'EDT'|'EDP'|'Extrait'|'Parfum'|'Oil / Attar';
  perfumer: string;
  year: string;                  // release year
  batch: string;                 // batch/year of this specific bottle

  // Test conditions (the variables that make results comparable)
  sprays: '1'|'2'|'3'|'4'|'5'|'6+';
  spots: string[];               // Neck, Wrists, Chest, Behind ears, Forearms, Clothing, Hair, Blotter
  weather: 'Hot'|'Warm'|'Mild'|'Cool'|'Cold';
  humidity: 'Dry'|'Average'|'Humid';
  context: string;               // free text, e.g. "office day"

  // Economics
  price: string;                 // numeric string, USD
  size: string;                  // numeric string, ml
  // cost-per-ml is derived, never stored

  // Timeline
  startTime: string;             // ISO
  endTime: string;               // ISO, set on completion
  completed: boolean;
  checkpoints: Checkpoint[];
  compliments: Compliment[];

  // Performance ratings
  longevity: 'Under 2h'|'2–4 hours'|'4–6 hours'|'6–8 hours'|'8–12 hours'|'12+ hours';
  projection: 'Skin scent'|"Arm's length"|'Room-filling'|'Beast mode';
  sillage: 'None'|'Soft'|'Moderate'|'Heavy';

  // Olfactory profile
  topNotes: string;              // comma-separated
  heartNotes: string;
  baseNotes: string;
  families: string[];            // main accords, 18 options
  similar: string;               // "smells similar to…"

  // Wear guidance
  seasons: string[];             // Spring, Summer, Fall, Winter, Year-round
  seasonNotes: string;           // WHY that season — free text reasoning
  dayNight: 'Daytime'|'Evening'|'Either';
  occasions: string[];           // Office, Date night, Casual, Formal, Night out, Gym, Church, Travel, Signature
  layers: string;                // "layers well with…"

  // Audience read
  gender: 'Masculine'|'Leans masculine'|'Unisex'|'Leans feminine'|'Feminine';
  age: 'Young'|'Any age'|'Mature';
  complimentFactor: 'None'|'Low'|'Medium'|'High'|'Magnet';

  // Publishing
  shared: boolean;               // opt-in: show this test on the public collection page

  // Verdict
  rating: string;                // '1'–'10'
  tier: 'S'|'A'|'B'|'C'|'D'|'F';
  value: 'Steal'|'Fair'|'Overpriced';
  rebuy: 'Yes'|'Maybe'|'No';
  pros: string;
  cons: string;
  verdict: string;               // one-line summary for video
}

interface Checkpoint {
  key: string;                   // 'spray' | 'drydown' | 'skin' | 'custom_<timestamp>'
  label: string;                 // display label
  minutes: number;               // elapsed minutes since startTime — captured automatically
  note: string;                  // what it smells like right now
  projection: string;            // projection AT THIS MOMENT
  loggedAt: string;              // ISO
}

interface Compliment {
  text: string;                  // what the person said / what happened
  minutes: number;               // elapsed at time of logging
  loggedAt: string;              // ISO
}
```

### 3.3 Derived values (computed, never stored)

| Function | Returns |
|---|---|
| `fullName(t)` | `name + ' ' + flanker` |
| `fullTitle(t)` | `house + ' ' + fullName(t)` |
| `cpl(t)` | `'$X.XX/ml'` display string |
| `cplNum(t)` | numeric cost-per-ml, `Infinity` if unpriced |
| `longBand(t)` | `'Under 4h' \| '4-8h' \| '8h+'` — filter bucket |
| `longHrs[longevity]` | numeric hours for sorting/averaging |

---

## 4. Application structure

### 4.1 Navigation

Two levels, both persisted:

```
[ StevnScents | Fallowmark ]        ← notebook tabs (data partition + theme)
[ Tests | Collection | Insights | Compare | Guide ]  ← view tabs
```

### 4.2 View: Tests

The primary working view.

**In progress section** — one card per active test:
- Fragrance name with flanker as lighter inline subtitle; brand beneath
- "Brand markets it as inspired by X" line when present
- Metadata chips: concentration, spray count, application spots, weather, cost/ml
- Live elapsed timer (re-renders on a 60s interval)
- **Decay bar** — horizontal 0→12h gradient with a pin marking each logged checkpoint. This is the signature visual element.
- Three phase buttons: **Initial Spray**, **Dry Down**, **Skin Scent**. Logged phases invert to solid and display elapsed time.
- Contextual hint naming the next unlogged phase with guidance on when it typically occurs
- `+ Extra check-in` — custom-labeled checkpoint at any moment
- `+ Log a compliment` — timestamped record of what someone said
- Chronological note list; tapping any entry re-opens it for editing (timestamp preserved)
- Compliments render as accent-bordered callouts
- Actions: Discard | Finish test

**Past tests section:**
- Search input (matches name, flanker, brand, inspired-by, verdict, all note fields, pros/cons, season notes, families, checkpoint notes)
- Sort dropdown (9 options)
- Filter button with active-count badge, opening a collapsible chip panel (12 groups)
- Result count when filtered: "Showing 24 of 160"
- Collapsed cards showing name, brand, type, date, performance badges, score, tier
- Expanded detail: verdict, note pyramid, season reasoning, pros/cons, two metadata grids, full checkpoint history
- Per-card actions: Copy for script | Edit ratings | Test again | Delete
- Pagination at 30 records with "Show more"
- "Copy all tests" export

### 4.3 View: Collection

A catalogue of bottles owned, independent of whether they have been tested. A test can
exist for something never owned (tried in a shop), and a bottle can be owned for months
before its first wearing — so these are separate records, not two states of one thing.

- One card per bottle: photo thumbnail, name with flanker, brand, type, concentration, size
- Badges for cost/ml and either a completed-test count or `Untested`
- Free-text search across brand, name, flanker, type, concentration and notes; appears past four bottles
- Actions: **Edit** | **Test this** | **Remove**
- **Test this** starts a wear test with identity and reference fields carried over, then switches to the Tests view
- Sorted by brand then name

Every bottle is public on the collection page — unlike tests, there is no per-item share
toggle, by explicit choice.

### 4.4 View: Insights

Aggregate analysis over completed tests in the active notebook.

- Four stat tiles: total tests, average longevity, average score, average cost/ml, plus S/A-tier count
- **Longest lasting** — top 5
- **Most tested brands** — horizontal bar chart, top 8
- **Best value** — S/A tier sorted by ascending cost/ml
- **Most complimented** — ranked by logged compliment count
- **Collection leans** — scent family distribution bar chart
- **Video ideas from your data** — rule-based generator producing concrete content prompts from the actual dataset (tier list when ≥3 S-tier exist, survivor format at ≥5 dupes, honest-callout when a poor performer exists, price-shock from the best value entry, compliment story from logged compliments, seasonal roundup at ≥3 in one season, side-by-side when ≥2 have stated inspirations)

### 4.5 View: Compare

Two dropdowns select any two completed tests. Renders a side-by-side table across ~20 rows. Winning cell is highlighted per row where a comparison is objectively possible (longevity, cost/ml, tier, score, compliment count). Includes a copy-to-clipboard export.

### 4.6 View: Guide

Twelve collapsible plain-language explainers, each ending with a quotable on-camera line:

1. Longevity vs projection vs sillage
2. Top, heart and base notes
3. EDT vs EDP vs Extrait
4. Why the same bottle smells different on people
5. How many sprays, and where
6. Heat, cold and season
7. Storage — the mistake almost everyone makes
8. Dupes, clones and how to talk about them
9. Batches and reformulations
10. Nose blindness
11. Decants, samples and splits
12. Blind buying

This is static reference content, not user data.

---

## 5. Sort and filter configuration

```js
const sortOpts = [
  ['recent','Recently tested'], ['oldest','Oldest first'],
  ['name','Name A-Z'], ['brand','Brand A-Z'],
  ['tier','Tier (best first)'], ['longevity','Longevity (longest)'],
  ['value','Best value ($/ml)'], ['compliments','Most compliments'],
  ['score','Score (high to low)']
];

const filterGroups = [
  { key:'type',        label:'Type',          opts:['Dupe','Designer','Niche','Indie'] },
  { key:'tier',        label:'Tier',          opts:['S','A','B','C','D','F'] },
  { key:'brand',       label:'Brand',         dynamic:true },
  { key:'families',    label:'Scent family',  multi:true, dynamic:true },
  { key:'seasons',     label:'Season',        multi:true, opts:[...] },
  { key:'occasions',   label:'Occasion',      multi:true, opts:[...] },
  { key:'longBand',    label:'Longevity',     opts:['Under 4h','4-8h','8h+'] },
  { key:'dayNight',    label:'Day or night',  opts:['Daytime','Evening','Either'] },
  { key:'gender',      label:'Gender lean',   opts:[...5 point scale] },
  { key:'value',       label:'Worth it',      opts:['Steal','Fair','Overpriced'] },
  { key:'rebuy',       label:'Buy again',     opts:['Yes','Maybe','No'] },
  { key:'flankerOnly', label:'Flankers',      opts:['Flankers only','Originals only'] }
];
```

**Semantics:** OR within a group, AND across groups. `dynamic: true` derives options from the current dataset. `multi: true` matches if any selected value intersects the record's array.

---

## 6. Design system

Deliberately paper-and-ink, warm and analog — closer to a field notebook than a SaaS dashboard. Avoids the generic dark-mode-plus-neon-accent look.

### Color tokens

```css
--paper:      #ece2ce;   /* page background */
--paper-deep: #ddd0b3;   /* pressed states */
--card:       #f4ecdd;   /* card surfaces */
--ink:        #2b241d;   /* primary text, filled buttons */
--ink-soft:   #6b5f4f;   /* secondary text, labels */
--line:       rgba(43,36,29,0.14);
--wine:       #8c4a48;   /* destructive, projection badges */

/* Notebook accent — swapped via body.nb-* class */
StevnScents:  --accent:#b8823c  --accent-deep:#8f6529  --accent-soft:rgba(184,130,60,.14)
Fallowmark:   --accent:#74886a  --accent-deep:#52603f  --accent-soft:rgba(116,136,106,.16)
```

Tier chips carry their own colors: S `#8f6529`, A `#5d6b4b`, B `#4a5a68`, C `#6b5f4f`, D `#8c6a48`, F `#8c4a48`.

### Typography

- **Display:** Libre Caslon Text, italic — fragrance names, headings, numerals, tier chips. This is the Fallowmark brand typeface.
- **UI/body:** Manrope, weights 400–800.
- **Labels:** 9–10px, `letter-spacing: .14–.24em`, uppercase, weight 700.

### Layout

- Max width 600px, centered
- Cards: 6px radius, 1px border, 17px padding, subtle shadow
- Bottom sheets slide up from the bottom, max-height 90vh, 18px top radius, drag-handle affordance
- Chips: 20px radius pills; selected state inverts to ink fill
- Respects `env(safe-area-inset-bottom)` for iPhone home indicator

---

## 7. Interaction patterns

**Progressive disclosure.** The fast path stays fast. Starting a test requires brand + name only; weather, price, batch, perfumer, and release year sit behind a "More detail" toggle. The wrap-up sheet has five collapsible sections with only *Performance* open by default; each header shows an "N filled" badge so completion state is visible at a glance.

**Automatic timestamping.** Checkpoint elapsed time is computed from `startTime` at the moment of logging. The user is never *required* to enter a time.

An "Adjust the time" toggle — collapsed by default, in both the check-in and compliment sheets — allows correcting when something actually happened, for the case where a check-in is logged late. Revealing it and picking a time overrides both `minutes` and `loggedAt`; leaving it closed keeps the behaviour fully automatic. Corrections are validated against `startTime` and the present moment, and re-sort the checkpoint timeline. Because the picker is minute-precision while `startTime` carries seconds, elapsed is computed minute-to-minute so the arithmetic matches what the user expects. Editing an existing checkpoint prefills its original time.

**Everything editable after the fact.** Completed tests reopen the wrap-up sheet fully populated. "Test again" clones identity and reference fields into a fresh test — for re-testing the same bottle in different weather.

**Export as the primary output.** Every test serializes to plain text via `testToText()` covering setup, all checkpoints with timings, compliments, and the full profile. Three scopes: single test, comparison pair, entire notebook. Clipboard is the handoff mechanism into script drafting.

---

## 8. Sandbox constraints — critical

These are hard limits of the Artifacts runtime and were the source of one shipped bug.

> **Note:** these apply only when the app is running *inside* a Claude Artifact. Served
> as an ordinary web page (see `README.md`), `localStorage` is available and the storage
> adapter selects it automatically — no code change needed between the two environments.

| Constraint | Consequence |
|---|---|
| `localStorage` / `sessionStorage` **unavailable** | Must use `window.storage` |
| `confirm()`, `alert()`, `prompt()` **silently blocked** | Native dialogs return falsy without erroring. All confirmations must be custom in-app sheets. *This caused delete to silently fail.* |
| No file uploads / no image capture | Bottle photos not currently possible |
| 5 MB per storage key | ~160 richly-filled tests is comfortably inside this; monitor if photos or long-form notes are ever added |
| No push notifications, no background execution | Cannot remind the user to log a check-in |
| `<form>` elements discouraged | Use click handlers |

**Storage API surface:**
```js
await window.storage.get(key, shared)     // → {key, value, shared} | throws if missing
await window.storage.set(key, value, shared)
await window.storage.delete(key, shared)
await window.storage.list(prefix, shared)
```
All calls must be wrapped in try/catch — a missing key throws rather than returning null.

---

## 9. Known limitations of the current build

1. **Full re-render on every interaction.** `render()` rebuilds all of `#content` and re-attaches listeners. Fine at 160 records with 30-per-page pagination; would need reworking at 1000+.
2. **Search input focus restoration is manual.** Cursor position is saved and restored across the re-render — a workaround for the above.
3. ~~**No untested backlog.**~~ Resolved. The Collection view catalogues owned bottles independently of whether they have been tested; each shows a completed-test count or `Untested`.
4. ~~**No photos.**~~ Resolved once outside the sandbox. Bottle photos are downscaled to ~1200px JPEG on capture, held in IndexedDB, and synced as individual files under `data/photos/`. Records store only the filename, so the log JSON stays small enough to rewrite on every change.
5. **No notification reminders** for the dry-down and skin-scent windows.
6. ~~**No cross-device sync.**~~ Resolved. Optional GitHub-backed sync writes a shared
   JSON file to the repo via the Contents API, with a per-device token. Records carry
   `updatedAt`; deletions carry tombstones; merge is union-by-id with newest-wins and a
   retry on a stale blob SHA. JSON backup/restore remains as the offline bridge.
7. **Guide content is hardcoded** in a JS array rather than data-driven.
8. **No undo** after deletion.

---

## 10. Suggested roadmap

Ordered by value to the actual workflow:

1. ~~**Untested backlog / queue.**~~ Done, as the Collection view — see §4.3. Implemented as a `kind: 'bottle' | 'test'` discriminator on the shared record store rather than a status enum, since a bottle you own and a wearing of it are different things.
2. ~~**Photo capture.**~~ Done for bottles in the Collection. A per-test wear-context shot is still open.
3. **Check-in reminders.** Local notifications at ~45min and ~4h. Requires a real PWA or native shell.
4. ~~**Collection view separate from test history.**~~ Done. Bottles are first-class records; the card rolls up how many completed tests match on `house + name + flanker`.
5. **Batch/reformulation comparison.** Same fragrance, different batches, side by side.
6. **CSV / JSON export** in addition to clipboard text.
7. **Fragrantica or similar lookup** to pre-fill note pyramids instead of manual entry.
8. **Content-calendar link** — mark which tests have become videos and which are still unpublished material.

---

## 11. If rebuilding outside the sandbox

Recommended target: **Vite + React + TypeScript**, deployed as an installable PWA.

**What changes:**
- Replace `window.storage` with IndexedDB (via `idb` or Dexie) for larger capacity and structured queries; add an export/import path for backup.
- Replace string-template rendering with components; the current render functions map cleanly to `<ActiveTestCard>`, `<HistoryCard>`, `<NotePyramid>`, `<FilterPanel>`, `<InsightsPanel>`, `<CompareTable>`, `<GuideAccordion>`.
- Native `confirm()` becomes available, but keeping custom sheets is better UX on mobile.
- Add a service worker for genuine offline support and installability.
- Photo capture via `<input type="file" capture="environment">`, stored as blobs in IndexedDB.
- Notifications API for check-in reminders.

**What should not change:**
- The three-phase model (Initial Spray / Dry Down / Skin Scent). It matches how a fragrance actually behaves and how reviews are structured.
- Automatic timestamping as the default. Never *require* the user to enter a time — correcting one late is optional and stays behind a toggle.
- Progressive disclosure. Required fields must stay minimal.
- The two-notebook partition.
- Export-to-clipboard as a first-class output. The app exists to feed script writing.
- The paper/ink visual identity and Libre Caslon Text display face — these tie to the Fallowmark brand system.

---

## 12. File map of the current build

Single file, in order:

```
<head>
  Google Fonts link (Libre Caslon Text, Manrope)
  <style>  ~700 lines — tokens, layout, components, sheets, responsive
</head>
<body>
  #app
    header
    #tabBar        notebook switch
    #viewBar       view switch
    #content       render target
  #fabWrap         "+ New test" button, hidden outside Tests view
  Overlays (static markup, populated on open):
    #newTestOverlay    setup form + "More detail" block
    #noteOverlay       checkpoint note + projection
    #customOverlay     custom checkpoint label prompt
    #compOverlay       compliment entry
    #endOverlay        5-section profile wrap-up
    #confirmOverlay    custom delete confirmation
  #toast
  <script>  ~950 lines
    state + constants (phases, sortOpts, filterGroups, longHrs, tierOrder)
    helpers (toast, uid, esc, fmtEl, fmtDate, norm, cpl, fullName, longBand)
    load() / save()
    render() → viewTests | viewInsights | viewCompare | viewGuide
    card builders (cardActive, cardHist, notesBlock, pyramid, filterPanel)
    bind() — re-attaches all dynamic listeners after each render
    chip helpers (chipSingle, chipMulti, get/setSingle, get/setMulti)
    sheet open/save handlers
    export (testToText, clip, copyOne, exportAll, copyCmp)
    nav listeners
    load()
</script>
```
