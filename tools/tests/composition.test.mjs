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
import { createHash } from 'node:crypto';
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
// pure function of (seed, bar, auto, holds), and seek stops being provable the
// moment it is. `auto` and `holds` are INPUTS the caller passes, which is why
// adding them cost the purity nothing.
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

// AUTO IS OFF UNLESS A TEST SAYS OTHERWISE, in the layer and therefore here.
// Everything from here to the end of the verbs is asking about THE SCHEDULE,
// so it passes `{ auto: true }` explicitly. A test that forgot to would be
// asking the held-still instrument whether the schedule ran, and the answer
// would be no — which is a hole this comment exists to keep shut.
const AUTO = { auto: true };
const fp = bar => L.fingerprint(L.compositionAt(SEED, L.PIECE, MOVE, bar, AUTO), SEED);

/* -- 3. THE LOOP DETECTOR ------------------------------------------------- */
group('the loop detector — the material actually differs');
const prints = [];
for (let b = 0; b < N; b++) prints.push(fp(b));
const distinct = new Set(prints).size;

// Section 0 IS deliberately frozen: it is the reference, "the piece as the
// manifest left it". So the assertion is a PAIR, and both halves matter — one
// says the reference holds, the other says the movement moves.
// Section 0 is the reference, MINUS its gestures. A one-shot echo throw is a
// hand on a send for a bar, not a change of material, so the bars it lands on
// are excluded and then the rest must be bar-for-bar identical. Excluding them
// silently would be excluding the evidence, so they are named.
const gestureBars = new Set();
for (const g of (M.gestures || [])) for (let i = 0; i < (g.what[3] || 1); i++) gestureBars.add(g.at + i);
const sec0 = new Set(prints.slice(0, 32).filter((_, b) => !gestureBars.has(b))).size;
ok(sec0 === 1, 'section 0 is the reference and holds, bar for bar',
   `${sec0} distinct fingerprint(s) across bars 1-32, excluding gesture bar(s) `
   + [...gestureBars].filter(b => b < 32).map(b => b + 1).join(', '));
ok(new Set(prints.slice(0, 32)).size === 2,
   'and the one gesture in it is the only thing that moves',
   `${new Set(prints.slice(0, 32)).size} distinct bars including the throw`);
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
group('composition state is a pure function of (seed, bar, auto, holds)');
const shuffled = [...Array(N).keys()].sort(() => 0.5 - Math.random());
let mismatch = -1;
for (const b of shuffled) if (fp(b) !== prints[b]) { mismatch = b; break; }
ok(mismatch === -1, 'asked out of order, every bar answers the same',
   mismatch === -1 ? `${N} bars, random order` : `bar ${mismatch} differed`);

// asked a second time after a long detour through other bars
for (let i = 0; i < 50; i++) fp(3000 + i);
ok(fp(200) === prints[200], 'bar 200 is unchanged by having been asked for bar 3049');

const other = L.fingerprint(L.compositionAt(SEED ^ 0x7777, L.PIECE, MOVE, 200, AUTO), SEED ^ 0x7777);
ok(other !== prints[200] || PROVE_RED, 'a different seed is a different composition');

/* -- 5. the verbs -------------------------------------------------------- */
group('the verbs');
const at = (bar, mv, opts) => L.compositionAt(SEED, L.PIECE, mv || MOVE, bar,
  opts ? { auto: true, ...opts } : AUTO);

// base state == today's page: chance 1, move 0, phrase 1 -> key 0 every bar
const bare = { phrase: 8, section: 32, bars: 256, sections: [{ at: 0, event: null, why: 'reference' }] };
const b0 = at(0, bare), b77 = at(77, bare);
ok(L.ALL_CHANNELS.every(ch => b0.chance[ch] === 1 && b0.move[ch] === 0 && b0.phrase[ch] === 8),
   'the base state is chance 1, move 0, and the MOVEMENT\'s phrase — not 1',
   `phrase ${b0.phrase[0]}`);
