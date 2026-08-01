---
name: run-fragrances
description: Build, run, and drive Scent Log (fragrances), a single-file index.html fragrance wear-testing PWA. Use when asked to start the app, launch it, take a screenshot of it, add a bottle to the collection, log a wear test, or otherwise interact with the running app.
---

Scent Log is a static, no-build PWA — just `index.html` + `sw.js` +
`manifest.webmanifest` at the repo root. There is no dev server, package.json,
or build step: serve the folder with any static file server and open it in a
browser. For agent/automated use, drive it via the Playwright REPL at
`.claude/skills/run-fragrances/driver.mjs` against headless Chromium — there
is no `chromium-cli` in this environment, so this driver is the fallback the
`run-skill-generator` process calls for.

All paths below are relative to the repo root (`/workspace/fragrances` in
this container).

## Prerequisites

Node.js and Playwright are already present in this container — no install
needed. Confirmed present:

```bash
node --version            # v22.x
node -e "console.log(require.resolve('playwright', {paths: [require('child_process').execSync('npm root -g').toString().trim()]}))"
# -> /opt/node22/lib/node_modules/playwright/index.js
```

`playwright` is installed globally, not in this repo (there's no
`package.json`/`node_modules` here at all) — a plain `node -e
"require.resolve('playwright')"` from this repo fails with
`MODULE_NOT_FOUND`. `driver.mjs` handles that itself at runtime (see
Gotchas), so you don't need `NODE_PATH` set by hand; the command above is
just to confirm the global install is really there.

Playwright's own browser download is skipped in this container
(`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`); Chromium is preinstalled at
`/opt/pw-browsers/chromium` (a symlink into `/opt/pw-browsers/chromium-1194/`).
The driver hardcodes that path and falls back to Playwright's own resolution
only if it's missing — don't run `playwright install`.

## Setup

None — no dependencies to install, nothing to configure. Skip the optional
GitHub sync feature described in `README.md`; it needs a personal access
token and is irrelevant to running the app locally.

## Build

No build step.

## Run (agent path)

Serve the static files, then drive them with the Playwright REPL:

```bash
cd /workspace/fragrances
python3 -m http.server 8735 > /tmp/http-server.log 2>&1 &
disown
curl -sf http://localhost:8735/ -o /dev/null && echo "server OK"
```

```bash
tmux new-session -d -s fr -x 200 -y 60
tmux send-keys -t fr 'cd /workspace/fragrances && SCREENSHOT_DIR=/tmp/shots-fragrances node .claude/skills/run-fragrances/driver.mjs http://localhost:8735/' Enter
timeout 20 bash -c 'until tmux capture-pane -t fr -p | tail -1 | grep -q "driver>"; do sleep 0.3; done'
tmux send-keys -t fr 'launch' Enter
timeout 30 bash -c 'until tmux capture-pane -t fr -p | tail -3 | grep -q "launched\|ERROR"; do sleep 0.3; done'
tmux send-keys -t fr 'ss 01-landing' Enter
timeout 15 bash -c 'until tmux capture-pane -t fr -p | tail -2 | grep -q "screenshot:"; do sleep 0.3; done'
tmux capture-pane -t fr -p
```

**The driver opens a 390x844 phone viewport by default**, at
`deviceScaleFactor: 2`. Scent Log is used on a phone; a 1280px-wide
screenshot hides every mobile layout problem there is. Check the tight end
too — `viewport 360x780` is where wrapping actually breaks — and switch to
`viewport 1280x900` only to confirm the desktop case. `VIEWPORT=1280x900` in
the environment sets the launch default instead.

**`tmux capture-pane -p | tail -1` is unreliable for the prompt poll** — the
pane is padded with blank lines, so the last line is usually empty. Filter
them out first:

```bash
tmux capture-pane -t fr -p | grep -v '^[[:space:]]*$' | tail -1   # -> driver>
```

**Use a screenshot directory unique to your task** (`SCREENSHOT_DIR=/tmp/shots-fragrances`
above), not the generic `/tmp/shots` default — this container can be shared
with sibling agent sessions that also default to `/tmp/shots`, and their
writes will land in and get read back from the same directory as yours. This
was observed directly in this container: unrelated screenshots
(`bottles-forsale-*.png` from a different app) appeared in `/tmp/shots`
mid-run. `driver.mjs` still defaults to `/tmp/shots` if `SCREENSHOT_DIR` is
unset — always set it explicitly.

Stop the server with `lsof -ti:8735 -sTCP:LISTEN | xargs -r kill` when done;
`disown` above detaches it from the shell so `kill %1` won't reach it.

### One verified end-to-end flow: add a bottle to the collection

```bash
tmux send-keys -t fr 'click [data-section=collection]' Enter
tmux send-keys -t fr 'ss 02-collection' Enter
tmux send-keys -t fr 'click #newTestBtn' Enter
tmux send-keys -t fr 'ss 03-add-bottle-sheet' Enter
tmux send-keys -t fr 'fill #bHouse Lattafa' Enter
tmux send-keys -t fr 'fill #bName Khamrah' Enter
tmux send-keys -t fr 'ss 04-add-bottle-filled' Enter
tmux send-keys -t fr 'click #saveBottleBtn' Enter
tmux send-keys -t fr 'wait-text Saved to your collection' Enter
tmux send-keys -t fr 'ss 05-collection-after-save' Enter
tmux send-keys -t fr 'count .bottle-card' Enter
tmux send-keys -t fr 'console-errors' Enter
tmux capture-pane -t fr -p
```

