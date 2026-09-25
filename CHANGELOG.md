# Changelog

## 2026-09-25 — the second deck, on the prototype stage only

- **`/v2/` now carries a fork of the instrument with a second deck.** A new
  `decks` drawer loads deck B from a seed, hands lanes between the decks one at
  a time and crossfades them with equal power. B is scheduled on A's grid, so the
  two are beatmatched, and it enters on a bar line. Two full decks do not keep
  real time (measured); the lanes are handed over rather than added, and with
  the lanes split the pair does.
- **Two more profiles and a neighbourhood, on `/v2/` only:** `hypnotic` and
  `hypnagogic`, with hand-set neighbours and an energy home for all seven.
- **`https://witzman.de/dub` is unchanged** apart from the bed level above.

## 2026-09-25 — a stage for the successor, under /v2/ on Pages

- **GitHub Pages now carries two things: the instrument at the site root, and a
  prototype stage at `/v2/`.** The workflow assembles the site instead of
  uploading one folder. `v2/` sits deliberately outside `public/`, because the
  Dockerfile copies `public/` wholesale and the container must carry exactly one
  thing.
- **Nothing about the deployed instrument changes.** `https://witzman.de/dub`
  is still the one deploy, still served from the container, still built from
  `public/dub`. Pages is not that deploy.

## 2026-09-22 — performance scheduler follows the hand

- **Auto is now the clock, not a fixed arrangement.** The current seed,
  profile and drawn material stay intact while performance buttons queue
  temporary actions on the next bar boundary; explicit return/release and
  replacement prevent actions from getting stuck.
- **The performance timeline is deterministic.** The same seed and button
  timeline resolve to the same arrangement, while auto-off still accepts
  deliberate fired actions.

## 2026-09-22 — per-piece programme level matching

- **A drawn piece now receives an asynchronously measured programme trim.** A
  one-bar offline preview estimates its RMS while the current bar continues;
  the gain is promoted on the next bar boundary, before saturation. The target
  is -20.5 dBFS with a 0.60–1.25 clamp. Eight fresh Chromium renders measured
  -20.50 to -20.33 dBFS after trim (0.18 dB spread); all trimmed peaks stayed
  below -5.78 dBFS. The trim remains at unity until its preview is ready.

## 2026-09-22 — drawn manifest schema

- **A new seed now selects a complete style shaped by the manifest.** Tempo,
  rhythm, melody, voice choices, space and arrangement are drawn from declared
  pools and ranges while the genre contract stays in force; the page still
  explains why a drawn channel is silent.
- **The draw is deterministic and isolated.** The same seed returns the same
  piece, different seeds produce different pieces, and changing one draw cannot
  alter the manifest or another piece.

## 2026-09-21 — manifest coordinate audit

- The draw now uses unique random coordinates for every declared voice,
  engine pool and lead degree. An unused duplicate voice schema was removed;
  seeds that draw a lead may choose a different motif note as a result.
- The composition suite checks manifest determinism, clone isolation, complete
  schema paths, coordinate collisions, 2,000-seed coverage and neighbour
  separation. `--prove-red-draw` pins the manifest and confirms the diversity
  checks fail.

## 2026-09-21 — manual key change

- **Root and scale are global performance controls.** A change during playback
  lands on the next bar; existing material is mapped by scale degree into the
  selected key at note time, so the piece is not redrawn.

## 2026-09-21 — two global pitch controls

- **Transpose and semi act on lead, sub, stab and pad.** Transpose moves by
  scale degrees over ±7; semi adds chromatic semitones over ±12. They affect
  new notes and leave notes already sounding alone.

## 2026-09-21 — voice recipes can be chosen by hand

- **Kick, rimshot, sub and stab recipes are selectable in their channel details.**
  The options come from the style's declared pools; weighted duplicates remain
  draw weights and do not appear as duplicate choices.
- **A choice made during playback is shown as pending and lands on the next
  bar.** Notes already sounding ring out on their existing voice. The sound die
  still draws a new recipe, and the hand's selection stays in force through
  numeric sound rides until the next die or seed.
- **Channels with one recipe say so and have no switch.**

## 2026-09-21 — nine musicians become one performance station

- **The flat desk is now nine channel strips.** Kick, rimshot, clap, hats,
  lead, sub, stab, pad and rumble keep the same order across desktop and iPad,
  but each now reads as one musician rather than one row in a parameter table.
- **Different gestures have different shapes.** Material is a rail, level is a
  fader, density is a segmented meter, tone is a dial and echo/room is a
  two-axis plane. The controls still address the same engine values; the
  station changes how they are found and played, not what they mean.
