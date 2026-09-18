// The composition layer, tested with no browser and no audio device.
//
//   node tools/tests/composition.test.mjs
//
// WHY THIS FILE EXISTS, AND WHAT IT IS FOR
// ----------------------------------------------------------------------------
// A green suite can sit over a hole. The hole here is named and specific: on
// 2026-09-18 the deployed page played 1.92 seconds of notes forever, and every
// check that existed passed — because they all asked whether the page loads and
// whether it serves under /dub/, and a frozen loop loads perfectly.
//
// So this suite asks the one question those could not: DOES THE MATERIAL
// ACTUALLY DIFFER FROM BAR TO BAR. It reads the firings, not the audio, because
// audio carries humanisation and envelope jitter that differ bar to bar even
// when the material does not — a mix-level check would report "different" on a
// frozen loop and prove nothing at all.
//
// Proof that it catches it is in `--prove-red`: that flag pins every channel to
// chance 1 and move LOCK, which IS the frozen loop, and the suite must fail.
// Run it in both directions or the suite is a decoration.
//
// It works by extracting the region of public/dub/index.html between the two
// sentinel comments and evaluating it. That region is pure by construction: no
// DOM, no AudioContext, no clock. If the sentinels move, or if something
// impure is added inside them, this file says so rather than silently testing
// nothing.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE = join(ROOT, 'public', 'dub', 'index.html');
const PROVE_RED = process.argv.includes('--prove-red');

let failures = 0, checks = 0;
const ok = (cond, what, detail) => {
  checks++;
  if (cond) { console.log(`  ok    ${what}${detail ? ' — ' + detail : ''}`); return true; }
  failures++; console.log(`  FAIL  ${what}${detail ? ' — ' + detail : ''}`); return false;
};
const group = t => console.log('\n' + t);

/* -- 1. the region ------------------------------------------------------- */
group('the pure region');
const html = readFileSync(PAGE, 'utf8');
const START = '/* ==== COMPOSITION LAYER START ==== */';
const END = '/* ==== COMPOSITION LAYER END ==== */';
ok(html.split(START).length === 2, 'exactly one START sentinel');
ok(html.split(END).length === 2, 'exactly one END sentinel');
const region = html.slice(html.indexOf(START) + START.length, html.indexOf(END));
ok(region.length > 5000, 'the region is not empty', `${region.length} bytes`);

