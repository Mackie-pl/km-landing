# km — landing page

Static landing page for [km](https://github.com/Mackie-pl/km). It pulls the
**latest GitHub Release** client-side and renders per-platform download links,
so it updates automatically on every new tag — no rebuild required.

- `index.html` / `styles.css` / `app.js` — the whole site (no build step)
- `.github/workflows/pages.yml` — deploys to GitHub Pages on push to `main`

## Configuration

Two things to set:

1. **`app.js` → `CONFIG.appUrl`** — the URL of the deployed web app
   (set to `https://app.kmflow.xyz`). `CONFIG.repo` is `Mackie-pl/km`.
2. **Repo variable `ROOT_DOMAIN`** — the apex domain `kmflow.xyz`. Set it under
   *Settings → Secrets and variables → Actions → Variables*. When set, the
   workflow writes a `CNAME` automatically.

## One-time GitHub setup

1. Create the repo on GitHub and push this folder.
2. *Settings → Pages → Source* → **GitHub Actions**.
3. (Custom domain) Add DNS for the apex domain — for GitHub Pages apex domains
   use the four `A` records (or `ALIAS`/`ANAME` if your DNS supports it), then
   set the domain under *Settings → Pages* and enable **Enforce HTTPS**.
4. Push to `main` to deploy.

## How downloads work

The page calls `https://api.github.com/repos/Mackie-pl/km/releases/latest` and
classifies each asset by filename (`.msi`/`.exe` → Windows, `.dmg` → macOS,
`.AppImage`/`.deb` → Linux, `.apk` → Android). Binaries are served by GitHub
Releases, not from this site.