Ran exactly this in this container: the "Saved to your collection" toast
appeared, `count .bottle-card` returned `1`, and the resulting screenshot
shows a new card — "Khamrah" / "Lattafa · Dupe" / "Untested" — with the data
panel reading "Saved on this device · last saved <time>", confirming the
write reached local storage. `#newTestBtn` is the single FAB used for both
flows: its label swaps between "+ New test" (Wear log tab) and "+ Add a
bottle" (My collection tab), and it always opens the overlay appropriate to
the active section (`#bottleOverlay` in collection view).

Screenshots land in `/tmp/shots-fragrances/` (or wherever `SCREENSHOT_DIR`
points). Actually open the PNGs and look at them — a "no such element"
failure and a real render can both leave the REPL looking successful.

### Commands

| command | what it does |
|---|---|
| `launch` | open headless Chromium, navigate to the base URL |
| `ss [name]` | screenshot → `<SCREENSHOT_DIR>/<name>.png` |
| `ssfull [name]` | full-page screenshot — the only way to judge vertical rhythm |
| `viewport <w>x<h>` | resize the open page, e.g. `viewport 360x780` |
| `reload` | reload the page (picks up edits to `index.html`) |
| `scroll <px>` | `window.scrollTo(0, px)` |
| `evalfile <path>` | read a local `.js` file and evaluate its contents in the page |
| `click <css-sel>` | Playwright `page.click()` |
| `click-text <text>` | click a button/link/tab/chip by visible text (substring match fallback) |
| `fill <css-sel> <text>` | Playwright `page.fill()` — the rest of the line is the value |
| `type <text>` / `press <key>` | raw keyboard input |
| `wait <css-sel>` | wait for element visible, 10s timeout |
| `wait-text <text>` | wait for `document.body.innerText` to contain text, 10s timeout |
| `eval <js-expr>` | evaluate in the page, print JSON |
| `text [css-sel]` | print `innerText` of selector (or `body`) |
| `count <css-sel>` | print `querySelectorAll(sel).length` |
| `console-errors` | print all captured `console.error` / `pageerror` messages so far |
| `quit` | close the browser, exit the REPL |

## Run (human path)

```bash
cd /workspace/fragrances
python3 -m http.server 8735
# open http://localhost:8735/ in a real browser
```

Ctrl-C to stop. No build, no install — it's a static folder.

## Gotchas

- **No `chromium-cli` in this environment** — confirmed absent (`which
  chromium-cli` finds nothing). The Playwright REPL driver here is the
  documented fallback, not an interim workaround.
- **`playwright` isn't in a local `node_modules`** (this repo has no
  `package.json` at all) — a bare `import 'playwright'` only resolves if
  `NODE_PATH` happens to include the global npm root. `driver.mjs` handles
  this itself: it tries the normal import first, then falls back to
  importing straight from `` `npm root -g`/playwright/index.js ``. That
  file is CommonJS, so under dynamic `import()` its named exports (like
  `chromium`) land on `.default`, not as top-level named exports — the
  driver accounts for that too (`mod.chromium ?? mod.default?.chromium`).
- **Shared `/tmp/shots` across concurrent agent sessions** — see the Run
  section above. Always pass `SCREENSHOT_DIR` explicitly.
- **Two console errors on first load are expected and benign**: `Failed to
  load resource: net::ERR_CONNECTION_RESET` (fetching
  `raw.githubusercontent.com/.../data/scent-log.json` — no such published
  repo/branch reachable from this container) and a 404 for the local
  `data/scent-log.json` fallback (that file doesn't exist in a fresh
  checkout). Both come from `tryPublic()`'s startup race in `index.html`,
  which explicitly catches both failures (`fetchWithTimeout` swallows
  errors and returns `null`) — the app still renders and behaves normally.
  Don't treat these two as a sign the app is broken; do treat *new* console
  errors appearing after an interaction as real.

## Troubleshooting

- **`curl: (7) Failed to connect` after starting the server**: the
  `python3 -m http.server` backgrounded process didn't actually start (wrong
  cwd, port in use). `disown` it after backgrounding so a later `kill %1`
  from a fresh shell doesn't try (and fail) to reach it — use
  `lsof -ti:8735 -sTCP:LISTEN | xargs -r kill` to actually free the port.
- **`driver> launch` → `ERROR: Cannot read properties of undefined (reading
  'launch')`**: this means the playwright-module fallback resolved the
  wrong shape (e.g. picked up the CJS default export without unwrapping
  `.chromium`). Already fixed in `driver.mjs`'s import logic — if you see
  this again after editing the driver, check that fallback block first.
- **tmux pane shows your command echoed but no driver output yet**: the
  `timeout 20 bash -c 'until tmux capture-pane ... done'` poll pattern used
  throughout this doc is required — a fixed `sleep` occasionally isn't
  enough on first launch (Chromium cold start).