// Purity is the property the whole design hangs off, so it is checked rather
// than trusted. A line that reaches for the DOM, the audio context or the
// clock inside this region is a composition layer that has stopped being a
// pure function of (seed, bar), and seek stops being provable the moment it is.
const impure = [
  [/\bdocument\b/, 'document'],
  [/\bwindow\b/, 'window'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bctx\b/, 'an audio context'],
  [/\bOfflineAudioContext\b/, 'OfflineAudioContext'],
  [/\bDate\.now\b/, 'Date.now'],
  [/\bperformance\.now\b/, 'performance.now'],
  [/\bMath\.random\b/, 'Math.random'],
];
for (const [re, name] of impure) {
  const lines = region.split('\n').filter(l => re.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
  ok(lines.length === 0, `no ${name} in the composition layer`, lines[0] ? lines[0].trim().slice(0, 80) : '');
}

/* -- 2. evaluate it ------------------------------------------------------ */
const exported = [
  'PIECE', 'MOVEMENT', 'MOD_RATES', 'MOD_RATE_BARS', 'MOD_SHAPES', 'LOCK', 'OFFGRID',
  'ALL_CHANNELS', 'TONAL', 'DRUM_PAT', 'INPUT_GAIN', 'MASTER_TRIM',
  'compositionAt', 'scheduleStateAt', 'baseComposition', 'fingerprint', 'stepFires',
  'walkAt', 'transposeDegrees', 'degreeOf', 'fromDegree', 'shapeAt', 'modValue',
  'seedFromQuery', 'rand01', 'hash4', 'euclid', 'rotated', 'modBars', 'clamp',
];
const L = new Function(`${region}\n; return { ${exported.join(', ')} };`)();
ok(typeof L.compositionAt === 'function', 'the region evaluates and exports the layer');

const SEED = 0x11CE9E;
const M = L.MOVEMENT;
const N = M.bars;

// --prove-red: the frozen loop, put back on purpose. Every channel pinned to
// chance 1 and move LOCK is exactly what the page played on 2026-09-18.
const MOVE = PROVE_RED
  ? { ...M, sections: [{ at: 0, event: null, why: 'the frozen loop, on purpose' },
      ...L.ALL_CHANNELS.flatMap(ch => ([
        { at: 0, event: ['chance', ch, 1], why: 'pinned' },
        { at: 0, event: ['move', ch, L.LOCK], why: 'pinned' }]))] }
  : M;
if (PROVE_RED) console.log('\n*** --prove-red: chance pinned to 1, move pinned to LOCK. This suite MUST fail. ***');

const fp = bar => L.fingerprint(L.compositionAt(SEED, L.PIECE, MOVE, bar), SEED);

/* -- 3. THE LOOP DETECTOR ------------------------------------------------- */
group('the loop detector — the material actually differs');
const prints = [];
for (let b = 0; b < N; b++) prints.push(fp(b));
const distinct = new Set(prints).size;

// Section 0 IS deliberately frozen: it is the reference, "the piece as the
// manifest left it". So the assertion is a PAIR, and both halves matter — one
// says the reference holds, the other says the movement moves.
const sec0 = new Set(prints.slice(0, 32)).size;
ok(sec0 === 1, 'section 0 is the reference and holds, bar for bar',
   `${sec0} distinct fingerprint(s) across bars 1-32`);
ok(distinct >= 64, 'the movement is not one loop',
   `${distinct} distinct bars in ${N}`);

// The strongest form of the same question: how long does the material stand
// still? A frozen loop has a run of 256.
//
// THE BOUND IS DERIVED, NOT GUESSED, and the first version of it was wrong in
// a way worth leaving written down. I predicted 32 — the reference section —
// and measured 34. The two extra bars are not a defect, they are the rule:
// STRUCTURE LANDS ON THE CHANNEL'S OWN WRAP, so the chance event at bar 32
// reaches a channel that has just been given a 3-bar phrase at bar 33 (the
// next multiple of 3), not at bar 32. The longest phrase this vocabulary
// allows is 5 bars, so the worst lag is 4 bars, and the honest bound is the
// reference section plus one phrase.
const MAX_PHRASE = 5;
let run = 1, worstRun = 1, worstAt = 0;
for (let b = 1; b < N; b++) {
  if (prints[b] === prints[b - 1]) { run++; if (run > worstRun) { worstRun = run; worstAt = b - run + 1; } }
  else run = 1;
}
ok(worstRun <= M.section + MAX_PHRASE, 'no stretch of identical bars longer than the reference section plus one phrase',
   `longest run ${worstRun} bars, from bar ${worstAt + 1}, against a bound of ${M.section + MAX_PHRASE}`);

// And the same question asked of the last 32 bars alone, because a movement
// that only moves at the start is the failure mode "complete in bar 1".
const tail = new Set(prints.slice(N - 32)).size;
ok(tail > 1, 'the last section is still moving', `${tail} distinct bars in the last 32`);

/* -- 4. purity, which is what makes seek possible ------------------------ */
group('composition state is a pure function of (seed, bar)');
const shuffled = [...Array(N).keys()].sort(() => 0.5 - Math.random());
let mismatch = -1;
for (const b of shuffled) if (fp(b) !== prints[b]) { mismatch = b; break; }
ok(mismatch === -1, 'asked out of order, every bar answers the same',
   mismatch === -1 ? `${N} bars, random order` : `bar ${mismatch} differed`);

// asked a second time after a long detour through other bars
for (let i = 0; i < 50; i++) fp(3000 + i);
ok(fp(200) === prints[200], 'bar 200 is unchanged by having been asked for bar 3049');

const other = L.fingerprint(L.compositionAt(SEED ^ 0x7777, L.PIECE, MOVE, 200), SEED ^ 0x7777);
ok(other !== prints[200] || PROVE_RED, 'a different seed is a different composition');

/* -- 5. the verbs -------------------------------------------------------- */
group('the verbs');
const at = (bar, mv) => L.compositionAt(SEED, L.PIECE, mv || MOVE, bar);

// base state == today's page: chance 1, move 0, phrase 1 -> key 0 every bar
const bare = { phrase: 8, section: 32, bars: 256, sections: [{ at: 0, event: null, why: 'reference' }] };
const b0 = at(0, bare), b77 = at(77, bare);
ok(L.ALL_CHANNELS.every(ch => b0.chance[ch] === 1 && b0.move[ch] === 0 && b0.phrase[ch] === 1),
   'the base state is chance 1, move 0, phrase 1 — today\'s page');
ok(L.ALL_CHANNELS.every(ch => b77.key[ch] === 0), 'and every bar of it resolves to key 0 (the frozen loop, reproduced)');

// STRUCTURE LANDS ON THE BAR: a chance event at bar 32 must NOT reach a
// phrase-3 channel until bar 33, which is that channel's own next wrap.
const wrapMv = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['phrase', 6, 3], why: 'a 3-bar phrase' },
  { at: 32, event: ['chance', 6, 0.5], why: 'and a chance change on a bar it does not wrap' }] };