const bareFp = [];
for (let b = 0; b < 64; b++) bareFp.push(L.fingerprint(at(b, bare), SEED));
ok(new Set(bareFp).size === 1,
   'and with chance 1 it still reproduces today\'s page exactly — the key varies, every step fires anyway',
   `${new Set(bareFp).size} distinct bar(s) in 64`);

// THE REGRESSION TEST FOR THE BUG THAT WOULD HAVE SHIPPED A DIFFERENT FROZEN
// LOOP. The base phrase used to be 1, and `stepFires` is keyed on
// `bar % phrase`, so `chance(ch, 0.7)` ALONE produced one fixed thinned
// pattern repeated for ever — a different loop, not the end of looping, which
// is the entire increment. `chance` with no `phrase` beside it must vary.
const chanceOnly = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['chance', 3, 0.7], why: 'chance and nothing else' }] };
const co = [];
for (let b = 0; b < 32; b++) co.push(L.fingerprint(at(b, chanceOnly), SEED));
ok(new Set(co).size === 8,
   'CHANCE ALONE varies bar to bar and comes round on the movement\'s phrase',
   `${new Set(co).size} distinct bars in 32, repeating every ${co.indexOf(co[0], 1)}`);
const pinned1 = { phrase: 1, section: 32, bars: 256, sections: [
  { at: 0, event: ['chance', 3, 0.7], why: 'the bug, dialled on purpose' }] };
ok(typeof at(4, pinned1).frozen[3] === 'string',
   'and a movement that dials phrase 1 under a chance is TOLD it cannot vary',
   at(4, pinned1).frozen[3]);

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

// THE SIGN OF SPAN IS LOAD-BEARING, and this is what it is load-bearing FOR.
// In G natural minor, down one degree is F major — the flat VII, the genre's
// own move. Up one degree is A DIMINISHED.
ok(L.transposeDegrees(55, -1, 7, 0) === 53 && L.transposeDegrees(58, -1, 7, 0) === 57
   && L.transposeDegrees(62, -1, 7, 0) === 60,
   'walk -1 on the manifest\'s triad gives F major', 'G3 B♭3 D4 -> F3 A3 C4');
ok(L.transposeDegrees(55, 1, 7, 0) === 57 && L.transposeDegrees(58, 1, 7, 0) === 60
   && L.transposeDegrees(62, 1, 7, 0) === 63,
   'and walk +1 gives A diminished, which is why an unsigned span is a defect',
   'G3 B♭3 D4 -> A3 C4 E♭4');
let up = 0, down = 0;
for (let sd = 0; sd < 2000; sd++) { const w = L.walkAt(sd, { bars: 96, span: -1 }, 128); if (w > 0) up++; if (w < 0) down++; }
ok(up === 0 && down === 2000, 'a NEGATIVE span may only go below the tonic, for every seed',
   `2000 seeds: ${up} up, ${down} down`);
let up2 = 0;
for (let sd = 0; sd < 2000; sd++) if (L.walkAt(sd, { bars: 96, span: 1 }, 128) > 0) up2++;
ok(up2 > 800 && up2 < 1200, 'an UNSIGNED span still goes either way — the behaviour is not removed, it is signed',
   `2000 seeds: ${up2} up (${(up2 / 20).toFixed(1)}%)`);
let home = 0;
for (let sd = 0; sd < 2000; sd++) if (L.walkAt(sd, { bars: 96, span: -1 }, 192) === 0) home++;
ok(home === 2000, 'and at bar 192 it is home at exactly the key dialled, for every seed',
   `2000 of ${home} seeds at degree 0`);
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

// PER-CHANNEL BIND AND UNBIND, which is the point of the verb: a section event
// binds a FOURTH modulator to a channel that had none, and unbinds one, and
// the others are untouched. The old engine walked a fixed manifest array whose
// membership never changed and scaled all of it with one global knob; that
// cannot express any of this.
const perCh = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 32, event: ['mod', 5, 'level', 40, 7, 'sh'], why: 'a fourth, on a channel with none' },
  { at: 64, event: ['mod', 6, 'delay', 0, 3, 'tri'], why: 'and one of the manifest\'s three, removed' }] };
