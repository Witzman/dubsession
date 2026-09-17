# dubsession

Served at <https://witzman.de/dub/>.

**Everything here is served under the path `/dub/`, never `/`.** Apache on the
host owns `:443` for `witzman.de` and forwards `/dub` to this container with
the prefix intact. An asset URL, a route or a WebSocket path that begins `/`
resolves against the main site and 404s, and it does so only in production -
which is why the prefix is kept end to end rather than stripped at the proxy.

## Development

    docker build -t dubsession . && docker run --rm -p 8081:80 dubsession
    # then http://localhost:8081/dub/

A push to `main` builds and deploys automatically.
