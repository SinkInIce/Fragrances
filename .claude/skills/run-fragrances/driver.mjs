#!/usr/bin/env node
// REPL driver for Scent Log (fragrances). Drives a headless Chromium against
// the static app served over HTTP. Designed for agents: wrap in tmux,
// send-keys commands one at a time, capture-pane the output.
//
// Requires the app to already be served, e.g.:
//   python3 -m http.server 8735   (run from the repo root)
//
// Usage:
//   node .claude/skills/run-fragrances/driver.mjs [baseUrl]
//   (baseUrl defaults to http://localhost:8735/)
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// This repo has no package.json / node_modules — playwright lives in the
// global npm root instead. Try a normal import first (works if NODE_PATH is
// already set, or if the repo grows a local install later), then fall back
// to resolving it from `npm root -g` directly.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  const pwEntry = path.join(globalRoot, 'playwright', 'index.js');
  const mod = await import(pathToFileURL(pwEntry).href);
  // CJS interop: playwright's `chromium` export lands on the default export,
  // not as a named export, when imported this way.
  chromium = mod.chromium ?? mod.default?.chromium;
}

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'http://localhost:8735/';
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Pinned Chromium install in this container — not the Playwright-managed one.
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const executablePath = fs.existsSync(CHROMIUM_PATH) ? CHROMIUM_PATH : undefined;

let browser = null;
let page = null;
const consoleErrors = [];

const COMMANDS = {
  async launch() {
    if (browser) return console.log('already launched');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox'],
      executablePath,
    });
    page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));
    await page.goto(BASE_URL, { waitUntil: 'load' });
    console.log('launched. url:', page.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.click(sel, { timeout: 10_000 });
      console.log('click', sel, '-> OK');
    } catch (e) {
      console.log('click', sel, '-> ERROR:', e.message.split('\n')[0]);
    }
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, .tab, [role="button"], .chip')];
      const el = els.find(e => e.textContent?.trim() === t)
              ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName + '.' + (el.className || '');
    }, text);
    console.log('click-text', JSON.stringify(text), '->', r);
  },

  async fill(argLine) {
    if (!page) return console.log('ERROR: launch first');
    const sp = argLine.indexOf(' ');
    const sel = sp === -1 ? argLine : argLine.slice(0, sp);
    const value = sp === -1 ? '' : argLine.slice(sp + 1);
    try {
      await page.fill(sel, value, { timeout: 10_000 });
      console.log('fill', sel, '<-', JSON.stringify(value), '-> OK');
    } catch (e) {
      console.log('fill', sel, '-> ERROR:', e.message.split('\n')[0]);
    }
  },

  async type(text) { if (page) await page.keyboard.type(text, { delay: 20 }); },
  async press(key) { if (page) await page.keyboard.press(key); },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try { await page.waitForSelector(sel, { timeout: 10_000, state: 'visible' }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async 'wait-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForFunction(t => document.body.innerText.includes(t), text, { timeout: 10_000 });
      console.log('found text:', text);
    } catch { console.log('TIMEOUT waiting for text:', text); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null));
  },

  async count(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(s => document.querySelectorAll(s).length, sel));
  },

  'console-errors'() {
    if (consoleErrors.length === 0) return console.log('no console errors captured');
    consoleErrors.forEach(e => console.log('ERR:', e));
  },

  async quit() { if (browser) await browser.close().catch(() => {}); browser = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async line => {
  const trimmed = line.trim();
  if (!trimmed) return rl.prompt();
  const sp = trimmed.indexOf(' ');
  const cmd = sp === -1 ? trimmed : trimmed.slice(0, sp);
  const rest = sp === -1 ? '' : trimmed.slice(sp + 1);
  const fn = COMMANDS[cmd];
  if (!fn) { console.log('unknown:', cmd, '- try: help'); return rl.prompt(); }
  try { await fn(rest); } catch (e) { console.log('ERROR:', e.message); }
  if (cmd === 'quit') { rl.close(); process.exit(0); }
  rl.prompt();
});
rl.on('close', async () => { await COMMANDS.quit(); process.exit(0); });

console.log('Scent Log driver -- base url:', BASE_URL, '-- "help" for commands, "launch" to start');
rl.prompt();