ok(at(31, wrapMv).chance[6] === 1, 'bar 32: the chance event has not landed yet');
ok(at(32, wrapMv).chance[6] === 1, 'bar 33: still not — 32 is not a multiple of 3, so the channel has not wrapped');
ok(at(33, wrapMv).chance[6] === 0.5, 'bar 34: it lands on the channel\'s OWN wrap, not on the section boundary');

// phrase: the key is periodic in the phrase length
const p3 = { phrase: 8, section: 32, bars: 256, sections: [{ at: 0, event: ['phrase', 6, 3], why: 'x' }] };
const keys = [];
for (let b = 0; b < 12; b++) keys.push(at(b, p3).key[6]);
ok(keys.join(',') === '0,1,2,0,1,2,0,1,2,0,1,2', 'a 3-bar phrase comes round every 3 bars', keys.join(','));

// and lengths that disagree come round at their lcm
const p34 = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['phrase', 6, 3], why: 'x' }, { at: 0, event: ['phrase', 3, 4], why: 'x' }] };
const pairs = [];
for (let b = 0; b < 24; b++) pairs.push(at(b, p34).key[6] + '/' + at(b, p34).key[3]);
const firstRepeat = pairs.indexOf(pairs[0], 1);
ok(firstRepeat === 12, '3 against 4 comes round every 12 bars', `first repeat at bar ${firstRepeat + 1}`);

// move: LOCK holds bar to bar; a probability is a probability
const lk = { phrase: 8, section: 32, bars: 256, sections: [{ at: 0, event: ['move', 0, L.LOCK], why: 'x' }] };
ok([0, 1, 5, 99, 255].every(b => at(b, lk).key[0] === 0), 'move LOCK is key 0 forever — the same bar, bit for bit');
const mv5 = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['phrase', 0, 4], why: 'x' }, { at: 0, event: ['move', 0, 0.5], why: 'x' }] };
let off = 0;
for (let b = 0; b < 400; b++) if (at(b, mv5).key[0] >= L.OFFGRID) off++;
ok(off > 140 && off < 260, 'move 0.5 steps off the phrase grid about half the time',
   `${off} of 400 bars off-grid`);

// walk: scale degrees, reflecting, and an exact return
group('the chord walker');
ok(L.transposeDegrees(55, 0, 7, 0) === 55, 'a walk at zero returns EXACTLY the key dialled, not near it');
ok([31, 41, 43, 46, 50, 55, 58, 62].every(m => L.transposeDegrees(m, 0, 7, 0) === m),
   'and that holds for every note in the piece');
ok(L.transposeDegrees(55, 1, 7, 0) === 57 && L.transposeDegrees(55, 2, 7, 0) === 58,
   'it steps by DEGREES of G natural minor, not semitones', 'G3 +1 = A3 (57), +2 = B♭3 (58)');
ok(L.transposeDegrees(55, 7, 7, 0) === 67, 'seven degrees is an octave in a seven-note scale');
let outside = 0, seen = new Set();
for (let b = 0; b < 4000; b++) { const w = L.walkAt(SEED, { bars: 4, span: 2 }, b); seen.add(w); if (Math.abs(w) > 2) outside++; }
ok(outside === 0, 'the walk reflects at the edge of its span rather than leaving it', `span 2, 4000 bars`);
ok(seen.size > 1 && seen.has(0), 'and it moves, and it comes home to zero', `positions seen: ${[...seen].sort((a, b) => a - b).join(' ')}`);

// mod: rates are BARS, depth 0 unbinds, shapes are the four
group('the modulators');
ok(L.MOD_RATE_BARS.includes(5) && L.MOD_RATE_BARS.includes(7) && L.MOD_RATE_BARS.includes(11)
   && L.MOD_RATE_BARS.includes(13) && L.MOD_RATE_BARS.includes(32) && L.MOD_RATE_BARS.includes(64),
   'the rates 5, 7, 11, 13, 32 and 64 exist');
ok(L.MOD_RATES.join(',') === '16,8,6,4,3,2,1,0.75,0.5',
   'and the manifest\'s nine are unmoved, because PIECE.mods.rate indexes them');
let threw = false; try { L.modBars(9); } catch { threw = true; }
ok(threw, 'a rate that is not a rate is refused rather than rounded to something plausible');
ok(L.modBars(5) === 5, 'and 5 means five BARS, not index 5 (which would be 2 bars)');

const bound = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['mod', 7, 'reverb', 30, 5, 'tri'], why: 'x' },
  { at: 64, event: ['mod', 7, 'reverb', 0, 5, 'tri'], why: 'centre is off' }] };
ok(at(10, bound).mods.filter(m => m.channel === 7 && m.verb === 'reverb').length === 1, 'mod binds');
ok(at(100, bound).mods.filter(m => m.channel === 7 && m.verb === 'reverb').length === 0,
   'DEPTH 0 REMOVES the modulator rather than leaving a dormant one behind');
