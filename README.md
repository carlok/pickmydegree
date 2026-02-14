# Pick My Degree — Tournament-Based Degree Chooser

A mobile-first web application that helps undecided high school students choose their university degree through structured tournament-style comparisons.

![Screenshot](screenshot.png) (Place a screenshot here after running)

## Quick Start — All commands run in Docker

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
| Install dependencies | `docker compose run --rm dev sh -c "npm install"` |
| Build for production | `docker compose run --rm dev sh -c "npm install && npm run build"` |
| Preview production build (after building) | `docker compose run --rm -p 4173:4173 dev sh -c "npm install && npm run build && npm run preview -- --host"` |

Production build and serve is still best done with `docker compose up --build app`, which uses the Dockerfile (multi-stage build + Nginx).

**Using Make:** If you have `make`, you can run `make dev`, `make app`, `make build`, or `make install`; each runs the corresponding command inside Docker.

## Development: reset saved state (localStorage)

Progress is stored in the browser (localStorage). To clear it in dev:

1. **In the app:** On the Welcome screen, click **“Reset saved progress”** (below the Start button). That clears the saved game and stays on Welcome.
2. **In the browser console:** Run  
   `localStorage.removeItem('pick-my-degree-v1')`  
   then refresh the page.

## Architecture

- **Framework**: Vue 3 (Composition API) + Vite
- **UI**: Bootstrap 5 + Custom SCSS (Glassmorphism Dark Theme)
- **State Management**: `useGameEngine` composable (reactive state machine)
- **Persistence**: `useDataStore` composable (localStorage adapter, readiness for API)
- **Localization**: `vue-i18n` (English 🇬🇧 / Italian 🇮🇹)
- **Share**: `html2canvas` for client-side result export

## Project Structure

```
src/
├── assets/             # SCSS theme, global styles
├── components/         # Vue UI components (Phase1Filter, Phase2Pairs, etc.)
├── composables/        # Business logic (Game Engine, Tournament Math)
├── data/               # degrees.json (bilingual content)
├── i18n/               # Localization files (en.json, it.json)
├── App.vue             # Main shell
└── main.js             # App entry point
```

## Degree catalog (university input data)

**Location:** [`src/data/degrees.json`](src/data/degrees.json)

That JSON file is the single source of degree programs used in the tournament. Each entry has `id`, `icon`, `category`, `name` (per locale), `description` (per locale), and optional `tags`. Add or edit entries there; the app and game engine read it at build/load time.

## Adding New Degrees

Edit `src/data/degrees.json`. Ensure you add both English (`en`) and Italian (`it`) translations for names and descriptions.

## Adding New Languages

1. Create a new locale file in `src/i18n/` (e.g., `es.json`).
2. Update `src/i18n/index.js` to import and register the new locale.
3. Update `degrees.json` to include the new language strings.
