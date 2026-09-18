// THE GATE THAT REPLACED THE EAR.
//
//   node tools/browser/gate-audio.mjs <url|live> [--n 3] [--json]
//
// THIS COPY IS THE ONE THAT RUNS. The `audio` job in .github/workflows/ci.yml
// invokes it against the built image on every pull request, and `audio` is a
// required check on main, so the merge button is what enforces it. A gate that
// only runs when somebody remembers it is advice, not a gate.
//
// Owner decision, 2026-09-18: *"ich will nix hören - kein ear gate"*, and then,
// asked what takes the ear's place: measurement as the gate. So this is the
// whole of what stands between an audible defect and the public site.
//
// WHAT IT CAN DECIDE, and this list is the honest boundary of the thing:
//
//   1. nothing sounds before a gesture — no AudioContext exists on load
//   2. the output does not clip
//   3. NO CHANNEL IS SILENT WITHOUT A RECORDED REASON. The parent project's
//      hardest-won rule, and the one a screenshot can never see: a page that
//      renders perfectly and plays nothing looks exactly like one that works.
//      Each channel is soloed; if it produces nothing, `silences[ch]` must say
//      why, and a silent channel with no reason fails the gate.
//   4. the noise bed's loop seam is not a click — the step across the wrap must
//      be an ordinary step, not the largest one
//   5. no console error, page error or failed request
//
// WHAT IT CANNOT DECIDE: whether any of it is good. A measurement proves a
// thing is not broken; it never proves it is worth hearing. That judgement had
// an owner and no longer has one, and pretending otherwise would be the worst
// thing this file could do.
//
// EVERY THRESHOLD CARRIES MARGIN FOR THE BIMODAL RENDER. Measured 2026-09-18:
// the same `renderOffline` call returns a peak that is one of exactly two
// values about 0.24 dB apart, and it does so with the finisher bypassed, so it
// is upstream of the compressor. `--n` renders each condition several times and
// the WORST result is the one that counts. Two peaks from two renders must
// never be subtracted; the noise-floor measurement
// in the workshop has the numbers.

import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
let url = args[0];
if (!url || url.startsWith('--')) {
  console.error('usage: node gate-audio.mjs <url|live> [--n 3] [--json]');
  process.exit(2);
}
if (url === 'live' || url === 'prod') url = 'https://witzman.de/dub/';
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};
const N = Number(flag('n', 3));
const asJson = args.includes('--json');

// GREEN, THEN RED ON PURPOSE. A gate that is only ever run in the direction
// where it passes is a decoration — CLAUDE.md, and the parent project proved it
// twice by mutation. `--prove-red` throws the silences map away, so the
// "silent with no reason" check MUST fire on channel 4, which is empty by
// design. A run with this flag that passes is the gate failing.
const proveRed = args.includes('--prove-red');

// Thresholds. Each one is a number somebody has to be able to argue with, so
// each one says where it came from.
const CLIP_DBFS = -0.5;   // the finisher's soft-clip knee is -2.50; measured
                          // worst peak 2026-09-18 was -5.02, so -0.5 is loose
                          // by 4.5 dB and only fires on a real fault
const SILENT_DBFS = -60;  // a soloed voice below this is producing nothing
const BARS = 8;           // enough for every channel's phrase to come round

// The workshop machine has a system chromium at a fixed path; a CI runner has
// playwright's own download and no /usr/bin/chromium at all. Asking for a file
// that is not there fails with "spawn ENOENT", which reads like a broken page.
const systemChromium = process.env.CHROMIUM_PATH
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