const before = at(0, perCh).mods, after = at(40, perCh).mods, later = at(100, perCh).mods;
ok(before.length === 3 && after.length === 4,
   'a section event binds a modulator to a channel that had none', `${before.length} -> ${after.length}`);
ok(after.filter(m => m.channel === 5).length === 1 && after.find(m => m.channel === 5).verb === 'level',
   'and it lands on the channel it names, at its own rate and shape',
   `ch5 level, ${after.find(m => m.channel === 5).bars} bars, ${after.find(m => m.channel === 5).shape}`);
const untouched = ['6delay', '6reverb', '3level'];
ok(untouched.every(k => after.some(m => m.channel + m.verb === k)),
   'and the other three are untouched by it');
ok(later.length === 3 && !later.some(m => m.channel === 6 && m.verb === 'delay')
   && later.some(m => m.channel === 6 && m.verb === 'reverb'),
   'unbinding one leaves the SAME CHANNEL\'S other modulator alone',
   'ch6 delay gone, ch6 reverb still bound');

// EACH MODULATOR STARTS ITS CYCLE WHEN IT IS BOUND [G]: "binding eight one
// after another spreads them around the bar and the row BREATHES rather than
// PUMPS. Worth copying deliberately." With a per-channel bind this is nearly
// free; a global list cannot produce it at all.
const spread = { phrase: 8, section: 32, bars: 256, sections: [0, 1, 2, 3].map(i => ({
  at: 32 + i * 3, event: ['mod', [1, 2, 3, 5][i], 'reverb', 50, 8, 'tri'], why: 'bound one after another' })) };
const atBind = [0, 1, 2, 3].map(i => {
  const ch = [1, 2, 3, 5][i], b = 32 + i * 3;
  return L.modValue(at(b, spread).mods.find(m => m.channel === ch && m.verb === 'reverb'), SEED, i, b);
});
ok(atBind.every(v => Math.abs(v) < 1e-9), 'every modulator reads zero on the bar it was bound',
   atBind.map(v => v.toFixed(6)).join(' '));
// The claim is about PHASE, not about value: a triangle is symmetric, so two
// modulators a quarter-cycle either side of a peak read the same number while
// being at genuinely different points of their cycle — one rising, one
// falling. Asserting on the value would have been asserting the wrong thing,
// and it is worth saying so here because it is the same class of mistake as
// reading a surface number for an engine number.
const phases = [0, 1, 2, 3].map(i => {
  const m = at(64, spread).mods.find(x => x.channel === [1, 2, 3, 5][i] && x.verb === 'reverb');
  const ph = (64 - m.boundAt) / m.bars;
  return (ph - Math.floor(ph)).toFixed(4);
});
ok(new Set(phases).size === 4,
   'and at a later bar the four are at four different points of their cycle — the row breathes, it does not pump',
   'phases ' + phases.join(' '));
const atBar64 = [0, 1, 2, 3].map(i =>
  L.modValue(at(64, spread).mods.find(x => x.channel === [1, 2, 3, 5][i] && x.verb === 'reverb'), SEED, i, 64));
ok(new Set(atBar64.map(v => v.toFixed(4))).size > 1, 'and they are not all writing the same number',
   atBar64.map(v => v.toFixed(3)).join(' '));

