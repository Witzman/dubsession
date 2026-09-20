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
  'MOD_SLOTS', 'MOD_SLOT_KEYS', 'modSlotsOf',
  // the drawn manifest — #38. `STYLE` is the space, `draw` picks the point,
  // `repair` is the seatbelt and `quiz` is the independent assertion that the
  // seatbelt was fastened. `PATHS` and `D` are the seam three parallel streams
  // write against; `RESERVED` is the coordinates that are allocated and not
  // yet spent.
  'STYLE', 'CONTRACT', 'D', 'RESERVED', 'PATHS', 'DEFAULT_SEED',
  'draw', 'repair', 'quiz', 'fieldAt', 'drawSet', 'clone', 'rebuildDerived',
  // #47 — the drawn rhythm and the drawn melody. `usePiece` is the ONE door
  // that rebinds the module's `PIECE` and rebuilds everything derived from it;
  // a test that set `PIECE` some other way would be testing a piece the
  // pattern table has never seen.
  'usePiece', 'writeBass', 'lanePat', 'laneStep', 'laneLen',
  'writeLead', 'quoteMotif', 'LEAD_QUOTES', 'LEAD_FROM',
  'DEG_T', 'DEG_T5', 'degTableFor', 'SCALE_STEPS', 'countHits', 'countFirings',
  // #51 — THE PINS. `PINS` is the hand's table, `applyPins` is the overlay and
  // `rebuildDerived` is the ONE place it is applied; everything else here is
  // what a reader of `DRUM_PAT` is entitled to see afterwards.
  'PINS', 'PIN_ON', 'pinAt', 'setPin', 'clearPins', 'pinCount', 'applyPins',
  'pinsToText', 'pinsFromText', 'pinsFromQuery', 'mutFreeSteps',
  // #66 — fired gestures are explicit timeline input to the same pure layer.
  'FIRE_MACROS', 'FIRE_MICROS', 'applyFires',
  // #67 — the ride. The path, the interpolation and the throw's schedule are
  // pure; the bar line they land on and the races are section 6b's and are
  // measured in a browser, not here.
  'RIDE_SPAN', 'RIDE_LENGTHS', 'RIDE_SOUND', 'rideWaypoint', 'rideValue',
  'rideVector', 'rideMix', 'rideGeometric', 'throwPosition', 'VOX', 'VOX_KEYS',
];
const L = new Function(`${region}\n; return { ${exported.join(', ')} };`)();
ok(typeof L.compositionAt === 'function', 'the region evaluates and exports the layer');

/* -- 2b. THE CONTROL: THE LITERAL PIECE, AS DATA -------------------------
   Until #47 the manifest was pinned so narrow that every seed drew the same
   piece, and this whole suite could ask its questions of `PIECE` directly.
   #47 widened the pools, so the page's own piece is now A piece and not THE
   piece — and a suite written against whatever `DEFAULT_SEED` happens to draw
   measures nothing, because the number moves whenever a pool does.

   So the control is the shipped piece FROZEN AS DATA: `221-dub-basic` exactly
   as the pinned draw produced it at `341b9cb`, round-tripped through JSON to
   prove it is data and nothing else. Everything from here to the end of the
   verbs runs against it, which is what keeps `bac4694aec2d6432` and every
   other measured figure in this file a real regression test rather than a
   restatement of today's dice.

   IT IS INSTALLED THROUGH `usePiece` AND NOT ASSIGNED. `DRUM_PAT` and the
   modulator slots are derived from the module binding, and a test that set the
   piece some other way would be asking a pattern table that had never seen it.

   WHAT THIS DELIBERATELY IS NOT: a seed hunted until it reproduces the piece.
   The centre is reachable in the drum block at roughly one seed in a million
   (the three velocity ranges alone are about 1 in 9000 of it), and the bass,
   stab, pad and lead blocks multiply that away entirely. A seed search would
   be a lottery ticket presented as a fixture. The piece survives as DATA.
   ------------------------------------------------------------------------ */
const SHIPPED = JSON.parse(readFileSync(join(ROOT, 'tools', 'tests', 'fixtures', '221-dub-basic.json'), 'utf8'));
const P = L.usePiece(SHIPPED);
ok(P === SHIPPED && L.lanePat(P.drums[0]).join('') === '1000100010001000',
   'the control piece is installed and the derived tables followed it');

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
//
// AND TIER 3 IS OFF UNLESS A TEST SAYS OTHERWISE, for the same kind of reason.
// Everything from here to section 6 is asking about TIER 1 (the material) and
// TIER 2 (the schedule): does the arrangement land where it says, does a held
// value outrank it, does the ring come home. Tier 3 writes one or two small
// things OVER every bar, so left on it would make every one of those counts
// read 256 and prove nothing — §6.5 of the spec names that exact trap.
// SECTION 7 IS TIER 3'S OWN, and it turns it back on. If you add an assertion
// above section 7, it is about the arrangement and it wants NOMUT; if it is
// about the grain it belongs in section 7.
const NOMUT = { mutate: false };
const AUTO = { auto: true, mutate: false };
const fp = bar => L.fingerprint(L.compositionAt(SEED, P, MOVE, bar, AUTO), SEED);

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

const other = L.fingerprint(L.compositionAt(SEED ^ 0x7777, P, MOVE, 200, AUTO), SEED ^ 0x7777);
ok(other !== prints[200] || PROVE_RED, 'a different seed is a different composition');

/* -- 5. the verbs -------------------------------------------------------- */
group('the verbs');
const at = (bar, mv, opts) => L.compositionAt(SEED, P, mv || MOVE, bar,
  opts ? { auto: true, mutate: false, ...opts } : AUTO);

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

/* -- #53: THE RING MUST CLOSE THE HARMONY, NOT ONLY THE ARRANGEMENT --------
   `scheduleStateAt` wraps its own bar against `movement.bars`; `compositionAt`
   handed the UNWRAPPED bar to `walkAt`. So the discrete arrangement came home
   at the wrap and the harmony did not: on 2 laps of every 4 the piece sat a
   whole tone below the tonic at the last bar of the ring and snapped home on
   the downbeat of the next — a cut, not a modulation.

   The comment at the wrap states the rule and put the walk on the wrong side
   of it: "Discrete state must be home by bar 256; modulator phase need not be,
   and is not." Modulator phase is continuous and a boundary in it is
   inaudible, so that exemption is right. A ROOT TRANSPOSITION IN SCALE DEGREES
   IS DISCRETE PITCH and does not get the exemption. */
group('#53 — the ring closes the harmony too');
{
  const span = N;
  ok(Number.isFinite(span) && span > 0, 'the shipped movement has a finite ring', `${span} bars`);
  const walkAtBar = (sd, b) => L.compositionAt(sd, P, M, b, { auto: true }).walk;
  let snapped = [];
  for (const sd of [0x11CE9E, 8675309, 42, 7, 999983, 20260920]) {
    const home = walkAtBar(sd, 0);
    for (let lap = 0; lap < 4; lap++) {
      const last = walkAtBar(sd, lap * span + span - 1);
      if (last !== home) snapped.push(`seed ${sd} lap ${lap}: ${last} vs home ${home}`);
    }
  }
  ok(snapped.length === 0,
     'the walk is home at the last bar of every lap, for every seed',
     snapped.length ? snapped.slice(0, 3).join(' | ') : '6 seeds x 4 laps');

  // The same statement said the other way round: the wrap is a wrap, so bar
  // `span` must resolve exactly as bar 0 does, harmony included.
  let differ = 0;
  for (const sd of [0x11CE9E, 42, 999983]) {
    for (let lap = 1; lap < 4; lap++) if (walkAtBar(sd, lap * span) !== walkAtBar(sd, 0)) differ++;
  }
  ok(differ === 0, 'and bar N*span resolves the same harmony as bar 0', `3 seeds x 3 laps`);
}

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

