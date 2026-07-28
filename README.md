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
Branch       data
File path    data/scent-log.json
Access token github_pat_…
```

**Save and sync now.** Repeat on each device you use.

The token is stored only on that device. It is never committed and never written into a
backup file.

### How syncing behaves

- Pushes about 2.5 seconds after you stop making changes, to the **`data`** branch —
  never to `main`. That matters: a commit to `main` rebuilds the whole site, so logging a
  wear used to fire a deploy per check-in.
- Your public page reads the log straight from that branch, so it updates within moments
  of a sync instead of waiting on a build.
- Pulls when you switch back to the app, so picking up your phone gets the latest.
- **Sync now** forces it immediately.
- Edits on two devices merge per test — the most recently edited version wins, and
  tests only one device has are kept.
- Deleting a test deletes it everywhere; it will not reappear from the other device.
- If two devices write at once, the loser re-reads, re-merges and retries.
- Offline changes queue up and go out on the next sync.

---

## Your collection

The app has two sections, switched at the very top: **Wear log** and **My collection**.
The collection is a catalogue of what you own, separate from wear tests — so you can test
something in a shop without owning it, and own bottles you have not tested yet.

Add a bottle with **+ Add a bottle**: brand, name, type, concentration, price, size,
notes, and a **photo**. Each card shows cost per ml, how many completed tests it has (or
`Untested`), and its average score.

At the top you get **collection stats**: bottles owned, total spent, total ml, average
cost per ml, tested vs untested, a breakdown by type, your biggest brands, spend by
brand, and your cheapest and priciest bottles per ml. Money stats count only bottles that
actually have a price and tell you how many that was, rather than quietly averaging over
blanks.

**You should not have to type the same fragrance twice.** When you start adding a bottle
you have already tested (or already own), a prompt appears offering to reuse the details
— type, concentration, inspired-by, price, size. It only fills blanks, so nothing you
have typed gets overwritten.

**Tap a bottle to open it** and you get its full test history, plus four actions:

| Action | What it does |
|---|---|
| **Log a test** | Starts a wear test with the details filled in, attached to this bottle |
| **Link a past test** | Attaches a test you already logged |
| **Edit** | Change details or the photo |
| **Remove** | Take it out of the collection |

Tests you logged *before* cataloguing a bottle attach themselves automatically when the
brand, name and flanker match — you should not have to link most things by hand. **Link a
past test** is there for the odd one out, like a flanker you recorded under its own name.
Tapping any test in that list jumps straight to it in the wear log.

**Photos** are downscaled to about 1200px on capture (a 3MB phone photo lands near
200KB), stored on your device, and uploaded to the repo as separate image files under
`data/photos/`. Your log file only ever stores the filename, which is what keeps it small
enough to save on every keystroke.

**Every bottle in your collection is public** — there is no per-bottle toggle, by your
choice. That is different from tests, which stay private until you share each one.

## Exporting for a review

Three buttons, all copy to the clipboard:

| Where | Button | What you get |
|---|---|---|
| A finished test | **Copy as review** | The wearing written up as prose — conditions, how it developed, notes, performance, seasons, compliments, pros/cons, value, verdict, rating |
| A bottle | **Copy as review** | The bottle's details plus every completed wearing of it, written up the same way |
| Collection | **Copy my whole collection** | A sorted list of what you own with cost/ml, test count and average score |

**Copy as review** is deliberately different from **Copy for script**. The script export
dumps everything including your working notes; the review export leaves out the internal
scaffolding (the context field, tier, share flags) and reads as something you can paste
into Fragrantica or a caption and lightly edit.

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

The page reads your log straight from the `data` branch, so it reflects a sync within
moments — it does not wait for a site rebuild.

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
| `data/scent-log.json` | Your synced log — lives on the **`data`** branch, and is public |
| `data/photos/` | Bottle photos, also on the `data` branch — also public |
| `SCENT-LOG-SPEC.md` | Design spec, data model and roadmap |
| `.github/workflows/pages.yml` | Publishes the app to GitHub Pages |