// AND THE TRAP UNDER IT, which this test found the hard way. Spreading is a
// consequence of the bind bars being incongruent modulo the rate — it is NOT a
// property of binding things at different times. Bind four 8-bar modulators
// eight bars apart and every one of them is at the same point of its cycle
// forever: the row pumps, exactly what "starts its cycle when it is bound" is
// supposed to prevent. A section is 32 bars, so 8, 16 and 32 are the rates
// that fall into this hole on a section boundary, and 5, 7, 11 and 13 are the
// rates that cannot. That is the coprime argument again, arriving from the
// other direction, and it is a constraint on the SCHEDULE rather than on this
// code.
const pumped = { phrase: 8, section: 32, bars: 256, sections: [0, 1, 2, 3].map(i => ({
  at: 32 + i * 8, event: ['mod', [1, 2, 3, 5][i], 'reverb', 50, 8, 'tri'], why: 'bound one RATE apart' })) };
const pumpVals = [0, 1, 2, 3].map(i => {
  const ch = [1, 2, 3, 5][i];
  return L.modValue(at(64, pumped).mods.find(m => m.channel === ch && m.verb === 'reverb'), SEED, i, 64);
});
ok(new Set(pumpVals.map(v => v.toFixed(4))).size === 1,
   'THE TRAP: four 8-bar modulators bound 8 bars apart are all at the same point of their cycle',
   `all read ${pumpVals[0].toFixed(3)} — a rate that divides the bind spacing does not spread`);

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

// the gestures, if the movement carries any
group('the phrase-level gestures');
if ((M.gestures || []).length) {
  const g = M.gestures[0];
  const [, gch, gwet, glen] = g.what;
  ok(at(g.at, M).wet[gch].delay === gwet, 'a throw lands on the bar it says',
     `bar ${g.at + 1}: ch${gch} delay ${gwet}`);
  ok(at(g.at + glen, M).wet[gch].delay !== gwet, 'and is gone after its own length',
     `bar ${g.at + glen + 1}: ch${gch} delay ${at(g.at + glen, M).wet[gch].delay}`);
  ok(M.gestures.every(x => at(x.at, M).gesture && at(x.at, M).gesture.at === x.at),
     `all ${M.gestures.length} gestures are live on their own bar`,
     M.gestures.map(x => x.at + 1).join(', '));
  const gaps = M.gestures.slice(1).map((x, i) => x.at - M.gestures[i].at);
  ok(new Set(gaps).size > 1, 'and they are unevenly spaced — eight events evenly spaced is itself a metronome',
     `gaps ${gaps.join(', ')} bars`);
} else ok(true, 'this movement carries no gestures');

// wet
const wt = { phrase: 8, section: 32, bars: 256, sections: [{ at: 32, event: ['wet', 6, 'delay', 0.55], why: 'x' }] };
ok(at(0, wt).wet[6].delay === 0, 'the echo send starts where the manifest put it');
ok(at(40, wt).wet[6].delay === 0.55, 'and `wet` moves the base the modulator sweeps around');

// the seed comes off the query, never the path
group('the seed');
ok(L.seedFromQuery('?seed=4242') === 4242, 'a numeric seed');
ok(L.seedFromQuery('?a=1&seed=dubby') === L.seedFromQuery('?seed=dubby'), 'a word is a seed too, and it is stable');
ok(L.seedFromQuery('') === L.seedFromQuery('?nothing=1'), 'and with no seed there is one default set');

/* -- 5b. THE SWITCH: with `auto` off the arrangement holds still ----------
   Owner decision, 2026-09-18: "no 'autoplay' ring of changes, endless,
   controllable by me", refined the same hour to "reachable is main goal, but
   it could also evolve on itself". The instrument may evolve; it may not
   evolve somewhere the hand cannot reach. So the ring is a switch, off by
   default, and THIS GROUP IS THE OWNER'S DECISION MADE CHECKABLE.

   Every call in this group deliberately omits `opts`, because the default is
   the claim: a caller that says nothing gets the instrument that does not
   move on its own.
   ------------------------------------------------------------------------ */
group('the ring is a switch, and it is OFF by default');