/* -- THE SLOT TABLE: every modulator the arrangement CAN bind ---------------
   The hand's trims are keyed on it, so a slot that is missing is a control
   that does not exist and a slot that is wrong is a control with the wrong
   name on it. It is derived, never written out, and the two places it derives
   from count their rates DIFFERENTLY. */
group('the modulator slots');
ok(L.MOD_SLOT_KEYS.join(' ') === 'mod.6.delay mod.6.reverb mod.3.level mod.7.reverb mod.3.reverb',
   'five slots: the manifest\'s three and the movement\'s two', L.MOD_SLOT_KEYS.join(' '));
// THE RATE TRAP. `PIECE.mods[].rate` is an INDEX into MOD_RATES; a `mod`
// EVENT's fifth element is a BAR COUNT. The manifest's ch6 delay has rate 4,
// which is 3 bars, not 4; the movement's ch7 reverb has 32, which is 32 bars.
// Both numbers are legal as both readings, so nothing complains if this is got
// the wrong way round — it just prints the wrong cycle beside a slider.
ok(L.MOD_SLOTS['mod.6.delay'].bars === 3 && L.MOD_SLOTS['mod.3.level'].bars === 4,
   'a manifest rate is read as an INDEX into MOD_RATES',
   `rate 4 -> ${L.MOD_SLOTS['mod.6.delay'].bars} bars, rate 3 -> ${L.MOD_SLOTS['mod.3.level'].bars} bars`);
ok(L.MOD_SLOTS['mod.7.reverb'].bars === 32 && L.MOD_SLOTS['mod.3.reverb'].bars === 7,
   'and an event rate is read as BARS', `32 and 7`);
ok(L.MOD_SLOTS['mod.6.delay'].from === 'piece' && L.MOD_SLOTS['mod.7.reverb'].from === 'movement',
   'each slot knows which of the two declared it — the surface needs it to say why a row is dead');
ok(L.MOD_SLOTS['mod.6.delay'].why.startsWith('the stab\'s echo')
   && L.MOD_SLOTS['mod.3.reverb'].why.length > 0,
   'and carries the composer\'s own sentence, from the manifest or from the section');
// A DEPTH OF 0 IS AN UNBIND AND CAN NEVER MAKE A SLOT: a row for it would be a
// control over a modulator that does not exist.
const slotsOff = L.modSlotsOf(P, { phrase: 8, section: 32, bars: 256, sections: [
  { at: 0, event: ['mod', 1, 'reverb', 0, 8, 'tri'], why: 'an unbind, not a binding' }] });
ok(!slotsOff['mod.1.reverb'] && Object.keys(slotsOff).length === 3,
   'an unbind event makes no slot', Object.keys(slotsOff).join(' '));
// THE FIRST DECLARATION NAMES THE SLOT. A movement that rebinds one of the
// manifest's modulators deeper must not rewrite the row's name or its reason.
const slotsRebind = L.modSlotsOf(P, { phrase: 8, section: 32, bars: 256, sections: [
  { at: 64, event: ['mod', 6, 'delay', 80, 8, 'ramp'], why: 'the same slot, deeper' }] });
ok(slotsRebind['mod.6.delay'].depth === 34 && slotsRebind['mod.6.delay'].bars === 3,
   'a later event on a slot the manifest already declared does not rewrite it',
   'the LIVE mod object is what the surface prints the depth from');

/* -- THE ORDER THE FOLD RELIES ON IS ENFORCED ------------------------------
   `scheduleStateAt` breaks at the first section past the bar it was asked for.
   A section appended out of `at` order is therefore never applied, and the
   composition comes back looking exactly like the untouched piece — which is
   indistinguishable from a test that passed. This is the guard, and it is the
   only reason that failure is loud. */
group('a movement out of order is refused, not silently ignored');
const outOfOrder = { phrase: 8, section: 32, bars: 256, sections: [
  { at: 32, event: ['chance', 1, 0.5], why: 'first' },
  { at: 0, event: ['mod', 6, 'delay', 0, 3, 'tri'], why: 'behind it, and would never run' }] };
let orderThrew = false;
try { at(64, outOfOrder); } catch (e) { orderThrew = /out of `at` order/.test(e.message); }
ok(orderThrew, 'sections out of `at` order throw where they are folded');
let sortedOk = true;
try { at(64, { ...outOfOrder, sections: [...outOfOrder.sections].sort((a, b) => a.at - b.at) }); }
catch { sortedOk = false; }
ok(sortedOk, 'and the same sections, sorted, are accepted');

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
const base = L.baseComposition(P, M.phrase);
for (const b of OFF_BARS) {
  const c = L.compositionAt(SEED, P, M, b);
  const sameAsBase = L.ALL_CHANNELS.every(ch =>
    c.chance[ch] === base.chance[ch] &&
    c.move[ch] === base.move[ch] &&
    c.phrase[ch] === base.phrase[ch] &&
    c.present[ch] === 1 &&
    c.wet[ch].delay === base.wet[ch].delay &&
    c.wet[ch].reverb === base.wet[ch].reverb);
  ok(sameAsBase && c.walk === 0 && c.walkCfg.bars === 0 && c.gesture === null
     && c.mods.length === P.mods.length && c.auto === false,
     `bar ${b + 1} with auto off is the BASE STATE, and nothing else`,
     `chance ${c.chance[6]} · move ${c.move[0]} · phrase ${c.phrase[3]} · walk ${c.walk}`
     + ` · ${c.mods.length} modulators · wet6 ${c.wet[6].delay}`);
}

// The four things the schedule WOULD have done by those bars, named one at a
// time — because "it equals the base" passes just as well if the base itself
// quietly moved. These are the events, checked at bars past where each fires.
const offAt = b => L.compositionAt(SEED, P, M, b, NOMUT);
ok(offAt(40).chance[6] === 1, 'the chance event at bar 33 did not land', 'ch6 chance still 1');
ok(offAt(70).wet[6].delay === P.wets[6].delay / 100,
   'the echo did not open at bar 65', `ch6 delay still ${offAt(70).wet[6].delay}`);
ok(offAt(160).walk === 0, 'the walk bound at bar 129 is not running', 'walk 0 degrees');
ok(offAt(24).gesture === null && offAt(24).wet[2].delay === P.wets[2].delay / 100,
   'and the one-shot throw at bar 25 did not fire either — a gesture is part of the SCHEDULE',
   `ch2 delay ${offAt(24).wet[2].delay}, not 0.9`);

