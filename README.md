# UELE — Engineering Visualization World (EV-World)

Interactive 3D engineering-visualization world built with React + Three.js: a
6km × 6km procedurally generated site with drive / walk / drone exploration
modes, bridges, a dam, an airport, an HSR viaduct, a port, a wind farm, a
village, and farmland.

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:3000`).

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy to GitHub Pages (`EV-World` repo)

This project is configured to be served from
`https://engineeringvisuallab.github.io/EV-World/` — `vite.config.ts` sets
`base: '/EV-World/'` to match. If you fork/rename the repo, update `base` to
match your new path (or set it to `/` if you're deploying to a custom domain
or a `username.github.io` root repo).

**Option A — GitHub Actions (recommended):**

1. Push this project to the `EV-World` repo on the `engineeringvisuallab`
   GitHub account (or your own — see the `base` note above).
2. In the repo settings, go to **Settings → Pages → Build and deployment**
   and set **Source** to "GitHub Actions".
3. Add `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

4. Push to `main` — the site publishes automatically to
   `https://engineeringvisuallab.github.io/EV-World/`.

**Option B — manual `gh-pages` branch:**

```bash
npm run build
npx gh-pages -d dist
```

Then set **Settings → Pages → Source** to the `gh-pages` branch.

## Controls

- **Drive mode:** Arrow keys / WASD to drive, `C` to cycle camera, `L` for
  headlights, `F`/`E` to exit the vehicle.
- **Walk mode:** WASD to walk, `C` to toggle first/third person, `F`/`E` to
  re-enter the vehicle when close enough.
- **Mouse:** drag to orbit the camera, scroll to zoom.