const OFF_BARS = [0, 33, 129, 224, 3583];
const base = L.baseComposition(L.PIECE, M.phrase);
for (const b of OFF_BARS) {
  const c = L.compositionAt(SEED, L.PIECE, M, b);
  const sameAsBase = L.ALL_CHANNELS.every(ch =>
    c.chance[ch] === base.chance[ch] &&
    c.move[ch] === base.move[ch] &&
    c.phrase[ch] === base.phrase[ch] &&
    c.present[ch] === 1 &&
    c.wet[ch].delay === base.wet[ch].delay &&
    c.wet[ch].reverb === base.wet[ch].reverb);
  ok(sameAsBase && c.walk === 0 && c.walkCfg.bars === 0 && c.gesture === null
     && c.mods.length === L.PIECE.mods.length && c.auto === false,
     `bar ${b + 1} with auto off is the BASE STATE, and nothing else`,
     `chance ${c.chance[6]} · move ${c.move[0]} · phrase ${c.phrase[3]} · walk ${c.walk}`
     + ` · ${c.mods.length} modulators · wet6 ${c.wet[6].delay}`);
}

// The four things the schedule WOULD have done by those bars, named one at a
// time — because "it equals the base" passes just as well if the base itself
// quietly moved. These are the events, checked at bars past where each fires.
const offAt = b => L.compositionAt(SEED, L.PIECE, M, b);
ok(offAt(40).chance[6] === 1, 'the chance event at bar 33 did not land', 'ch6 chance still 1');
ok(offAt(70).wet[6].delay === L.PIECE.wets[6].delay / 100,
   'the echo did not open at bar 65', `ch6 delay still ${offAt(70).wet[6].delay}`);
ok(offAt(160).walk === 0, 'the walk bound at bar 129 is not running', 'walk 0 degrees');
ok(offAt(24).gesture === null && offAt(24).wet[2].delay === L.PIECE.wets[2].delay / 100,
   'and the one-shot throw at bar 25 did not fire either — a gesture is part of the SCHEDULE',
   `ch2 delay ${offAt(24).wet[2].delay}, not 0.9`);

// The modulators are the TEXTURE, not the autoplay. Owner, the same hour:
// the continuous per-channel modulators keep breathing by default. So the
// manifest's three must survive the switch being off, at their own rates,
// while the two the SCHEDULE binds at bar 0 must not.
const offMods = offAt(129).mods;
ok(offMods.length === 3 && offMods.every((m, i) => m.channel === L.PIECE.mods[i].channel
     && m.verb === L.PIECE.mods[i].verb && m.bars === L.MOD_RATES[L.PIECE.mods[i].rate]),
   'the manifest\'s three modulators keep breathing with the ring off',
   offMods.map(m => m.channel + ':' + m.verb + '/' + m.bars + 'b').join(' '));
ok(!offMods.some(m => m.channel === 7 && m.verb === 'reverb'),
   'and the two the SCHEDULE binds at bar 0 are not there — those are the ring');

// THE OWNER'S DECISION, AS ONE NUMBER. "If the page changes its own
// arrangement with auto off, this issue has failed." The fingerprint is what
// fires; one distinct value across the whole movement is the arrangement
// holding still. The modulators are not in this count's way: they are
// continuous, read from the absolute bar by the engine, and the two bound by
// the schedule are gone, so the `m:` field cannot move either.
const offPrints = [];
for (let b = 0; b < N; b++) offPrints.push(L.fingerprint(offAt(b), SEED));
ok(new Set(offPrints).size === 1, 'THE ARRANGEMENT HOLDS STILL: one distinct bar in ' + N + ' with auto off',
   `${new Set(offPrints).size} distinct fingerprint(s)`);
ok(L.fingerprint(offAt(3583), SEED) === offPrints[0],
   'and bar 3584 — the far end of a two-hour set — is still the same bar');

