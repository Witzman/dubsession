# Changelog

## 2026-09-18 — a measurement can tell quiet from broken

- `renderOffline` reports which channels are silent and why, beside the peak.
  Nothing audible changed: it is the hook a measurement needs to tell a
  channel that is quiet on purpose from one that went quiet with nothing
  explaining it.

## 2026-09-18 — the noise floor

A bed that never stops, and a switch for it.

- Hiss, crackle and hum are not a byproduct of this genre, they are part
  of it: a patch with no noise floor sounds like a demo of an oscillator.
  Three passes over one eight-second buffer, built once and looped for
  ever — air, dust and a second slower record. Nothing allocates per bar.
- **On by default, one slider from off.** The surface's `noise floor` is a
  trim on it.
- It does not eat the bottom end. Measured inside 30–120 Hz, the mix reads
  RMS −15.70 dBFS with the bed off and −15.71 with it on; the bed's own
  energy in that band is −61.69 dBFS. The finisher's soft-clip knee is at
  −2.50 dBFS and the worst peak measured is −5.02, so the air is untouched.
- The loop seam is 110× smaller than the sharpest dust tick, which is to
  say it is not a seam.

## 2026-09-18 — the material moves

The loop was 46 seconds long and is now eight and a half minutes.

- The piece has a **composition layer** above the bar: a phrase of 8 bars and a
  section of 32, one perceptible change per section, eight sections to a
  movement. Until now the notes repeated every 1.92 s and only two sends and one
  level moved; the whole state of the page — pattern and modulation together —
  returned to itself every 24 bars.
- **The state at bar N is a pure function of (seed, N).** No counters and no
  memory of the previous bar, so any bar can be reached directly. That is what
  makes seek possible and it bounds memory by construction rather than by
  policing.
- A **seed**, from the `?seed=` query, and a word works as well as a number.
  The same seed is the same eight and a half minutes, every time.
- A **seek**, so the exit at 7:10 can be heard without waiting seven minutes.
- The channels gained `chance`, `move` and `phrase`: how often a step fires, how
  often the machine may touch the channel at all, and the length of its own
  phrase. Lengths that disagree are the point — three against five comes round
  every fifteen bars.
- Modulators can be **bound and unbound per channel** at runtime, and the rate
  list gained 5, 7, 11, 13, 32 and 64 bars. The odd ones are what stop the
  modulators agreeing with each other: three, four and eight bars realign every
  24; adding seven and thirty-two pushes that past the length of the movement.
- The **chord walker** moves the root by scale degrees over bars, reflecting at
  the edge of its span rather than parking against it. A negative span may only
  go below the tonic — unsigned, half of all seeds put the movement into a
  diminished triad for two minutes.
- A silent channel still says why it is silent. A channel whose chance can only
  ever be rolled once now records the reason rather than going quiet with
  nothing explaining it.

## 2026-09-17 — the instrument makes a sound, and it is not an invented one

- Serves at `/dub/` itself. There is one deployed thing; versions are kept
  outside this repository rather than offered as a menu.
- The voices are built from a reference renderer's architecture and parameters
  — envelope times, filter corners, oscillator counts, bus topology — and not
  from whatever sounded reasonable. Nothing is copied: what carries is the
  description of a sound and the shape of a graph.
- The material is one piece from the parent project's dub round, taken
  verbatim: its euclidean drum lines, its chord takes, its send amounts and its
  faders.
- Nine faders, starting where that piece put them, upstream of the master
  chain, so pulling a channel down makes it quieter rather than changing the
  compressor's mind.
- A kick-triggered low-end wash, ducked by the dry kick, at twice the
  reference's ceiling — measured, the sub sat 9.4 dB above it in its own band.
- The kick sidechain starts at 0. Measured, it does not deepen the wash's gap,
  and the source material has no ducking anywhere in it.

Measured on the deployed page: peak −4.81 dBFS, RMS −17.94 dBFS.