- **Slow controls live with their channel.** Cycle, initiative, tuning,
  detailed synthesis and modulation open from the relevant strip rather than
  from global voice and movement tables.
- **The public README now introduces the instrument and explains how to play
  it**, including bar pins, fired gestures, seeds, ownership and release.

## 2026-09-20 — material is a dimension: every channel rides, jumps and throws

- **Push a control and the material travels.** Sound, rhythm and melody are
  continuous controls, per channel, exactly like a filter is. Half-way between
  two kicks is a kick; half-way between two hat lanes is a hat lane; half-way
  between two basslines is a bassline in the same key. Push it back and the
  piece you started with returns, note for note.
- **A jump is the other gesture.** The dice for one channel: it lands somewhere
  unrelated, it is the only thing that may swap a recipe — the 909 for the
  boom, the dubstab for the rhodes, the sub's wave — and where it lands becomes
  the start of a new dimension to ride from.
- **A throw sets a target and a length in bars.** 1, 4, 8, 16, 32 or 64, per
  channel, and it glides there unattended while your hands are somewhere else.
  Every bar of the glide travels the same distance.
- **Nothing ever changes the bar you are hearing.** Every landing happens on a
  bar line before that bar is scheduled, and a slow generation can never
  overwrite something you asked for later.
- **A channel offers only what it has material for.** The sub has no timbre to
  ride and says `jump only`; the kick's pattern is a template, so its rhythm is
  a jump. A control that can do nothing is drawn dead.
- **A pinned step outranks a ride passing through it**, and a melody that would
  break the piece's own contract stops where the genre stops and says so.
- **A roll now reaches the voices.** Taking a new seed changed the patterns and
  left the SOUND behind: 31 of 38 drawn voice numbers never reached the engine,
  so a boom kick could be drawn while a 909 kept playing.

## 2026-09-20 — four trajectories and six one-bar gestures can be fired

- **Drop, buildup, phase-out and reverb-out are played from the surface.** Each
  one waits for the next bar, shows its length before it is pressed and says
  whether it will RETURN or LAND. A second large gesture replaces the first
  on a bar boundary; pressing the active one again cancels it there.
- **Drop takes the kick and sub away, buildup ratchets the hats from one to
  four onsets, phase-out removes the pad, and reverb-out sends the stab into
  the room.** Their progress is explicit timeline data, so live playback, a
  seek and an offline render resolve the same bar without replaying history.
- **The six existing per-bar mutations have buttons.** Ghost hat, hats out,
  bass octave, stab lean, turnaround and kick ghost use the same bounded
  mutation layer as the generative grain. Two may share a bar; a turnaround
  asked early waits for the end of the eight-bar phrase.
- **The hand still wins.** A held room send outranks reverb-out, `release all`
  clears every fired and held state, and no gesture redraws a bar already in
  flight.

## 2026-09-20 — the desk becomes pane 2 of the sheet

- **The mixer stops being a website with sliders.** The nine channel rows were
  the last part of the page wearing a label beside a slider beside a readout,
  nine times over. They are now the same nine rows as the bar above them, in
  the same order, with the same name column and the same reason column: two
  panes of one sheet, not two grids that happen to look alike.
- **A value you can move is one object.** Every continuous control on the desk
  is the strip the drawers already use — a track with the number printed
  inside it and a meter along its bottom edge. Nothing is drawn twice: the
  fader's number lives *in* the fader, and the column beside it now carries the
  channel's input trim, which is a different fact.
- **Motion is a range, not a moving number.** Where a modulator is writing a
  value, the number stays the base — the one your hand owns — and the
  modulator draws as a span behind it with a tick showing where it is right
  now. `0.44▸0.51` is gone: a number that changes five times a second cannot
  be aimed at.
- **What is about to change is visible before it changes.** A composition verb
  you move goes dashed with an arrow until the bar comes round, and the `×`
  beside it cancels. What lands now — the fader, mute, solo — never does that,
  and the line at the top of the pane says which is which once.
- **A fader can hold the level the piece drew.** It could not before: the
  control snapped to the nearest 0.005 while the row printed the piece's own
  four-decimal number, so the two disagreed and the first pixel of a drag
  moved the sound to a value nothing had shown. A fader away from the manifest
  is now marked as yours, and `faders back to the manifest` is the way back.
- **A row that cannot do something still looks dead**, in the same dotted
  drawing the rest of the page uses, and every row that is not sounding says
  why in its tail — in the same column the bar pane says it in.

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