// AUTO ON IS EXACTLY WHAT SHIPPED, and "exactly" is a digest and not an
// adjective. This is the 256 fingerprints of the movement as they stood on
// main at 0ea718c, 2026-09-18, measured before the switch was written.
// A DELIBERATE SCHEDULE CHANGE MUST MOVE THIS NUMBER — that is the point of
// pinning it. What it refuses is the switch changing the schedule's behaviour
// by accident.
const SHIPPED_DIGEST = 'a98594eccdd9a736';
const shippedNow = createHash('sha256').update(prints.join('\n')).digest('hex').slice(0, 16);
ok(PROVE_RED || shippedNow === SHIPPED_DIGEST,
   'with auto ON the movement is bar-for-bar the schedule that shipped at 0ea718c',
   `${prints.length} bars, digest ${shippedNow} against ${SHIPPED_DIGEST}`);
ok(PROVE_RED || new Set(prints).size === 79,
   'and its distinct-bar count is the measured one', `${new Set(prints).size} distinct bars in ${N}`);

/* -- 5c. THE HAND OUTRANKS THE SCHEDULE ----------------------------------
   The load-bearing half. "Every value the owner has set stays set." A hold is
   an INPUT to the pure function — the caller owns the object, the layer only
   reads it — so a hold is as replayable from a seek as everything else here.
   ------------------------------------------------------------------------ */
group('the hand outranks the schedule');

// Against THE REAL MOVEMENT, not against `MOVE`: under --prove-red `MOVE` is
// the frozen loop pinned back on, and this group is asking about the hand
// rather than about the loop detector. A group that went red for somebody
// else's reason would be noise in the one run that is supposed to be red.
const ran = bar => L.compositionAt(SEED, L.PIECE, M, bar, { auto: true });
const held = h => bar => L.compositionAt(SEED, L.PIECE, M, bar, { auto: true, holds: h });

// The event: chance(6, 0.75) at bar 32, which lands at bar 35 because the
// stab is on a 5-bar phrase and structure lands on the channel's own wrap.
// That bar is the acceptance test: the hold has to survive the event AT THE
// BAR THE EVENT FIRES, not merely somewhere after it.
ok(ran(35).chance[6] === 0.75, 'first, unheld: the scheduled event does land at bar 36', 'ch6 chance 0.75');
const handChance = held({ chance: { 6: 0.4 } });
ok(handChance(35).chance[6] === 0.4,
   'AT THE BAR THE EVENT FIRES, the held value wins', `bar 36: ch6 chance ${handChance(35).chance[6]}, not 0.75`);
ok([34, 36, 100, 255, 3583].every(b => handChance(b).chance[6] === 0.4),
   'and it stays held on both sides of it, and at the far end of the set',
   'bars 35, 37, 101, 256, 3584');
ok(handChance(35).held.chance[6] === true && handChance(35).held.chance[3] === false,
   'the state says WHICH of the two owns the value — held by you, or running');

// the sends, which the schedule moves at bar 64 and a gesture flicks at 216
const handWet = held({ delay: { 6: 0.12 } });
ok(ran(70).wet[6].delay === 0.55 && handWet(70).wet[6].delay === 0.12,
   'a held SEND survives the arrangement opening the echo under it',
   `unheld 0.55 · held ${handWet(70).wet[6].delay}`);
ok(handWet(216).wet[6].delay === 0.12 && ran(216).wet[6].delay === 0.95,
   'and it survives a one-shot THROW, which is the schedule\'s fastest move',
   `bar 217: unheld ${ran(216).wet[6].delay} · held ${handWet(216).wet[6].delay}`);
ok(handWet(216).gesture.heldBack === true,
   'and the throw says it was held back rather than reading as if it happened',
   'a control that does nothing must look dead');

// A HELD VALUE FREEZES THAT ONE VALUE, NOT THE SCHEDULE. The mirror of the
// switch: with auto on, nothing may quietly stop evolving.
ok(handChance(160).walk === -1 && handChance(160).mods.length === 5,
   'the rest of the movement keeps running under a held value',
   `bar 161: walk ${handChance(160).walk} degrees, ${handChance(160).mods.length} modulators`);
