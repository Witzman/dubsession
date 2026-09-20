# Changelog

## 2026-09-20 — the grid becomes playable: a cell is a pin

- **Click a cell on the bar and it pins.** The hit fires, or it stops, and the
  generator draws around it from then on. There is no pin modifier and no
  second mode: the cell cycles `drawn/empty → pinned (flipped) → released`, so
  three taps put it back and there is nothing to remember. The hit area is the
  whole cell, and at a touch pointer the row is taller — a cell is played with
  a finger on one of the two targets.
- **A pin outranks the manifest and not the arrangement.** A pinned hit fires
  without going through `chance`; a pinned hole never fires, and not under a
  tier 3 ghost either. But a channel the arrangement has rested is silent pins
  or not, and the row says which of the two is happening. A pin that overrode
  the arrangement would make "the generator draws around it" mean "the
  generator is off".
- **The fill says whether it sounds; the edge says whose it is.** A pinned hit
  is a light core inside a dark frame inside a light ring — a shape no other
  cell has, because a brighter block alone is the same object at arm's length.
  A hole you cut is a hollow square and is an OBJECT: if it looked like an
  empty cell, "for ever" would be an invisible promise.
- **Pins ride in the URL, readably:** `?seed=…&pins=0:x...x...x...x...` — `x`
  on, `.` off, `-` untouched. A bitmask would be shorter and would make a URL
  nobody can read or hand-edit, which is the opposite of what a seed line is
  for.
- **A pin survives a roll** — so the live count and `release pins` sit beside
  `roll`, and `roll`'s own caption says it will not take them. A state that
  outlives every roll with nothing on screen explaining it is a piece that
  stops changing for no visible reason.
- **A pin on a lane with its own cycle is pinned to the LANE's step**, so the
  column it appears in moves every bar — that is the polymeter, and the row
  says so in words rather than leaving it to be filed as a bug.
- **A rested row now actually draws rested.** The hatch and the inert marks
  shipped as a descendant selector over a flat grid, so they had never matched
  anything: a channel that had left the arrangement painted exactly like one
  that was playing.

## 2026-09-18 — every modulator has its own depth

- **The piece's five modulators are five controls**, in their own block under
  the room: the stab's echo and its room, the hats' level and their room, the
  pad's room. Each one is a multiplier on the depth its composer declared, and
  **x1.00 is that depth exactly** — the same shape the voice trims and the two
  send trims already use. Until now one fader moved all of them together, which
  is the pumping the reference warns about: eight things breathing on one clock
  is one thing breathing.
- **The rows are derived from the arrangement, never listed by hand.** A
  modulator can come from the manifest or from a movement event, and both are
  read; a list written out here would rot the first time a modulator is added.
- **What a row prints is the excursion, not the multiplier** — how far that
  modulator swings the send or the fader it is bound to, in the units of the
  thing it writes, already multiplied by the master above it. Two depths
  multiplying invisibly is exactly what a page should not do, so the product is
  the number on the page.
- **At x0 a modulator is held still and the row says `still`.** It sounds the
  same as not having it — measured, to 0.02 dB — but it is not the same fact:
  the composer's own depth of 0 removes a modulator, and a hand cannot.
- **A row the arrangement is not binding goes dead and says why.** With the
  ring off the movement's two modulators are not bound at all; those rows are
  drawn inert, read `——` and carry the reason on their own line rather than in
  a tooltip. The set of rows never changes: ink moves, layout does not.
- **`send modulation` is now `all modulation`, because the old name was
  false.** It scales the hats' LEVEL modulator as well as the two sends —
  measured: x0 to x1 moves that channel's bar-to-bar spread from 1.91 to
  5.72 dB. It stays, as the master over the five.
- **Two of the five are small, and that is said rather than hidden.** The
  stab's echo and the hats' level are the two that move a lot. The hats' room
  is the quiet one: doubling that channel's entire room send changes what comes
  out of it by 0.0002 dB, measured, so its trim is not going to be the control
  anybody reaches for. It is there because the arrangement binds that
  modulator, and the row says what it is doing.
- **A trim moved before the first note now reaches the engine.** `all
  modulation`, `echo send trim` and `room send trim` were missing from the list
  the page replays into a freshly built engine, so moving one on a cold page
  changed the surface and nothing else — measured, and fixed with the new trims
  in the same list.

## 2026-09-18 — the channels become a grid

- **Nine channels are nine rows and every control is a column.** The
  per-channel blocks are gone; the grid replaced them rather than sitting above
  them, because two surfaces telling one story disagree the first time one of
  them is changed. Nothing became unreachable: the fader, the level, the input
  gain, mute, solo, the five composition verbs with their sliders and their
  releases, LOCK, `release channel` and the reason line are all still there.
