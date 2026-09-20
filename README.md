# dubsession

[Play dubsession](https://witzman.de/dub/).

## The project

dubsession is a generative dub-techno instrument for the web. It draws a new
piece from a seed, then performs and synthesises that piece in the browser with
the Web Audio API. The same seed recalls the same piece; `roll` draws another.
It is designed for a desktop or an iPad and is played directly from the page —
there is no audio file or backing stream.

The instrument has nine channel strips: kick, rimshot, clap, hats, lead, sub,
stab, pad and rumble. A channel can follow the arrangement or be taken by the
player. The sixteen-column bar shows what is about to sound and distinguishes
the machine's steps from steps pinned by hand.

## How to play

Start at a modest listening level, open the live page, and press `start` to
allow the browser to create audio.

- Turn on `auto` if you want the arrangement to move through its scheduled
  sections. Leave it off when you want the current state to stay put.
- Use **THE STATION** as the mixer and performance surface. Each strip has
  mute/solo, material, level, density, tone and an echo/room plane. Material
  and space changes wait for the next bar; level, tone and mute respond now.
- Tap cells in **THE BAR** to pin hits on or off. Pins survive a new seed until
  you press `release pins`.
- Use **FIRE** for deliberate transitions. The larger gestures — drop,
  buildup, phase-out and reverb-out — run for the selected number of bars.
  The smaller buttons add one-bar punctuation. A queued gesture begins on the
  next bar.
- Enter a word or number beside `seed` and press `take it` to recall a piece,
  or press `roll` for a different one.
- Open a channel's `cycle · initiative` disclosure for its slower rhythmic,
  synthesis and modulation controls. The drawers below the instrument hold
  global room, arrangement and scheduling detail.
- Press `release all` to hand held performance controls back to the
  arrangement.

There is no single correct route through it: roll a piece, let `auto` establish
its movement, then take over only the channels or transitions you want.

## Hosting

**Everything here is served under the path `/dub/`, never `/`.** Apache on the
host owns `:443` for `witzman.de` and forwards `/dub` to this container with
the prefix intact. An asset URL, a route or a WebSocket path that begins `/`
resolves against the main site and 404s, and it does so only in production -
which is why the prefix is kept end to end rather than stripped at the proxy.

## Development

    docker build -t dubsession . && docker run --rm -p 8081:80 dubsession
    # then http://localhost:8081/dub/

A push to `main` builds and deploys automatically.
