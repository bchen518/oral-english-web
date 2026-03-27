# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Prepend to all commands — git, gh, and node are not on the default bash PATH
PATH="/c/Program Files/Git/bin:/c/Program Files/GitHub CLI:/c/Program Files/nodejs:$PATH"

npm install          # install dependencies
npm run dev          # local dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # serve dist/ locally to verify the build
```

There is no linter or test suite configured.

## Git workflow

Commit and push to GitHub after every meaningful unit of work — a completed feature, a bug fix, a content change. Never leave work uncommitted at the end of a session.

```bash
git add <changed files>
git commit -m "concise description of what changed and why"
git push
```

Commit message conventions used in this repo:
- `feat:` new feature or content (e.g. `feat: add business English lesson`)
- `fix:` bug fix (e.g. `fix: recorder not resetting between sentences`)
- `style:` visual/CSS changes only
- `ci:` changes to the GitHub Actions workflow
- `docs:` documentation only

Push frequently so progress is never lost and any change can be reverted with `git revert <hash>`.

## Deploying

Every push to `main` automatically builds and deploys via GitHub Actions (`.github/workflows/deploy.yml`).

**Live URL:** https://bchen518.github.io/oral-english-web/

To push a change live:
```bash
git add <files>
git commit -m "message"
git push
```

The `vite.config.js` sets `base: '/oral-english-web/'` — this is required for GitHub Pages asset paths and must not be removed.

## Architecture

### Routing
There is no router library. `App.jsx` holds a `screen` state (`'home' | 'list' | 'practice'`) and conditionally renders one of three full-page components. Navigation is done by passing callbacks (`onBack`, `onSelectLesson`, `onBrowse`) down as props.

### Data
All lesson content lives in `src/data/lessons.js` as a plain array of objects. Each lesson has `{ id, title, level, topic, sentences[] }`. The `LEVELS` constant in the same file defines the color/label metadata for each level key. **Adding or editing lessons only requires editing this one file.**

### Hooks
Two custom hooks encapsulate all browser API interaction — components never touch `speechSynthesis` or `MediaRecorder` directly:

- **`useTTS`** (`src/hooks/useTTS.js`) — wraps `window.speechSynthesis`. Voice selection tries a prioritised list of known female en-US voice name fragments (`samantha`, `zira`, `aria`, …) then falls back to any en-US voice. Exposes `speak(text, rate)` where `rate` is 0–1 and is remapped internally to the Web Speech API range of 0.5–1.4. Word-boundary highlighting is driven by `utterance.onboundary`; this only fires reliably in Chrome/Edge — the UI degrades gracefully on other browsers. Consumers attach a post-speech callback via `onFinishedRef.current = fn` rather than a prop to avoid stale-closure issues.

- **`useRecorder`** (`src/hooks/useRecorder.js`) — wraps `MediaRecorder`. Prefers AAC → webm/opus → webm → ogg mime types. The recording is stored as a blob URL in a ref; `reset()` clears it. `permissionState` (`'unknown' | 'granted' | 'denied'`) is used by the UI to show a warning banner.

### Practice flow (PracticePage)
The core screen is a state machine with five phases: `idle → listening → waitingToRepeat → recording → recorded`. Phase transitions:
- On mount / sentence change: auto-calls `listenToSentence()` after 300 ms → `listening`
- TTS finishes (`onFinishedRef` callback): `listening → waitingToRepeat`
- Record button pressed: `→ recording`; pressed again: `→ recorded`
- Next/Prev: resets recorder, increments/decrements `idx`, restarts the cycle

### Styling
All styles are in a single `src/index.css` using plain CSS with custom properties (`--blue`, `--radius`, `--shadow`, etc.). No CSS framework or CSS modules. Layout uses `max-width: 640px` centred column (`app-shell`) so the app looks like a mobile app on desktop. Component-specific class names follow a loose BEM convention (e.g. `.sentence-card`, `.sentence-card--active`).
