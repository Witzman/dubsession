# Static for now. The scope is not set, so this ships the one thing that can be
# verified without it: that the whole path - push, build, Traefik, Apache,
# /dub/ - actually carries bytes to a browser.
FROM nginx:1.27-alpine
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
