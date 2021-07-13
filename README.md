# GeoplotRgui

Run GeoplotR from a web browser.

# Docker deployment

To get GeoplotRgui running on port 3820:

```sh
docker pull timband/geoplotr:beta
docker run --name geoplotr -p 3820:80 -d timband/geoplotr:beta
```

# Nginx stanza

If reverse-proxying to GeoplotRgui on a subpath, you need to
enable upgrading (to allow the websocket connection through)
abd to set the `SCRIPT_NAME` header to the subpath:

```
location /geoplotr/ {
    proxy_pass http://127.0.0.1:3820/; # the trailing / is important!
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header SCRIPT_NAME /geoplotr; # matches the subpath (without trailing /)
}
```
