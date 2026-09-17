# Changelog

## Unreleased

**2026-09-17 — the instrument makes a sound, and it is not an invented one.**

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
