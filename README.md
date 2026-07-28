# Fragrances

**Scent Log** — a fragrance wear-testing tracker. Log the spray, the dry down and the
skin scent as they happen, then pull the results up as reference while writing or
recording video.

Full design and data-model documentation: [`SCENT-LOG-SPEC.md`](SCENT-LOG-SPEC.md).

---

## Opening it

**On your phone (the intended way).** Once Pages is switched on (one-time step below),
the app lives at:

```
https://sinkinice.github.io/Fragrances/
```

Open that in Safari → Share → **Add to Home Screen**. It then launches full-screen with
no browser chrome and works with no signal.

**On a computer.** Double-click `index.html`. Everything works except the service
worker, which browsers only run over `http(s)`.

**Inside a Claude Artifact.** Still supported — paste the contents of `index.html`. It
detects which environment it is in and picks the right storage automatically.

### One-time setup for the phone URL

GitHub Pages needs to be enabled by hand once:

1. Repo **Settings → Pages**
2. **Source: GitHub Actions**
3. Merge this branch into `main`

The included workflow (`.github/workflows/pages.yml`) publishes on every push to `main`
after that. If this repo is private, Pages requires a paid plan — otherwise make it
public, or just use `index.html` locally.

---

## Where your data lives

It saves **automatically on every change** — there is no save button. The footer of the
app shows where it is stored and the time of the last write:

> YOUR DATA
> Saved on this device · last saved 3:04 PM

Data is stored in the browser on the device you are using. It is **not** synced between
your phone and your computer, and it is not stored on GitHub.

## Backing up — please actually do this

The **Back up to file** button writes a dated `.json` file containing every test.
**Restore from file** reads one back.

Restore **merges by test ID and never deletes anything** — records not already present
get added, and matching records are updated from the file. It is safe to run against a
log that already has data in it, so it doubles as the way to move your log between
devices: back up on one, restore on the other.

Two reasons to keep backups:

- Safari clears storage for websites you have not opened in about a week. Adding the app
  to your Home Screen gives it storage that is not subject to that, but a file backup is
  the only real guarantee.
- Clearing browser data, or a lost phone, takes the log with it.

If anything ever goes wrong with the stored data, the app keeps the unreadable copy
instead of overwriting it, and tells you so rather than starting silently empty.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app — markup, styles and logic in one file |
| `manifest.webmanifest` | Name, colours and icons for Home Screen install |
| `sw.js` | Service worker — offline shell and font caching |
| `icons/` | App icons (192, 512, and 180 for iOS) |
| `SCENT-LOG-SPEC.md` | Design spec, data model and roadmap |
| `.github/workflows/pages.yml` | Publishes the app to GitHub Pages |
