# BeyngLab

Static website. Repository: https://github.com/milansegedinac/BeyngLab

## Structure

- `index.html` — site entry point
- `assets/` — shared assets
- `atlas/`, `breakdown/`, `cosmograms/`, `essays/`, `hot-house/`, `paths/`, `petes-corner/`, `plates/`, `topoi/`, `turns/`, `workshops/` — site sections

## Getting started

```bash
git clone https://github.com/milansegedinac/BeyngLab.git
cd BeyngLab
```

Open `index.html` in a browser, or serve the folder with any static file server.

## Publishing

The site is served by GitHub Pages from the `gh-pages` branch at https://milansegedinac.github.io/BeyngLab/

After editing anything in `assets/`, refresh the cache-busting stamps on every page, then push both branches:

```bash
python tools/stamp-assets.py
git push origin main
git push origin main:gh-pages
```