- **A column is named once.** The five verb names used to be printed under
  every channel — forty-five words of reading for nine values. They are a
  header now, in the same tracks as the rows, and the reason line got a name it
  never had.
- **One grid, three widths.** From 1260 px a channel is one line of eleven
  columns; down to 921 px the same tracks fold onto three lines so the columns
  still line up down all nine channels; under that the grid stacks, the header
  goes away and each cell says what it is again, because there are no columns
  left to name. Both numbers are measurements: the wide form needs 1188 px and
  a real 1280 desktop only has 1265 once its scrollbar is taken.
  The header and every row are laid out from the same two custom properties, so
  a column cannot drift between them.
- The four looks a control can have — held, waiting, running, dead — did not
  change and did not gain a fifth.

## 2026-09-18 — the voices are reachable while they play

- **Nine controls for what a channel SOUNDS like**, in their own block under
  the room: the kick's tune, decay and click; the clap's and the rimshot's
  tone; the sub's edge; the hats' corner, the stab's resonance and the pad's
  tone. Tuning the drums is the headline, and it was the thing asked for.
- **Every one is a trim on the recipe's own number, and x1.00 is the recipe
  exactly** — the same shape the echo and room send trims already use. The
  number inside the voice is the reference's opinion about this piece; a hand
  multiplies it rather than replacing it, which is why "back to the recipe" is
  a single figure and not a second copy of nine defaults.
- **The block says which controls are which.** The kit is set and left; the
  three filters are the ones worth moving mid-set. It is carried by position,
  the way this page carries every other distinction.
- **A trim lands on the next hit of that voice**, not on the next bar: a voice
  is built when it fires. That is also why none of them zippers.
- **Nothing about the default sound changed.** Measured against the previous
  build, two bars captured sample for sample and compared: the difference is
  -84.14 dBFS RMS, where the same build compared against ITSELF differs by
  -85.31 dBFS — the offline render's own spread, 65 dB under a programme at
  -18.97. Mix peak -5.26, RMS -18.97, unchanged.
- **Each control was measured at its ends, in the band it acts in** (4 bars,
  channel soloed, worst of two renders, dBFS RMS): kick tune 30-40 Hz -33.39 →
  -44.83; kick decay 20-120 Hz -31.53 → -23.99; kick click above 1.2 kHz -58.22
  → -48.92; clap tone 2.4-3.2 kHz -43.39 → -35.58; rim tune 2.6-3.2 kHz -58.40
  → -39.68; sub tone 200 Hz-4 kHz -73.70 → -45.53; hats tone 4-6 kHz -40.11 →
  -60.84; stab resonance 1-4 kHz -60.84 → -57.72; pad tone 3-8 kHz -45.27 →
  -41.84. Every range does something, and the pad's top was pulled in from
  x1.80 to x1.25 because past there it moved the corner and not the sound.
- **No control smuggles level in by the back door.** Whole mix with all nine at
  once: minimum peak -5.55 RMS -19.23, default -5.26 / -18.97, maximum -4.89 /
  -18.36. Nothing near the clip knee, and 0.66 dB of peak across the whole
  instrument's travel.

## 2026-09-18 — the gate is required, not advised

- The audio gate runs in CI against the built image on every pull request, and
  it is a required check on `main`. It was a command nobody had to run, which
  is the same fault this project already documented about the gate before it:
  a check that runs when somebody remembers it is advice.
- It runs green and then **red on purpose** in the same job. A gate only ever
  run in the direction where it passes is a decoration.

## 2026-09-18 — three controls that were already in there

- **Mute and solo, per channel.** Solo was implemented in the engine and
  unreachable from the page; mute is new and is a state rather than a fader at
  zero, so the fader keeps the position your hand set. Muting the kick leaves
  the rumble where it was — the rumble is the kick's tail and has its own
  button. Soloing takes the noise floor with it.
- **A channel that is not sounding says which of the two did it.** "muted by
  you" and "silent · 5 is soloed" are different sentences from "chance let
  nothing through", and a row that has simply gone quiet looks exactly like one
  that broke.
- **The seed is a control.** It was reachable only through `?seed=`, which cost
  a page reload and the audio context with it. A number or a word, `roll` for
  one nobody chose, and it lands on the next bar rather than tearing the one
  you are hearing. The URL follows, so a piece can be sent to somebody.

  Measured, 4 bars, auto on: whole mix peak −5.26 RMS −18.97; kick muted −7.51
  / −19.28; rumble muted −5.03 / −19.72; kick soloed −9.69 / −29.64; kick muted
  while the rumble is soloed −14.54 / −26.46, which is the rumble still playing
  with its trigger gone from the mix.

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
