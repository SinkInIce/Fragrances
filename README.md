# Fragrances

**Scent Log** — a fragrance wear-testing tracker. Log the spray, the dry down and the
skin scent as they happen, then pull the results up as reference while writing or
recording video.

Full design and data-model documentation: [`SCENT-LOG-SPEC.md`](SCENT-LOG-SPEC.md).

---

## Setup — do these once

### 1. Make the repo public

**Settings → General →** scroll to **Danger Zone → Change visibility → Public.**

Required because GitHub Pages does not serve private repos on the free plan.

> **Know what this means.** The app code, the spec, and your synced log file all become
> readable by anyone. Nobody can *edit* anything without being added as a collaborator,
> but they can read it. See **What is actually public** below — it matters more than it
> sounds.

### 2. Turn on Pages

**Settings → Pages → Source: GitHub Actions.**

### 3. Merge to `main`

The deploy workflow only runs on `main`. Once merged, the app publishes automatically
on every push and lives at:

```
https://sinkinice.github.io/Fragrances/
```

### 4. Put it on your phone

Open that URL in **Safari** — Chrome cannot install to the iOS Home Screen — then
**Share → Add to Home Screen.**

It launches full-screen with its own icon, no address bar, and works with no signal.

---

## Turning on sync

Without sync, each device keeps its own separate log. Sync stores one shared JSON file
in this repo at `data/scent-log.json`.

**Make a token** at **github.com/settings/personal-access-tokens/new**:

| Field | Value |
|---|---|
| Repository access | **Only select repositories** → `Fragrances` |
| Permissions → Repository → **Contents** | **Read and write** |
| Expiration | Your call — you re-paste the token when it lapses |

Copy the token (it is shown once). Then in the app: **Sync setup**, and fill in:

```
Repo owner   SinkInIce
Repo name    Fragrances
Branch       main
File path    data/scent-log.json
Access token github_pat_…
```

**Save and sync now.** Repeat on each device you use.

The token is stored only on that device. It is never committed and never written into a
backup file.

### How syncing behaves

- Pushes about 2.5 seconds after you stop making changes.
- Pulls when you switch back to the app, so picking up your phone gets the latest.
- **Sync now** forces it immediately.
- Edits on two devices merge per test — the most recently edited version wins, and
  tests only one device has are kept.
- Deleting a test deletes it everywhere; it will not reappear from the other device.
- If two devices write at once, the loser re-reads, re-merges and retries.
- Offline changes queue up and go out on the next sync.

---

## Your public page

Followers get the same URL you use. With no token in their browser and no log of their
own, the app shows a **read-only collection page** instead of the editor: your shared
tests, the Insights charts, and the Guide. No new-test button, no edit or delete, no
storage panel.

**Sharing is opt-in per test.** Open a finished test and tap **Add to public page**. It
gets a `Public` badge, and only then does it appear for visitors. Nothing is published
by finishing a test, so a fragrance stays unlisted until the day its video goes live.

**Copy public link** in the app copies the follower URL (`…/?public=1`). Your own devices
keep working normally — and `…/?edit=1` always forces the editor if you land on the
public view on a new device.

The page updates a minute or two after you sync, once Pages redeploys.

### What is actually public

This is the part worth reading twice.

| | Who can see it |
|---|---|
| Tests you tapped **Add to public page** | Anyone — that is the point |
| Tests you did **not** share | **Also readable**, in the raw file |
| Your access token | Nobody — it never leaves your device |

Sync writes your **entire** log to `data/scent-log.json` in this public repo. The Share
toggle decides what the *page renders*; it does not decide what the *file contains*.
Anyone who opens that file on github.com sees every test, including unreleased verdicts.

If you want unshared tests genuinely hidden, the fix is to split them: keep the full log
syncing to a **private** repo and publish only the shared subset to this public one. Say
the word and I'll wire it up — it is about an hour of work and one extra repo.

## Where your data lives

It saves **automatically on every change** — there is no save button. The footer shows
where it is stored, the last write, and sync state:

> YOUR DATA
> Saved on this device · last saved 3:04 PM
> Synced with SinkInIce/Fragrances · 3:04 PM

## Backing up

**Back up to file** writes a dated `.json` of every test; **Restore from file** reads one
back. Restore **merges by test ID and never deletes**, so it is safe to run against a log
that already has data.

Worth doing even with sync on — sync keeps devices in step, but it will just as happily
sync a mistake. A file is the only copy that cannot be overwritten.

If stored data ever becomes unreadable, the app keeps the bad copy instead of
overwriting it, and says so rather than starting silently empty.

---

## Making it private again

If you later want the log out of public view: switch the repo back to private, and
either move sync to a second private repo (change **Repo name** in Sync setup on each
device) or move hosting to Cloudflare Pages, which serves private repos free. Ask and
I'll set either up.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app — markup, styles and logic in one file |
| `manifest.webmanifest` | Name, colours and icons for Home Screen install |
| `sw.js` | Service worker — offline shell and font caching |
| `icons/` | App icons (192, 512, and 180 for iOS) |
| `data/scent-log.json` | Your synced log — created on first sync, and public |
| `SCENT-LOG-SPEC.md` | Design spec, data model and roadmap |
| `.github/workflows/pages.yml` | Publishes the app to GitHub Pages |
