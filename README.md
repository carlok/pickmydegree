# Pick My Degree — Tournament-Based Degree Chooser

A mobile-first web application that helps undecided high school students choose their university degree through structured tournament-style comparisons.

<!--![Screenshot](screenshot.png) (Place a screenshot here after running)-->

## Quick Start — All commands run in Docker

If you run npm locally (e.g. `npm run build`, `npm run surge`), use **Node 22** first: `nvm use 22` or `nvm use` (this repo has an `.nvmrc`; `package.json` requires Node 22 or later, and the Docker images use it too).

Run the development server (hot reload):

```bash
docker compose up dev
```

App: [http://localhost:5173](http://localhost:5173).

Build and serve the production build (Nginx):

```bash
docker compose up --build app
```

App: [http://localhost:8080](http://localhost:8080).

## Running other commands inside Docker

Use the `dev` service so every command runs in the same Node environment:

| What | Command |
|------|---------|
| Install dependencies | `docker compose run --rm dev sh -c "npm ci"` |
| Build for production | `docker compose run --rm dev sh -c "npm ci && npm run build"` |
| Preview production build (after building) | `docker compose run --rm -p 4173:4173 dev sh -c "npm ci && npm run build && npm run preview -- --host"` |

Production build and serve is still best done with `docker compose up --build app`, which uses the Dockerfile (multi-stage build + Nginx).

**Using Make:** If you have `make`, you can run `make dev`, `make app`, `make build`, or `make install`; each runs the corresponding command inside Docker.

## Saved state (localStorage)

Progress is stored in the browser (localStorage, key `pick-my-degree-v1`) as degree ids plus a schema version (`v`), so edits to `degrees.json` apply on the next load and ids that no longer exist are dropped. To clear it:

1. **In the app:** when a game was left in progress (via Home), the Welcome screen shows **“Reset saved progress”**. It asks for confirmation, then clears the game.
2. **In the browser console:** run `localStorage.removeItem('pick-my-degree-v1')` and refresh.

The language choice (`pick-my-degree-locale`) and the sound setting (`pick-my-degree-sound`) are kept separately.

## Architecture

- **Framework**: Vue 3 (Composition API) + Vite
- **UI**: Bootstrap 5 + Custom SCSS (Glassmorphism Dark Theme)
- **State Management**: `useGameEngine` composable (reactive state machine)
- **Persistence**: `useDataStore` composable (localStorage adapter, readiness for API)
- **Localization**: `vue-i18n` (English / Italian); the choice is remembered
- **Share**: `html2canvas` for client-side result export (loaded only on the Results screen, like `canvas-confetti`)
- **Fonts**: Montserrat, self-hosted through `@fontsource-variable/montserrat` (no request to Google)

## Project Structure

```
src/
├── assets/             # SCSS theme, global styles
├── components/         # Vue UI components (Phase1Filter, Phase2Pairs, etc.)
├── composables/        # Business logic (Game Engine, Tournament Math)
├── data/               # degrees.json (bilingual content) + index.js (core list, lazy text)
├── i18n/               # Localization files (en.json, it.json)
├── App.vue             # Main shell
└── main.js             # App entry point
```

## Degree catalog (university input data)

**Location:** [`src/data/degrees.json`](src/data/degrees.json)

That JSON file is the single source of degree programs used in the tournament. Each entry has `id`, `icon`, `category`, `name` (per locale), `description` (per locale), and `tags` (3 per locale). Optional: `university` (array of `polito` / `unito`) and `url` (object keyed by university, `https://` links to the course page). Add or edit entries there.

At build time a small Vite plugin (`degreeData` in `vite.config.js`) splits it: the game loads only ids, icons, categories and names up front, and the descriptions and tags come in per language when someone taps a “?”. You keep editing one file; `tests/unit/degreesData.test.js` checks its structure (unique ids, both languages, 3 tags each, a label for every category).

**Keeping the catalogue current** is a separate subproject in [`catalog/`](catalog/) (fetches the official PoliTo and MUR open data and reports differences). It is not part of the site build.

## Adding New Degrees

Edit `src/data/degrees.json`. Ensure you add both English (`en`) and Italian (`it`) translations for names and descriptions.

## Adding New Languages

1. Create a new locale file in `src/i18n/` (e.g., `es.json`).
2. Update `src/i18n/index.js` to import and register the new locale.
3. Update `degrees.json` to include the new language strings, then add the language to the `loaders` in `src/data/index.js` and to the `TEXT` pattern in the `degreeData` plugin of `vite.config.js`.