const heldPrints = [];
for (let b = 0; b < N; b++) heldPrints.push(L.fingerprint(handChance(b), SEED));
const ranPrints = [];
for (let b = 0; b < N; b++) ranPrints.push(L.fingerprint(ran(b), SEED));
const movedBy = heldPrints.filter((x, b) => x !== ranPrints[b]).length;
ok(new Set(heldPrints).size >= 64 && movedBy > 0,
   'and the movement is still not one loop with a hand on one channel',
   `${new Set(heldPrints).size} distinct bars in ${N}, of which ${movedBy} differ from the unheld run`);

// RELEASE. There is nothing to un-wind: the fold is asked again from the base
// every bar, so dropping the key from the object IS the release, and it lands
// on the next bar the caller asks for.
ok(handChance(40).chance[6] === 0.4 && ran(41).chance[6] === 0.75,
   'RELEASING puts the channel back under the schedule at the next bar',
   'bar 41 held at 0.40 · bar 42, released, back to the schedule\'s 0.75');
ok(held({})(35).chance[6] === 0.75 && held({ chance: {} })(35).chance[6] === 0.75,
   'an empty holds object holds nothing — release is the absence of a key, not a flag');

// HOLDS ARE AN INPUT, NOT STATE THE LAYER ACCUMULATES. Ask 300 bars with a
// hand on it and then ask without one: the layer must not have kept anything.
for (let b = 0; b < 300; b++) handChance(b);
ok(ran(35).chance[6] === 0.75 && L.compositionAt(SEED, L.PIECE, M, 35).chance[6] === 1,
   'the layer keeps nothing: the same bar asked again, without holds, is the schedule\'s again');

// THE HAND IS THE WHOLE INSTRUMENT WITH THE RING OFF. Held is not frozen:
// this is the case the owner actually plays.
const offHand = L.compositionAt(SEED, L.PIECE, M, 8, { holds: { chance: { 3: 0.7 } } });
ok(offHand.chance[3] === 0.7 && offHand.chance[6] === 1 && offHand.walk === 0,
   'with auto OFF a held value is the only thing that moves', 'ch3 chance 0.7, everything else base');
const offHandPrints = [];
for (let b = 0; b < 32; b++)
  offHandPrints.push(L.fingerprint(L.compositionAt(SEED, L.PIECE, M, b, { holds: { chance: { 3: 0.7 } } }), SEED));
ok(new Set(offHandPrints).size === 8,
   'and it VARIES — the hats thin and come round on the movement\'s phrase, with no schedule at all',
   `${new Set(offHandPrints).size} distinct bars in 32`);

// a held phrase changes the channel's own cycle, with nothing else running
const offPhrase = b => L.compositionAt(SEED, L.PIECE, M, b, { holds: { phrase: { 6: 3 } } });
ok([0, 1, 2, 3, 4, 5].map(b => offPhrase(b).key[6]).join(',') === '0,1,2,0,1,2',
   'a held PHRASE is the channel\'s own cycle, auto off', '0,1,2,0,1,2');

// THE HAND GOES THROUGH THE SAME CLAMPS THE VERBS DO. A surface is a claim;
// this is the layer refusing to take its word for it.
const wild = L.compositionAt(SEED, L.PIECE, M, 8,
  { holds: { phrase: { 6: 12 }, chance: { 6: 5 }, delay: { 6: 9 }, move: { 6: -1 } } });
ok(wild.phrase[6] === 8 && wild.chance[6] === 1 && wild.wet[6].delay === 2 && wild.move[6] === 0,
   'a held value out of range is clamped exactly as the verb clamps it',
   `phrase ${wild.phrase[6]} · chance ${wild.chance[6]} · delay ${wild.wet[6].delay} · move ${wild.move[6]}`);
ok(L.compositionAt(SEED, L.PIECE, M, 8, { holds: { move: { 0: L.LOCK } } }).move[0] === L.LOCK,
   'and LOCK is a word the hand may hold, not a number it may not');

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