const browser = await chromium.launch({
  executablePath: systemChromium,
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=user-gesture-required'],
});
const page = await browser.newPage();
const problems = [];
// The favicon 404 arrives BOTH as a failed request and as a console error, and
// it is the browser asking on its own — the page references no external
// resource at all. Filtering one and not the other made the first run red for
// a thing the page does not do.
// The message TEXT does not carry the URL - it is only "Failed to load
// resource: the server responded with a status of 404" - so the filter has to
// read m.location(), which does.
const ownFault = u => !/favicon\.ico/.test(u || '');
page.on('console', m => {
  if (m.type() !== 'error') return;
  const where = m.location()?.url || '';
  if (ownFault(where)) problems.push(`[console] ${m.text()}${where ? ` (${where})` : ''}`);
});
page.on('pageerror', e => problems.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => {
  // The browser asks for /favicon.ico on its own and the page references no
  // external resource at all. Counting it would make every run red for a thing
  // the page does not do.
  if (!r.url().endsWith('/favicon.ico')) {
    problems.push(`[request failed] ${r.url()} — ${r.failure()?.errorText}`);
  }
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

const failures = [];
const fail = (what) => failures.push(what);

// 1. NOTHING SOUNDS BEFORE A GESTURE.
const before = await page.evaluate(() => window.p02.state());
if (before.contextCreated) fail('an AudioContext existed before any gesture');

// The worst of N renders, because the peak is bimodal.
const worst = async (opts) => {
  const runs = [];
  for (let i = 0; i < N; i++) {
    runs.push(await page.evaluate(o => window.p02.renderOffline(o), opts));
    await page.waitForTimeout(700);
  }
  return runs.reduce((a, b) => (b.peakDb > a.peakDb ? b : a));
};

// 2. THE OUTPUT DOES NOT CLIP.
const mix = await worst({ bars: BARS, auto: true });
if (mix.peakDb > CLIP_DBFS) {
  fail(`the mix peaks at ${mix.peakDb.toFixed(2)} dBFS, over ${CLIP_DBFS}`);
}

// 3. NO CHANNEL SILENT WITHOUT A RECORDED REASON.
const rows = [];
for (const ch of [0, 1, 2, 3, 4, 5, 6, 7]) {
  const r = await worst({ bars: BARS, auto: true, solo: ch });
  // The reason travels with the render, not from the live engine: an offline
  // render builds its own engine, so asking the page's would be a different
  // claim about a different object.
  const reason = proveRed ? null : (r.silences ? r.silences[ch] : undefined);
  if (reason === undefined && !proveRed) {
    fail(`channel ${ch}: the render reported no silences map at all, so `
       + `"silent with a reason" cannot be told from "silent without one"`);
  }
  rows.push({ ch, peakDb: r.peakDb, rmsDb: r.rmsDb, reason });
  if (r.peakDb < SILENT_DBFS && !reason) {
    fail(`channel ${ch} is silent (${r.peakDb.toFixed(1)} dBFS) and nothing says why`);
  }
}

// 4. THE BED'S LOOP SEAM IS NOT A CLICK.
const seam = await page.evaluate(() => window.p02.bedSeam());
for (const c of seam.channels) {
  if (c.wrapStep >= c.maxInternalStep) {
    fail(`the bed's loop seam on channel ${c.channel} is the largest step in `
       + `the buffer (${c.wrapStep.toFixed(5)} vs ${c.maxInternalStep.toFixed(5)}) `
       + `— that is a click once a loop`);
  }
}

await browser.close();

const report = { url, renders: N, bars: BARS, mix, channels: rows, seam, failures, problems };
if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log(`${url} — ${N} renders per condition, ${BARS} bars, worst of each`);
  console.log(`  mix          peak ${mix.peakDb.toFixed(2)}  RMS ${mix.rmsDb.toFixed(2)} dBFS`);
  for (const r of rows) {
    const why = r.reason ? `  (silent: ${r.reason})` : '';
    console.log(`  ch ${r.ch}        peak ${r.peakDb.toFixed(2)}  RMS ${r.rmsDb.toFixed(2)}${why}`);
  }
  console.log(`  bed seam     ${seam.channels.map(c =>
    `${c.wrapStep.toFixed(5)} vs ${c.maxInternalStep.toFixed(5)}`).join('  ')}`);
  if (problems.length) {
    console.log('\nConsole errors and failed requests:');
    for (const p of problems) console.log(`  ${p}`);
  }
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  ${f}`);
  } else {
    console.log('\nno measurable fault. This says nothing about whether it is good.');
  }
}

const red = failures.length || problems.length;
if (proveRed) {
  if (red) {
    console.log('\nAS REQUIRED: with the silence reasons thrown away, the gate is RED.');
    process.exit(0);
  }
  console.log('\nTHE GATE DID NOT NOTICE. It cannot see a silent channel, which is '
            + 'the one fault it exists for.');
  process.exit(1);
}
process.exit(red ? 1 : 0);