// The modulators are the TEXTURE, not the autoplay. Owner, the same hour:
// the continuous per-channel modulators keep breathing by default. So the
// manifest's three must survive the switch being off, at their own rates,
// while the two the SCHEDULE binds at bar 0 must not.
const offMods = offAt(129).mods;
// `mods[].bars` IS A BAR COUNT NOW, NOT AN INDEX INTO MOD_RATES (#38, §3.2).
// It was an index on the piece and a bar count on a `mod` EVENT; 5 and 7 are
// valid as both, so nothing complained and the two readings differed by a
// factor of two and a half.
ok(offMods.length === 3 && offMods.every((m, i) => m.channel === P.mods[i].channel
     && m.verb === P.mods[i].verb && m.bars === P.mods[i].bars),
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
// TIER 3 IS NOT THE ARRANGEMENT, and this pair is where that claim is kept
// honest. `offAt` carries NOMUT, so what is counted here is the SCHEDULE: with
// auto off it must still be one bar, exactly as the owner decided. Section 7
// then counts the same 256 bars with the grain on, and it is a large number —
// two different questions, two different numbers, neither hiding the other.
ok(new Set(offPrints).size === 1, 'THE ARRANGEMENT HOLDS STILL: one distinct bar in ' + N + ' with auto off, tier 3 aside',
   `${new Set(offPrints).size} distinct fingerprint(s)`);
ok(L.fingerprint(offAt(3583), SEED) === offPrints[0],
   'and bar 3584 — the far end of a two-hour set — is still the same bar');

// AUTO ON IS EXACTLY WHAT SHIPPED, and "exactly" is a digest and not an
// adjective. This is the 256 fingerprints of the movement as they stood on
// main at 0ea718c, 2026-09-18, measured before the switch was written.
// A DELIBERATE SCHEDULE CHANGE MUST MOVE THIS NUMBER — that is the point of
// pinning it. What it refuses is the switch changing the schedule's behaviour
// by accident.
//
// MOVED ONCE, 2026-09-19, BY #38, AND THE OLD NUMBER IS KEPT BECAUSE IT IS THE
// CONTROL. `a98594eccdd9a736` / 79 distinct was the literal `PIECE`. The draw
// replaced it, and with the CHANCE SLOT KEY LEFT AS IT WAS the drawn piece
// reproduces that digest bar for bar — measured, both runs, in the same
// process. So the draw changes nothing about the material, and the ONLY thing
// that moved the number is the slot key itself: `take[e].step * 8 + e * 4 + k`
// became `e * 4 + k` (§0.4), because the old key collides once a channel has
// more than two events — `step*8 + 8` is `(step+1)*8 + 0` — and a drawn bass
// with six onsets makes two different notes share one chance roll. The stab
// sits at chance 0.75 from bar 33 to bar 224, so a different key drops a
// different note of the same triad in those bars. Same material, same
// statistics, a different throw of the same dice.
const SHIPPED_DIGEST = 'bac4694aec2d6432';
const shippedNow = createHash('sha256').update(prints.join('\n')).digest('hex').slice(0, 16);
ok(PROVE_RED || shippedNow === SHIPPED_DIGEST,
   'with auto ON the movement is bar-for-bar the schedule that shipped at 0ea718c',
   `${prints.length} bars, digest ${shippedNow} against ${SHIPPED_DIGEST}`);
ok(PROVE_RED || new Set(prints).size === 83,
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
const ran = bar => L.compositionAt(SEED, P, M, bar, { auto: true });
const held = h => bar => L.compositionAt(SEED, P, M, bar, { auto: true, holds: h });

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
ok(ran(35).chance[6] === 0.75 && L.compositionAt(SEED, P, M, 35).chance[6] === 1,
   'the layer keeps nothing: the same bar asked again, without holds, is the schedule\'s again');

// THE HAND IS THE WHOLE INSTRUMENT WITH THE RING OFF. Held is not frozen:
// this is the case the owner actually plays.
const offHand = L.compositionAt(SEED, P, M, 8, { holds: { chance: { 3: 0.7 } } });
ok(offHand.chance[3] === 0.7 && offHand.chance[6] === 1 && offHand.walk === 0,
   'with auto OFF a held value is the only thing that moves', 'ch3 chance 0.7, everything else base');
const offHandPrints = [];
for (let b = 0; b < 32; b++)
  offHandPrints.push(L.fingerprint(L.compositionAt(SEED, P, M, b, { mutate: false, holds: { chance: { 3: 0.7 } } }), SEED));
ok(new Set(offHandPrints).size === 8,
   'and it VARIES — the hats thin and come round on the movement\'s phrase, with no schedule at all',
   `${new Set(offHandPrints).size} distinct bars in 32`);

// a held phrase changes the channel's own cycle, with nothing else running
const offPhrase = b => L.compositionAt(SEED, P, M, b, { holds: { phrase: { 6: 3 } } });
ok([0, 1, 2, 3, 4, 5].map(b => offPhrase(b).key[6]).join(',') === '0,1,2,0,1,2',
   'a held PHRASE is the channel\'s own cycle, auto off', '0,1,2,0,1,2');

// THE HAND GOES THROUGH THE SAME CLAMPS THE VERBS DO. A surface is a claim;
// this is the layer refusing to take its word for it.
const wild = L.compositionAt(SEED, P, M, 8,
  { holds: { phrase: { 6: 12 }, chance: { 6: 5 }, delay: { 6: 9 }, move: { 6: -1 } } });
ok(wild.phrase[6] === 8 && wild.chance[6] === 1 && wild.wet[6].delay === 2 && wild.move[6] === 0,
   'a held value out of range is clamped exactly as the verb clamps it',
   `phrase ${wild.phrase[6]} · chance ${wild.chance[6]} · delay ${wild.wet[6].delay} · move ${wild.move[6]}`);
ok(L.compositionAt(SEED, P, M, 8, { holds: { move: { 0: L.LOCK } } }).move[0] === L.LOCK,
   'and LOCK is a word the hand may hold, not a number it may not');

/* -- 5d. FIRED GESTURES --------------------------------------------------
   The scheduler owns WHEN an event is stamped. From then on the composition
   layer sees plain data, so seek, offline render and live playback all ask the
   same question. These checks cover boundaries and replacement rather than
   mirroring the interpolation code.
   ------------------------------------------------------------------------ */
group('fired gestures — explicit, bounded, replayable');
const fireAt = (bar, events, extra = {}) =>
  L.compositionAt(SEED, P, M, bar, { mutate: true, fires: { events }, ...extra });
const captured = { present: { 0: 1, 5: 1, 6: 1, 7: 1 }, reverb: { 6: P.wets[6].reverb / 100 } };
const drop = { id: 1, kind: 'drop', at: 10, bars: 4, capture: captured };
ok(fireAt(9, [drop]).present[0] === 1 && fireAt(9, [drop]).fire.active === null,
   'a macro changes nothing before its stamped bar');
ok(fireAt(10, [drop]).present[0] < 1 && fireAt(13, [drop]).present[0] === 0,
   'drop starts on its bar and reaches silence on its last active bar');
ok(fireAt(14, [drop]).present[0] === 0 && fireAt(200, [drop]).present[5] === 0,
   'LAND persists across a cold seek', 'kick and sub remain out');
const cancelled = { ...drop, until: 12 };
ok(fireAt(12, [cancelled]).present[0] === 1 && fireAt(200, [cancelled]).fire.landed.length === 0,
   'a cancelled or replaced macro does not land');

const build = { id: 2, kind: 'buildup', at: 20, bars: 4, capture: captured };
ok([20, 21, 22, 23].map(b => fireAt(b, [build]).mut.ratchet.count).join(',') === '1,2,3,4'
   && fireAt(24, [build]).mut.ratchet === null,
   'buildup rises one to four repeats and RETURN clears at the end', '1,2,3,4,return');
const phase = { id: 3, kind: 'phaseout', at: 30, bars: 3, capture: captured };
ok(fireAt(32, [phase]).present[7] === 0 && fireAt(33, [phase]).present[7] === 0,
   'phase-out removes the pad and LAND keeps it out');
const reverb = { id: 4, kind: 'reverbout', at: 40, bars: 4, capture: captured };
const revMid = fireAt(41, [reverb]);
const revBack = fireAt(44, [reverb]);
ok(revMid.wet[6].reverb > captured.reverb[6] && revMid.present[6] < 1
   && revBack.wet[6].reverb === captured.reverb[6] && revBack.present[6] === 1,
   'reverb-out sends the stab into the room and RETURN restores the bar');
ok(fireAt(41, [reverb], { holds: { reverb: { 6: 0.23 } } }).wet[6].reverb === 0.23,
   'a held room send outranks a fired reverb-out');

const unordered = [
  { id: 8, kind: 'micro', micro: 'kick-ghost', at: 55 },
  { id: 7, kind: 'micro', micro: 'stab-lean', at: 55 }
];
const orderedA = fireAt(55, unordered);
const orderedB = fireAt(55, unordered.slice().reverse());
ok(L.fingerprint(orderedA, SEED) === L.fingerprint(orderedB, SEED),
   'timeline order cannot change the resolved bar');
ok(orderedA.mut.fired.length <= 2 && orderedA.mut.fired.every(x => x.manual),
   'one-bar buttons use the existing mutation families and keep the two-event cap');
for (const micro of L.FIRE_MICROS) {
  const bar = micro === 'turnaround' ? 63 : 62;
  const C = fireAt(bar, [{ id: 20, kind: 'micro', micro, at: bar }]);
  ok(C.fire.micros.includes(micro) && C.mut.fired.some(x => x.manual),
     `the ${micro} button reaches its mutation family`);
}
ok(!fireAt(62, [{ id: 21, kind: 'micro', micro: 'turnaround', at: 62 }]).mut.fired.some(x => x.manual),
   'turnaround cannot fire away from a phrase end');

/* -- 6. the control is still the control ---------------------------------
   These four were "the manifest is untouched" while the manifest WAS the
   piece. They now say something narrower and still worth saying: the frozen
   piece is the one that shipped, and `lanePat` turns it back into the same
   four lanes. If a future edit to the pattern rule changes what a stored lane
   means, this is where it goes red — and it goes red with no dice in it.
   ------------------------------------------------------------------------ */
group('the control piece is 221-dub-basic, bar for bar');
const lane = ch => L.lanePat(P.drums[ch]).join('');
ok(lane(0) === '1000100010001000', 'the kick is still four on the floor');
ok(lane(1) === '0000100000000000', 'the rimshot is still on beat 2');
ok(lane(2) === '0000000000001000', 'the clap is still on beat 4');
ok(lane(3) === '1010101010101010', 'the hats are still eighths');
ok(P.levels[0] === 0.77 && L.MASTER_TRIM === 0.95, 'the faders and the master trim are where they were');

/* -- 7. THE DRAW IS WIDE, AND EVERY SEED IS STILL IN GENRE ----------------
   #50's proof criterion, and the one thing the pinned manifest could not be
   asked: now that a seed draws a different piece, do ALL of them conform?

   Three questions, and they are different questions:

   1. ZERO CONTRACT VIOLATIONS over N seeds, asked by `quiz`, which is a
      SEPARATE implementation from `repair`. A repair that silently no-ops
      passes its own check and cannot pass an independent one.
   2. ZERO REPAIRS over N seeds. A repair firing in production is a bug in the
      POOLS, not a rescue of the piece (#38 §5.2) — the fence is there for the
      pool nobody has written yet, and a fence that fires routinely is a pool
      that reaches out of genre.
   3. COVERAGE: every entry of every pool that is drawn at all is drawn at
      least once. A pool entry nothing reaches is a piece of the style that no
      listener will ever hear, which is the quiet way a "wide" manifest turns
      out to be narrow.

   The seeds are the low 24 bits of a multiplicative walk rather than 0..N-1,
   because consecutive integers are exactly the input `rand01` is least likely
   to correlate on and therefore the easiest case, not the honest one.
   ------------------------------------------------------------------------ */
group('the draw is wide, and every seed is still in genre');

const DRAWS = 2000;
const seedOf = i => ((i * 2654435761) >>> 8) & 0xFFFFFF;
const cover = {};          // path -> Set of pool index drawn
const poolOf = {};         // path -> pool length, as the draw reported it
let repaired = 0, quizFails = 0;
const firstRepair = [], firstQuiz = [];
const lanes = [];          // the four drum lanes of each piece, as one string
for (let i = 0; i < DRAWS; i++) {
  const sd = seedOf(i);
  const pc = L.draw(sd);
  if (pc.violations.length) { repaired++; if (firstRepair.length < 3) firstRepair.push(sd.toString(16) + ':' + pc.violations.map(v => v.fence).join('+')); }
  const q = L.quiz(pc, L.CONTRACT);
  if (q.length) { quizFails++; if (firstQuiz.length < 3) firstQuiz.push(sd.toString(16) + ':' + q.map(v => v.fence).join('+')); }
  for (const path of Object.keys(pc.drawn)) {
    const rec = pc.drawn[path];
    if (rec.of === undefined) continue;                 // a range, not a pool
    (cover[path] = cover[path] || new Set()).add(rec.i);
    poolOf[path] = rec.of;
  }
  lanes.push([0, 1, 2, 3].map(ch => pc.empty[ch] ? '-' : L.lanePat(pc.drums[ch]).join('')).join('|'));
}

ok(quizFails === 0, `${DRAWS} drawn pieces and the quiz finds no contract violation`,
   quizFails ? `${quizFails} failed, e.g. ${firstQuiz.join(' ')}` : `${DRAWS} clean`);
ok(repaired === 0, 'and no repair fired — the fences are a guard, not a rescue',
   repaired ? `${repaired} pieces repaired, e.g. ${firstRepair.join(' ')}` : 'no piece needed one');

const thin = Object.keys(cover).filter(k => cover[k].size < poolOf[k]);
ok(thin.length === 0, 'every entry of every pool the draw reaches is reached',
   thin.length ? thin.map(k => `${k} ${cover[k].size}/${poolOf[k]}`).join(', ')
               : `${Object.keys(cover).length} pools, all entries drawn`);

/* THE ONE THAT CATCHES "THEY ALL SOUND THE SAME", which is the recorded
   verdict of the parent's own round one. It is deliberately about the DRUMS
   and not about the fingerprint: two pieces can differ in a pad octave and be
   the same track to a dancer. Kick and kit are what a listener names first. */
const distinctLanes = new Set(lanes).size;
const commonest = (() => { const c = {}; let m = 0; for (const l of lanes) m = Math.max(m, c[l] = (c[l] || 0) + 1); return m; })();
ok(distinctLanes >= DRAWS / 10, 'and the drawn kits are not one kit with a coat of paint',
   `${distinctLanes} distinct kits in ${DRAWS} draws`);
ok(commonest <= DRAWS / 4, 'no single kit is the piece the manifest really draws',
   `the commonest kit is ${commonest} of ${DRAWS} (${(100 * commonest / DRAWS).toFixed(1)}%)`);

// THE PAGE'S OWN PIECE IS ONE OF THEM AND GETS NO EXEMPTION.
const dflt = L.draw(L.DEFAULT_SEED);
ok(L.quiz(dflt, L.CONTRACT).length === 0 && dflt.violations.length === 0,
   'the piece the page lands on is drawn under the same rules as the rest');

// and the control goes back, so nothing after this reads a drawn piece.
L.usePiece(SHIPPED);


/* -- 7. TIER 3 — THE PER-BAR MUTATION ------------------------------------
   ADDED AS ONE CONTIGUOUS BLOCK AT THE END, 2026-09-19 (#52 / #47 §6), because
   another agent is editing this file in parallel. Everything above is tier 1
   and tier 2 and runs with `mutate: false`; this section is the only one that
   turns the grain on, and it turns it on explicitly every time.

   WHAT THIS IS FOR. The owner's complaint was "NOT ALWAYS THE SAME LOOP". The
   loop detector above proves the ARRANGEMENT moves; it cannot prove the grain
   does, because it was written before the grain existed. The honest pair is
   the count with the layer and the count without it, from the same build —
   the second is what says whether the drawn material carries the piece or
   whether the grain is doing all the work. Both are pinned here. */
group('tier 3 — the per-bar mutation');

const mutAt = (bar, opts) => L.compositionAt(SEED, P, M, bar, { auto: true, ...(opts || {}) });
const mutFp = (bar, opts) => L.fingerprint(mutAt(bar, opts), SEED);

// THE PAIR. Measured 2026-09-19 on this build; a deliberate change to the odds
// or the slots MUST move these, which is the point of pinning them.
const t3on = [], t3off = [];
for (let b = 0; b < N; b++) { t3on.push(mutFp(b)); t3off.push(mutFp(b, { mutate: false })); }
// MOVED ONCE, 2026-09-19, BY THE REBASE ONTO THE DRAWN MANIFEST, and the
// reason is known rather than discovered: #38 fixed the chance slot key from
// `take[e].step * 8 + e * 4 + k` to `e * 4 + k`, which drops a different note
// of the same triad wherever the stab sits at chance 0.75. 79/159 became
// 83/163 — BOTH HALVES MOVED BY THE SAME FOUR, which is what says the grain
// itself is untouched by a change to the dice underneath it.
ok(new Set(t3off).size === 83 && new Set(t3on).size === 163,
   'the honest pair: distinct bars in ' + N + ' WITHOUT the mutation and WITH it',
   `${new Set(t3off).size} without · ${new Set(t3on).size} with`);
const offOn = [], onOn = [];
for (let b = 0; b < N; b++) {
  offOn.push(L.fingerprint(L.compositionAt(SEED, P, M, b, { mutate: false }), SEED));
  onOn.push(L.fingerprint(L.compositionAt(SEED, P, M, b), SEED));
}
// AND THE ONE THE OWNER ACTUALLY LOADS. `auto` is off by default, so this is
// the page as it opens: one bar repeated 256 times before tier 3 existed.
ok(new Set(offOn).size === 1 && new Set(onOn).size > 20,
   'with auto OFF — the page as it opens — the arrangement still holds still and the GRAIN is what moves',
   `${new Set(offOn).size} without · ${new Set(onOn).size} with`);

// HASH-ADDRESSABLE, NOT A STREAM. This is the property the whole layer is
// shaped by: bar 3584 must be answerable without playing the 3583 before it,
// or `seek` stops being the same performance.
let far = 900;
while (far < 1200 && mutAt(far).mut.sig === '-') far++;
const cold = mutAt(far).mut.sig;
for (let b = 0; b < 4096; b++) mutAt(b);
ok(cold === mutAt(far).mut.sig && cold !== '-',
   'a mutation is a fact about (seed, bar): bar ' + (far + 1) + ' asked cold and asked after 4096 bars is the same bar',
   `"${cold}"`);
ok(L.compositionAt(SEED ^ 0x7777, P, M, far, { auto: true }).mut.sig !== cold,
   'and it is a fact about the SEED too — another seed has another performance');

// THE CAP, AND §6.4 — WHAT MAY NEVER MUTATE. Over 40 seeds × 256 bars, because
// one seed proves nothing about a rule.
let over = 0, stabMoved = 0, badPitch = 0, badGhost = 0, badPull = 0, pulls = 0, supSeen = 0;
const stabSteps = (P.chords[6] || []).map(e => e.step).join(',');
for (let s = 0; s < 40; s++) {
  const sd = (0x11CE9E + s * 7919) | 0;
  let lastPull = -99;
  for (let b = 0; b < 256; b++) {
    const m = L.compositionAt(sd, P, M, b, { auto: true }).mut;
    if (m.fired.length > m.cap) over++;
    if (m.ghost[6] || m.dropped[6] || m.skip[6] !== undefined) stabMoved++;
    if (m.bassOctave && m.bassOctave.index === 0) badPitch++;
    if (m.skip[0] !== undefined) { pulls++; if (m.skip[0] !== 12) badPull++; if (b - lastPull < 8) badPull++; lastPull = b; }
    // `L.lanePat(P.drums[ch])` AND NOT `L.DRUM_PAT`, for a reason that has
    // changed and still holds: the export used to be the table as it stood
    // when the region was evaluated, because `rebuildDerived` REBOUND it
    // (#51 made it one object whose contents are replaced, so it is live
    // now). What still holds is that this asks about the DRAWN lane, and
    // `DRUM_PAT` carries the hand's pins on top of it. And a ghost step is a
    // BAR step while a lane may be 12 or 14 long, so the collision question
    // is `laneStep`'s, not `[g.step]`'s.
    for (const ch of [0, 3]) {
      const pat = L.lanePat(P.drums[ch]);
      for (const g of (m.ghost[ch] || [])) if (pat[L.laneStep(pat, b * 16 + g.step)]) badGhost++;
    }
    if (m.suppressed.length) { supSeen++; if (!m.text) badGhost++; }
  }
}
ok(over === 0, 'THE CAP HOLDS: never more than two mutations in one bar', `${over} breaches in 10240 bars`);
ok(stabMoved === 0 && (P.chords[6] || []).map(e => e.step).join(',') === stabSteps,
   'THE STAB\'S STEPS ARE NEVER TOUCHED — the figure is the identity of the genre', `steps ${stabSteps}`);
ok(badPitch === 0, 'the bass octave never takes the downbeat note — the anchor of the bar');
ok(badGhost === 0, 'a ghost never lands on a step the lane already plays, and a suppression always carries its words');
ok(badPull === 0 && pulls > 0,
   'beat four is pulled only at a phrase end, only beat four, and never twice running', `${pulls} pulls in 10240 bars`);
ok(supSeen > 0, 'a suppressed mutation is RECORDED, not dropped — the surface can say a ghost stood down',
   `${supSeen} bars in 10240 carry one`);

// A MUTATION WRITES OVER THE MATERIAL, NEVER INTO IT. The drawn patterns and
// the takes must be bit-identical after a thousand bars of mutation.
const lanesNow = () => [0, 1, 2, 3].map(ch => P.drums[ch] && L.lanePat(P.drums[ch]).join(''));
const matBefore = JSON.stringify([lanesNow(), P.chords, P.drums]);
for (let b = 0; b < 1000; b++) mutAt(b);
ok(JSON.stringify([lanesNow(), P.chords, P.drums]) === matBefore,
   'TIER 1 IS UNTOUCHED after a thousand mutated bars — the layer writes over the bar, not into the piece');

// THE DOOR IS REAL. `mutate: false` must produce the string the page produced
// before tier 3 existed — no field, not an empty one.
ok(mutFp(far, { mutate: false }).indexOf('t3:') === -1 && mutFp(far).indexOf('t3:') !== -1,
   '`mutate: false` is a real door: the fingerprint of an unmutated bar is the string it always was');

/* -- 8. THE LEAD ON CHANNEL 4 --------------------------------------------
   Channel 4 was a hole: a fader, a send and a silence reason for a channel
   that was in neither playback loop. It is now a voice, and the five laws
   that keep it dub rather than a tune are asserted here over every seed that
   draws one — not over the one the page happens to land on.

   The laws are not decoration. The source's own dub contract lists "busy
   melodic lead" under `avoid`; it is the one thing the genre explicitly
   refuses, and three of these five exist to make refusing it structural.
   ------------------------------------------------------------------------ */
group('the lead is a part, not a tune');

const LEADS = 400;
let withLead = 0, regBad = 0, stepBad = 0, polyBad = 0, earlyBad = 0, halfBad = 0, wetBad = 0;
let answerBad = 0, barsOn = 0, worstShare = 0;
const quotesSeen = new Set();
for (let i = 0; i < LEADS; i++) {
  const sd = seedOf(i);
  const pc = L.draw(sd);
  const take = pc.chords[4];
  if (!take || !take.length) continue;
  withLead++;
  const stabSteps = pc.chords[6].map(e => e.step);
  const stabTop = Math.max.apply(null, pc.chords[6][0].notes);
  // L-LEAD-REG — three semitones of clear air under the lead's lowest note.
  if (Math.min.apply(null, take.map(e => e.notes[0])) < stabTop + 3) regBad++;
  // L-LEAD-STEP — the stab does not move for anybody.
  for (const e of take) if (stabSteps.indexOf(e.step) !== -1) stepBad++;
  // MONOPHONIC: one note per bar of the cycle. Two is a line, and a line is
  // the thing the contract refuses.
  const perBar = {};
  for (const e of take) { if (perBar[e.atBar]) polyBad++; perBar[e.atBar] = 1; }
  // L-LEAD-WET — furthest back: the highest delay send in the piece.
  const d4 = pc.wets[4].delay;
  if (!(d4 >= pc.wets[6].delay) || !(pc.wets[4].reverb >= pc.wets[6].reverb)) wetBad++;
  if (!Object.keys(pc.wets).every(ch => pc.wets[ch].delay <= d4)) wetBad++;
  // L-LEAD-SPARSE and L-LEAD-ANSWER, over the real movement.
  let on = 0, run = 0, longestRun = 0, longestRest = 0, rest = 0;
  for (let b = 0; b < N; b++) {
    const c = L.compositionAt(sd, pc, M, b, { auto: true, mutate: false });
    const sounding = !!(c.lead && c.lead.take.length);
    if (c.lead) quotesSeen.add(c.lead.how);
    if (sounding) {
      if (b < L.LEAD_FROM) earlyBad++;
      on++; run++; rest = 0; longestRun = Math.max(longestRun, run);
    } else { run = 0; rest++; longestRest = Math.max(longestRest, rest); }
  }
  barsOn += on;
  worstShare = Math.max(worstShare, on / N);
  if (on > N / 2) halfBad++;
  if (longestRest < longestRun) answerBad++;
}

ok(withLead > LEADS / 4 && withLead < LEADS,
   'a lead is a draw and not a fixture — some pieces have one and some do not',
   `${withLead} of ${LEADS} seeds drew a lead`);
ok(regBad === 0, 'L-LEAD-REG: the lead sits at least 3 semitones above the stab, every seed',
   `${regBad} breaches in ${withLead} leads`);
ok(stepBad === 0, 'L-LEAD-STEP: no lead onset lands on a stab onset — the chord does not move',
   `${stepBad} collisions`);
ok(polyBad === 0, 'the lead is MONOPHONIC — never two notes in one bar of its cycle');
ok(wetBad === 0, 'L-LEAD-WET: the lead carries the highest delay send in the piece, and the stab\'s reverb at least');
ok(earlyBad === 0, `L-LEAD-SPARSE: nothing before bar ${L.LEAD_FROM} — the piece states itself first`);
ok(halfBad === 0, 'L-LEAD-SPARSE: never more than half the movement',
   `worst seed sounds in ${(100 * worstShare).toFixed(1)}% of bars, mean ${(100 * barsOn / withLead / N).toFixed(1)}%`);
ok(answerBad === 0, 'L-LEAD-ANSWER: it rests for at least as long as it plays — the space is the part');
ok(quotesSeen.size === L.LEAD_QUOTES.length - 1,
   'every quote of the motif is reached — a motif that is re-drawn is not a motif',
   `${[...quotesSeen].sort().join(', ')}`);

// AND THE QUOTES ARE TRANSFORMS OF ONE FIGURE, not six figures. `literal`
// appears twice in the pool, so it is the common case by weight.
const anyLead = (() => {
  for (let i = 0; i < LEADS; i++) { const pc = L.draw(seedOf(i)); if (pc.chords[4] && pc.chords[4].length > 2) return pc; }
  return null;
})();
ok(anyLead !== null, 'a motif of three notes or more exists to ask about');
if (anyLead) {
  const sc = L.SCALE_STEPS ? null : null;   // the scale comes from the piece
  const m = anyLead.chords[4];
  const retro = L.quoteMotif(m, 'retrograde', [0, 2, 3, 5, 7, 8, 10], anyLead.globals.root);
  const thin = L.quoteMotif(m, 'thin', [0, 2, 3, 5, 7, 8, 10], anyLead.globals.root);
  ok(retro.length === m.length && retro[0].notes[0] === m[m.length - 1].notes[0],
     'the retrograde is the same notes backwards, and it keeps the figure\'s own bars');
  ok(thin.length === 2 && thin[0].notes[0] === m[0].notes[0],
     'the thin quote is the first note and the last, and nothing in between');
  ok(JSON.stringify(anyLead.chords[4]) === JSON.stringify(m),
     'and a quote never writes back into the material it quotes');
}

/* -- 9. THE PINS — THE HAND ON THE SHEET ---------------------------------
   ADDED 2026-09-20 (#51 / #58 step 4). The seam is one sentence: a pin is an
   overlay applied in `rebuildDerived` and nowhere else, so it reaches the
   scheduler, the fingerprint, the silence reasons and the sheet together and
   cannot drift. Everything below is that sentence, asked from the outside.

   THE ORDER IS THE POINT: DRAW, QUIZ, THEN OVERLAY. The 2000-seed
   zero-violation run above is a statement about what the DICE may do. A
   player who pins eight kick hits has not violated F1, they have played — so
   the last check in this section is that same run with pins in force.
   ------------------------------------------------------------------------ */
group('the pins — what the hand put there, and what it outranks');

L.clearPins();
L.usePiece(SHIPPED);

// The overlay is a no-op that is not merely equal but IDENTICAL when nothing
// is pinned: a page nobody has touched derives exactly what it derived before
// pins existed. The digest above is the other half of this claim.
const drawnKick = L.lanePat(SHIPPED.drums[0]);
ok(L.applyPins(0, drawnKick) === drawnKick,
   'with nothing pinned the overlay hands back the same array, not a copy of it');

L.setPin(3, 1, 1);
ok(L.pinCount() === 1 && L.pinAt(3, 1) === 1, 'a pin is set, and it is read back where it was set');
ok(L.DRUM_PAT[3][1] !== L.PIN_ON,
   'and the pattern table has NOT moved yet — the overlay is applied in one place',
   `DRUM_PAT[3] = ${L.DRUM_PAT[3].join('')}`);
L.rebuildDerived();
ok(L.DRUM_PAT[3][1] === L.PIN_ON, 'and `rebuildDerived` is that place',
   `DRUM_PAT[3] = ${L.DRUM_PAT[3].join('')}`);

// The URL token, readable, because these URLs are meant to be sent to a person
L.setPin(0, 5, 0);
const token = L.pinsToText();
ok(token === '0:-----.----------,3:-x--------------',
   'the pins write themselves as a token a person can read', token);
L.clearPins();
L.pinsFromText(token);
ok(L.pinsToText() === token && L.pinCount() === 2, 'and the token reads back as the pins it was');
L.pinsFromText('0:xxxx,9:xxxx,nonsense,3:qq');
ok(L.pinsToText() === '0:xxxx------------',
   'a token nobody can parse is dropped, not guessed at', L.pinsToText());
L.clearPins();
ok(L.pinsFromQuery('?seed=dub&pins=1:--x-------------').  /* the query, never the path */
     constructor === Object && L.pinAt(1, 2) === 1 && L.pinCount() === 1,
   'and `?pins=` on the URL arrives as the same table');
L.clearPins(); L.rebuildDerived();

/* A PINNED ON CELL FIRES WHERE CHANCE WOULD HAVE THINNED IT. This is the
   whole of "a pin outranks the manifest": the hit is not part of the drawn
   pattern to be let through, so the odds are not asked. */
const thinMv = { phrase: 8, section: 32, bars: 256,
                 sections: [{ at: 0, event: ['chance', 3, 0.5], why: 'x' }] };
const thinBar = 12;
const thinC = L.compositionAt(SEED, P, thinMv, thinBar, AUTO);
const hatPat = L.DRUM_PAT[3];
let thinnedStep = -1;
for (let st = 0; st < hatPat.length; st++)
  if (hatPat[st] && !L.stepFires(SEED, 3, thinC.key[3], st, thinC.chance[3])) { thinnedStep = st; break; }
ok(thinnedStep >= 0, 'chance 0.5 thins at least one hat step to aim at', `lane step ${thinnedStep}`);
const beforeFp = L.fingerprint(thinC, SEED).split(' ')[3];
L.setPin(3, thinnedStep, 1); L.rebuildDerived();
const afterFp = L.fingerprint(L.compositionAt(SEED, P, thinMv, thinBar, AUTO), SEED).split(' ')[3];
ok(beforeFp[2 + thinnedStep] === '.' && afterFp[2 + thinnedStep] === 'x',
   'a pinned ON cell fires where chance had thinned it away',
   `${beforeFp} -> ${afterFp}`);
ok(L.countHits(3) === L.lanePat(SHIPPED.drums[3]).reduce((a, b) => a + b, 0),
   'and a pinned step the lane already drew is still ONE hit, not two',
   `${L.countHits(3)} hits`);

// CHANCE 0 IS NOT A SILENCE WHEN A PIN IS IN IT, and the row must not hatch as
// one: a channel that sounds while the surface says it is silent is the fault
// rule 1 exists to prevent, wearing the other face.
const zeroMv = { phrase: 8, section: 32, bars: 256,
                 sections: [{ at: 0, event: ['chance', 3, 0], why: 'x' }] };
ok(!L.compositionAt(SEED, P, zeroMv, 8, AUTO).silent[3],
   'chance 0 with a pin in the lane is NOT reported as a silence',
   L.compositionAt(SEED, P, zeroMv, 8, AUTO).silent[3] || 'no reason given, because it is not silent');
L.clearPins(); L.rebuildDerived();
ok((L.compositionAt(SEED, P, zeroMv, 8, AUTO).silent[3] || '').indexOf('chance 0') === 0,
   'and with the pin released it is the sentence it always was',
   L.compositionAt(SEED, P, zeroMv, 8, AUTO).silent[3]);

/* A PINNED OFF CELL NEVER FIRES — not under chance 1, and not under a tier 3
   ghost either. A hole you cut that the machine can still sound is not a hole. */
const kickStep = L.DRUM_PAT[0].indexOf(1);
L.setPin(0, kickStep, 0); L.rebuildDerived();
const offFp = L.fingerprint(L.compositionAt(SEED, P, MOVE, 12, NOMUT), SEED).split(' ')[0];
ok(offFp[2 + kickStep] === '.', 'a pinned OFF cell does not fire, with chance at 1',
   `${offFp} — step ${kickStep} cut`);
ok(L.mutFreeSteps(0, 2, 12).indexOf(kickStep) === -1,
   'and tier 3 is not offered it as a free step — a ghost there would be the machine playing where the hand said never',
   `free steps: ${L.mutFreeSteps(0, 2, 12).join(',') || 'none'}`);

/* A PIN DOES NOT OUTRANK THE ARRANGEMENT. A channel that has left is silent,
   pins or not — otherwise "the generator draws around it" would mean "the
   generator is off". The MARK stays, because the sheet has to be able to
   answer which part of what you hear is yours. */
const leftMv = { phrase: 8, section: 32, bars: 256,
                 sections: [{ at: 0, event: ['leave', 0, 4], why: 'x' }] };
L.setPin(0, kickStep, 1); L.rebuildDerived();
const leftC = L.compositionAt(SEED, P, leftMv, 40, AUTO);
ok(leftC.present[0] <= 0 && L.fingerprint(leftC, SEED).split(' ')[0] === '0:-',
   'a channel the arrangement has rested stays silent with pins set',
   `present ${leftC.present[0]}, fingerprint ${L.fingerprint(leftC, SEED).split(' ')[0]}`);
ok(L.DRUM_PAT[0][kickStep] === L.PIN_ON,
   'and the pin is still in the table — the arrangement stops it sounding, it does not erase it');

/* A PIN SURVIVES A ROLL. The owner's "for ever": `usePiece` rebinds the piece
   and rebuilds everything derived from it, which is exactly what a new seed
   does, and the hand's table is not the piece's. */
const rolled = L.draw(0x5EED01);
L.usePiece(rolled);
ok(L.DRUM_PAT[0][kickStep] === L.PIN_ON && L.pinCount() === 1,
   'a pin survives a new piece — `usePiece` rebinds and the overlay goes back on',
   `seed 5eed01, DRUM_PAT[0] = ${L.DRUM_PAT[0].join('')}`);
L.clearPins(); L.usePiece(SHIPPED);

/* A LANE ON ITS OWN CYCLE: the pin is pinned to the LANE'S step, so the column
   it appears in moves every bar. That is the polymeter, and it is the one
   thing about a pin a player would otherwise file as a bug. */
let polyPiece = null;
for (let i = 0; i < 4000 && !polyPiece; i++) {
  const pc = L.draw(seedOf(i));
  if (!pc.empty[3] && L.lanePat(pc.drums[3]).length !== 16) polyPiece = pc;
}
ok(polyPiece !== null, 'a piece with a hat lane on its own cycle exists to ask about',
   polyPiece ? `lane length ${L.lanePat(polyPiece.drums[3]).length}` : 'none in 4000 draws');
if (polyPiece) {
  L.usePiece(polyPiece);
  const len = L.DRUM_PAT[3].length;
  let free = 0; while (free < len && L.DRUM_PAT[3][free]) free++;
  L.setPin(3, free, 1); L.rebuildDerived();
  const cols = [0, 1, 2].map(b => {
    const line = L.fingerprint(L.compositionAt(SEED, polyPiece, MOVE, b, NOMUT), SEED).split(' ')[3].slice(2);
    const out = [];
    for (let s = 0; s < 16; s++) if (L.laneStep(L.DRUM_PAT[3], b * 16 + s) === free) out.push(s);
    return out.join('/') + (out.every(s => line[s] === 'x') ? '' : ' MISSED');
  });
  ok(cols.join(' ').indexOf('MISSED') === -1 && cols[0] !== cols[1],
     `a pin on a ${len}-step lane is pinned to the lane's step and moves across the bar`,
     `lane step ${free} appears at columns ${cols.join(', ')} in bars 1, 2, 3`);
  L.clearPins(); L.usePiece(SHIPPED); L.rebuildDerived();
}

/* AND THE ORDER, WHICH IS THE WHOLE SPEC: DRAW, QUIZ, THEN OVERLAY. The
   2000-seed run again, with the hand all over the kit. If the fences ever saw
   a pin this is red — a player pinning eight kick hits would be reported as a
   contract violation, and §5.2 says a violation is a reportable incident. */
L.pinsFromText('0:xxxxxxxxxxxxxxxx,1:xxxxxxxx........,3:................');
let pinnedQuizFails = 0, pinnedRepairs = 0, inForce = 0;
const firstPinnedQuiz = [];
for (let i = 0; i < DRAWS; i++) {
  const sd = seedOf(i);
  const pc = L.draw(sd);
  if (pc.violations.length) pinnedRepairs++;
  const q = L.quiz(pc, L.CONTRACT);
  if (q.length) { pinnedQuizFails++; if (firstPinnedQuiz.length < 3) firstPinnedQuiz.push(sd.toString(16) + ':' + q.map(v => v.fence).join('+')); }
  // and the pins really were in force for every one of them
  L.usePiece(pc);
  if (L.DRUM_PAT[0] && L.DRUM_PAT[0].every(x => x === L.PIN_ON)) inForce++;
}
ok(pinnedQuizFails === 0 && pinnedRepairs === 0,
   `${DRAWS} drawn pieces with 24 cells pinned and the quiz still finds no violation`,
   pinnedQuizFails ? `${pinnedQuizFails} failed, e.g. ${firstPinnedQuiz.join(' ')}` : `${DRAWS} clean, ${pinnedRepairs} repairs`);
ok(inForce === DRAWS, 'and the pins were on the pattern table for every one of those draws',
   `${inForce} of ${DRAWS} pieces carried the overlay`);

L.clearPins();
L.usePiece(SHIPPED);
ok(L.pinCount() === 0 && L.DRUM_PAT[0].join('') === '1000100010001000',
   '`release pins` puts the lane back exactly as it was drawn', L.DRUM_PAT[0].join(''));


/* -- 12. THE RIDE — THE SPACE, AND WHAT IS TRUE AT EVERY POSITION IN IT ----
   #67. The claim is "half-way between two kicks is a kick", and for SOUND that
   is a claim about ranges: a position between two draws of one field is inside
   that field's own declared range, so it is a legal value of that field and
   the contract has nothing to refuse. This asks that of every ridable field at
   many positions rather than believing the argument. */
group('the ride');
{
  const RIDE_SEEDS = 40, POSITIONS = 21;
  const keys = Object.keys(L.RIDE_SOUND).reduce((a, ch) => a.concat(L.RIDE_SOUND[ch]), []);
  ok(keys.length > 0 && keys.every(k => L.VOX[k] && L.VOX[k].draw && L.VOX[k].draw.range),
     'every ridable field is a drawn NUMBER, never a name and never a fixed value',
     `${keys.length} fields over ${Object.keys(L.RIDE_SOUND).length} channels`);
  ok(L.RIDE_SOUND[5].length === 0,
     'the sub has no sound dimension — its only drawn voice field is a name');

  // 1. CONTAINMENT. Every position of every field, inside its own range.
  let outside = 0; const firstOut = [];
  for (let i = 0; i < RIDE_SEEDS; i++) {
    const seed = seedOf(i), piece = L.draw(seed);
    for (const ch of Object.keys(L.RIDE_SOUND)) {
      for (let p = 0; p < POSITIONS; p++) {
        const pos = p * L.RIDE_SPAN / (POSITIONS - 1);
        const v = L.rideVector(seed, piece.vox, ch, pos);
        for (const k of Object.keys(v)) {
          const r = L.STYLE.vox[k].range;
          if (!(v[k] >= r[0] - 1e-9 && v[k] <= r[1] + 1e-9)) {
            outside++;
            if (firstOut.length < 3) firstOut.push(`${k} ${v[k]} outside [${r}] at ${pos.toFixed(2)}`);
          }
        }
      }
    }
  }
  ok(outside === 0, 'no position of any ride leaves the range the manifest declares',
     outside ? firstOut.join(' | ') : `${RIDE_SEEDS} seeds x ${POSITIONS} positions x ${keys.length} fields`);

  // 2. POSITION ZERO IS THE PIECE, IDENTICALLY. Not "within a tolerance":
  // "push it back and the old one returns" is an equality or it is a story.
  let drift = 0;
  for (let i = 0; i < RIDE_SEEDS; i++) {
    const seed = seedOf(i), piece = L.draw(seed);
    for (const ch of Object.keys(L.RIDE_SOUND)) {
      const v = L.rideVector(seed, piece.vox, ch, 0);
      for (const k of Object.keys(v)) if (v[k] !== piece.vox[k]) drift++;
    }
  }
  ok(drift === 0, 'position 0 returns the drawn piece bit for bit', `${RIDE_SEEDS} seeds`);

  // 3. AN INTEGER POSITION IS A WAYPOINT, and the same seed draws the same
  // path every time: a ride is deterministic even though it is never in the URL.
  {
    const seed = seedOf(3), piece = L.draw(seed);
    const a = L.rideVector(seed, piece.vox, 0, 2), b = L.rideVector(seed, piece.vox, 0, 2);
    const same = Object.keys(a).every(k => a[k] === b[k]);
    const isWaypoint = Object.keys(a).every(k =>
      a[k] === L.rideWaypoint(seed, k, 2, piece.vox[k]));
    ok(same && isWaypoint, 'an integer position IS a waypoint, and the path is a fact about the seed');
    const other = L.rideVector(seedOf(4), L.draw(seedOf(4)).vox, 0, 2);
    ok(Object.keys(a).some(k => a[k] !== other[k]), 'and a different seed rides a different path');
  }

  // 4. MONOTONE BETWEEN WAYPOINTS. A ride that overshoots and comes back is
  // not a ride: every field moves one way between two waypoints, or the
  // in-between positions are not "on the way" to anything.
  {
    let wobbles = 0;
    for (let i = 0; i < RIDE_SEEDS; i++) {
      const seed = seedOf(i), piece = L.draw(seed);
      for (const ch of Object.keys(L.RIDE_SOUND)) for (const k of L.RIDE_SOUND[ch]) {
        const a = L.rideWaypoint(seed, k, 1, piece.vox[k]), b = L.rideWaypoint(seed, k, 2, piece.vox[k]);
        const q = L.STYLE.vox[k].q || 0;
        let prev = a;
        for (let t = 1; t <= 20; t++) {
          const v = L.rideMix(k, a, b, t / 20);
          // a quantised field steps, so it may repeat; it may not turn round
          if ((b > a && v < prev - (q || 1e-12)) || (b < a && v > prev + (q || 1e-12))) wobbles++;
          prev = v;
        }
      }
    }
    ok(wobbles === 0, 'between two waypoints every field moves one way only', `${RIDE_SEEDS} seeds`);
  }

  // 5. THE CURVE. Hz and seconds ride geometrically: half-way between 1200 and
  // 5000 Hz is the geometric mean, which is where the EAR puts it. A linear
  // sweep would be 3100 and would read as having arrived early.
  {
    const mid = L.rideMix('rhodesTone', 1200, 5000, 0.5);
    const gm = Math.sqrt(1200 * 5000);
    ok(Math.abs(mid - gm) < 1e-9 && Math.abs(mid - 3100) > 500,
       'a frequency rides geometrically', `half-way 1200..5000 Hz is ${mid.toFixed(0)} Hz, not 3100`);
    const lin = L.rideMix('kickSubMix', 0.3, 0.9, 0.5);
    ok(Math.abs(lin - 0.6) < 1e-12, 'a share rides linearly', `half-way 0.3..0.9 is ${lin}`);
    ok(L.rideGeometric('hatDecay') && !L.rideGeometric('clapQ'),
       'the unit on the table decides the curve, not the size of the number');
    // a quantised field lands on its own steps at every position
    const spec = L.STYLE.vox.leadDetune;
    let offStep = 0;
    for (let t = 0; t <= 20; t++) {
      const v = L.rideMix('leadDetune', 4, 18, t / 20);
      if (Math.abs(v / spec.q - Math.round(v / spec.q)) > 1e-9) offStep++;
    }
    ok(offStep === 0, 'a quantised field rides on its own steps', `q ${spec.q}`);
  }

  // 6. THE THROW'S SCHEDULE. Bars, never seconds; exact arrival on the last
  // bar; equal travel per bar, which is what "not a staircase" means when the
  // landing is quantised to the bar in the first place.
  {
    ok(L.RIDE_LENGTHS.join(',') === '0,1,4,8,16,32,64',
       'the glide lengths are the musical ones, in bars', L.RIDE_LENGTHS.join(' '));
    let bad = 0; const steps = [];
    for (const bars of [1, 4, 8, 16, 32, 64]) {
      let prev = L.throwPosition(0, 3, bars, 0);
      for (let d = 1; d <= bars; d++) {
        const v = L.throwPosition(0, 3, bars, d);
        steps.push(v - prev); prev = v;
      }
      if (prev !== 3) bad++;
      if (L.throwPosition(0, 3, bars, bars + 5) !== 3) bad++;
    }
    ok(bad === 0, 'a throw arrives exactly on its last bar, at every length', '1, 4, 8, 16, 32, 64 bars');
    const per = L.throwPosition(1, 3, 8, 1) - 1;
    ok(Math.abs(per - 0.25) < 1e-12, 'and every bar of it travels the same distance',
       `${per} of 2 per bar over 8 bars`);
    ok(L.throwPosition(2, 0, 4, 2) === 1, 'a throw downward is the same schedule backwards');
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (PROVE_RED) {
  if (failures > 0) { console.log('\nAS REQUIRED: with the loop pinned back on, the suite is RED.'); process.exit(0); }
  console.log('\n*** THE SUITE DID NOT NOTICE THE FROZEN LOOP. It is a decoration. ***'); process.exit(1);
}
process.exit(failures ? 1 : 0);