ok(at(10, bound).mods.find(m => m.channel === 7 && m.verb === 'reverb').boundAt === 0
   && at(10, bound).mods.find(m => m.channel === 6 && m.verb === 'delay').bars === 3,
   'the manifest\'s own modulators survive, at their own rates', '[M] ch6 delay = 3 bars');

// each shape is a different shape, and s+h holds
const shp = s => [0, .1, .3, .6, .9].map(p => L.shapeAt(s, p, SEED, 0).toFixed(3)).join(' ');
ok(new Set(['tri', 'ramp', 'square', 'sh'].map(shp)).size === 4, 'the four shapes are four different shapes');
ok(L.shapeAt('sh', 3.1, SEED, 0) === L.shapeAt('sh', 3.9, SEED, 0)
   && L.shapeAt('sh', 3.1, SEED, 0) !== L.shapeAt('sh', 4.1, SEED, 0),
   'sample-and-hold jumps to a new value each cycle and HOLDS it');

// five coprime rates do not co-peak inside a two-hour set
const rates = [3, 5, 7, 11, 13];
const mods = rates.map((r, i) => ({ channel: 7, verb: 'reverb', depth: 100, bars: r, shape: 'tri', phase0: 0, boundAt: 0 }));
let coPeak = 0;
for (let b = 0; b < 3584; b++) if (mods.every((m, i) => L.modValue(m, SEED, i, b) > 0.99)) coPeak++;
ok(coPeak <= 1, 'five modulators on {3,5,7,11,13} bars never co-peak inside a 3584-bar set',
   `${coPeak} co-peak bar(s) — bar 0 is the one they all start on`);

// enter / leave, and silence that explains itself
group('enter, leave, and silence that says why');
const lv = { phrase: 8, section: 32, bars: 256, sections: [{ at: 64, event: ['leave', 7, 32], why: 'x' }] };
ok(at(63, lv).present[7] === 1, 'before the event the voice is fully present');
ok(at(80, lv).present[7] > 0 && at(80, lv).present[7] < 1,
   'it goes over the SECTION\'S OWN LENGTH, not on one bar', `presence ${at(80, lv).present[7].toFixed(3)} at bar 81`);
ok(at(96, lv).present[7] === 0, 'and it is gone at the end of the section');
ok(typeof at(96, lv).silent[7] === 'string' && at(96, lv).silent[7].includes('65'),
   'and the channel SAYS WHY it is silent', at(96, lv).silent[7]);
ok(typeof at(0, lv).silent[4] === 'string', 'channel 4 says why it has never made a sound', at(0, lv).silent[4]);
const ch0 = { phrase: 8, section: 32, bars: 256, sections: [{ at: 0, event: ['chance', 2, 0], why: 'x' }] };
ok(typeof at(8, ch0).silent[2] === 'string', 'a channel at chance 0 says so too', at(8, ch0).silent[2]);

// wet
const wt = { phrase: 8, section: 32, bars: 256, sections: [{ at: 32, event: ['wet', 6, 'delay', 0.55], why: 'x' }] };
ok(at(0, wt).wet[6].delay === 0, 'the echo send starts where the manifest put it');
ok(at(40, wt).wet[6].delay === 0.55, 'and `wet` moves the base the modulator sweeps around');

// the seed comes off the query, never the path
group('the seed');
ok(L.seedFromQuery('?seed=4242') === 4242, 'a numeric seed');
ok(L.seedFromQuery('?a=1&seed=dubby') === L.seedFromQuery('?seed=dubby'), 'a word is a seed too, and it is stable');
ok(L.seedFromQuery('') === L.seedFromQuery('?nothing=1'), 'and with no seed there is one default set');

/* -- 6. the grid did not move -------------------------------------------- */
group('the manifest is untouched');
ok(L.DRUM_PAT[0].join('') === '1000100010001000', 'the kick is still four on the floor');
ok(L.DRUM_PAT[1].join('') === '0000100000000000', 'the rimshot is still on beat 2');
ok(L.DRUM_PAT[2].join('') === '0000000000001000', 'the clap is still on beat 4');
ok(L.DRUM_PAT[3].join('') === '1010101010101010', 'the hats are still eighths');
ok(L.PIECE.levels[0] === 0.77 && L.MASTER_TRIM === 0.95, 'the faders and the master trim are where they were');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (PROVE_RED) {
  if (failures > 0) { console.log('\nAS REQUIRED: with the loop pinned back on, the suite is RED.'); process.exit(0); }
  console.log('\n*** THE SUITE DID NOT NOTICE THE FROZEN LOOP. It is a decoration. ***'); process.exit(1);
}
process.exit(failures ? 1 : 0);
