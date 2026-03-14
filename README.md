# Netflix Remote Control via Puppeteer

Control Netflix (and, in the future, other streaming services) from a Bluetooth remote, keyboard, or any input device — without touching the mouse. The project uses a headless-capable Chrome instance driven by Puppeteer to intercept keystrokes and translate them into precise DOM interactions that the Netflix player would normally only respond to via mouse hover and click.

---

## Table of Contents

1. [Purpose](#purpose)
2. [Architecture](#architecture)
3. [Key Challenges and Solutions](#key-challenges-and-solutions)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Running](#running)
8. [Keyboard / Remote Control Mapping](#keyboard--remote-control-mapping)
9. [Project Structure](#project-structure)
10. [Known Limitations](#known-limitations)
11. [Future Work](#future-work)

---

## Purpose

Streaming service UIs are designed around mouse interaction. Menus appear only on hover, items are highlighted only on mouse-over, and selections are made by click. This makes them essentially unusable from a Bluetooth remote that sends keyboard events.

This project bridges that gap by running a Puppeteer-controlled Chrome browser that:

- Listens for keyboard events fired inside the Netflix page.
- Intercepts those events before Netflix's own handlers can act on them.
- Translates them into Puppeteer `mouse.move()` / `mouse.down()` / `mouse.up()` calls that trigger the same hover-and-click flows Netflix expects.

The result is a Netflix player that can be navigated end-to-end from a remote with basic directional, select, and media keys.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Node.js process (startup5.js)                       │
│                                                       │
│  ┌──────────────┐    exposeFunction()   ┌──────────┐ │
│  │  Puppeteer   │ ◄──callPuppeteer()─── │  Page    │ │
│  │  handlers    │                       │  keyup   │ │
│  │  (Node side) │ ───mouse.move()──────►│  listener│ │
│  └──────────────┘    page.evaluate()   └──────────┘ │
│                                                       │
│  State held in Node:                                  │
│    languageMenuOpen, menuSidesPosition,               │
│    menuLanguagesPosition, menuSubtitlesPosition, pos  │
└─────────────────────────────────────────────────────┘
         │ Chrome DevTools Protocol (CDP)
         ▼
┌─────────────────────────────────────────────────────┐
│  Chrome browser  (non-headless)                      │
│  netflix.com/watch/<id>                              │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Netflix SPA                                    │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ div[data-uia="selector-audio-subtitle"]   │  │  │
│  │  │   ├── div > ul  (audio / language list)   │  │  │
│  │  │   └── div > ul  (subtitles list)          │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data flow

1. The user presses a key on their remote (mapped to keyboard keys).
2. Chrome fires a `keyup` event on `document`.
3. The page-side capture-phase listener (`window.__netflixKeyHandler`) checks whether the audio/subtitle panel is open.
4. If the panel is open (or `n` was pressed), the event is stopped with `stopImmediatePropagation` + `preventDefault` so Netflix never sees it, and `callPuppeteer(key, menuState)` is called.
5. `callPuppeteer` is a function exposed into the page by Puppeteer's `page.exposeFunction()`. It runs in Node and can freely use the full Puppeteer API.
6. Puppeteer updates its position tracking state and issues `page.mouse.move()` to highlight the target item, or `page.mouse.down()` / `page.mouse.up()` to click it.

---

## Key Challenges and Solutions

### Challenge 1 — The subtitle/language panel closes when the mouse moves

**Root cause:** Netflix attaches `mouseleave` listeners to the panel's container. As soon as Puppeteer's virtual mouse cursor drifts (or the real physical mouse moves even slightly), the event fires and Netflix removes the panel's DOM nodes.

**Solution (Fix A — `MutationObserver` guardian):**

After the panel opens, a `MutationObserver` is installed on the panel's grandparent element. If Netflix removes `pel1` or `pel2` (the two ancestor nodes it controls) while `window.__netflixMenuAllowRemoval` is `false`, the observer immediately re-inserts them at their original position. This makes the panel effectively sticky until the user explicitly closes it (at which point `closeMenu()` sets the flag to `true` before removing the nodes, and disconnects the observer). The observer is stored on `window.__netflixMenuObserver` so it survives across `page.evaluate()` calls.

```js
// Simplified excerpt
const observer = new MutationObserver((mutations) => {
  if (window.__netflixMenuAllowRemoval) return;
  mutations.forEach((m) => {
    m.removedNodes.forEach((node) => {
      if (node === pel1) origParent1.insertBefore(pel1, origSibling1);
      else if (node === pel2) origParent2.insertBefore(pel2, origSibling2);
    });
  });
});
observer.observe(origParent1, { childList: true });
```

### Challenge 2 — Scrolling a long list breaks item selection

**Root cause:** The original code used `page.mouse.wheel({ deltaY })` to scroll lists. This has two problems:

1. `mouse.wheel()` sends the scroll event to whatever element the virtual cursor currently hovers. After the scroll, the cursor position no longer corresponds to the previously highlighted item, so hover-highlighting jumps unpredictably.
2. The position counter (`menuSubtitlesPosition`) was unconditionally reset to `0` after every wheel operation, losing track of where the user actually was.

**Solution (Fix B — `scrollIntoView` via `page.evaluate`):**

All scrolling is now done with `Element.scrollIntoView({ block: 'nearest', behavior: 'instant' })` inside `page.evaluate()`. This is a pure DOM operation — it never moves the mouse cursor. After the scroll, the item's fresh on-screen coordinates are queried and returned to Node, and only then is `page.mouse.move()` called to place the cursor precisely on the now-visible row.

```js
// scrollToItem() — simplified
items[tIdx].scrollIntoView({ block: 'nearest', behavior: 'instant' });
const r = items[tIdx].getBoundingClientRect();
return { x: r.x, y: r.y };
// back in Node:
await page.mouse.move(freshPos.x + 5, freshPos.y + 5);
```

### Challenge 3 — Event listener accumulation and stale closures

**Root cause:** The original code registered a new `keyup` listener inside the `MutationObserver` callback every time the panel was re-inserted, and the listeners captured a stale `lmenuopen` boolean that could diverge from the actual state.

**Solution:**

- The page-side listener is stored on `window.__netflixKeyHandler` and the old one is always removed with `removeEventListener` before a new one is added.
- All state (`languageMenuOpen`, position counters) is kept exclusively in Node (Puppeteer side). The page only reports raw key names; it never makes decisions about menu state.

### Challenge 4 — Netflix intercepts arrow keys before Puppeteer sees them

**Root cause:** Netflix's own SPA registers `keydown`/`keyup` listeners that handle arrow keys for seek and volume. They fire before our listener unless we register in the capture phase.

**Solution:** The page-side listener is registered with `{ capture: true }` (the third argument to `addEventListener`). Capture-phase listeners fire before any bubble-phase listener on any descendant, giving us first access to every keystroke.

### Challenge 5 — Cursor initialisation on re-open

**Root cause:** When the panel was opened, the cursor was not positioned on any item, so the first arrow key press always jumped to position 0 regardless of what was already selected.

**Solution:** `toggleLanguageMenu()` calls `processNextMenuItem('__init__')` after the panel appears. This special token causes the function to read the active (checkmarked) row index from the DOM and immediately move the cursor there, giving the user a sensible starting point every time.

---

## Prerequisites

| Requirement | Version / Notes |
|-------------|-----------------|
| Node.js | v18 or later (ES Modules required) |
| npm | v9 or later |
| Google Chrome | Any recent stable release (`channel: 'chrome'` in Puppeteer config) |
| macOS / Windows / Linux | Tested on macOS and Windows |

A **Netflix account** with access to the title you want to watch is required. Free-tier or trial accounts are sufficient.

---

## Installation

```bash
# 1. Clone or download the project
git clone https://github.com/your-username/auto_mystreme.git
cd auto_mystreme

# 2. Install Node dependencies
npm install
```

Puppeteer will **not** download its own bundled Chromium because the project uses `channel: 'chrome'`, which points at your existing system Chrome installation. Make sure Chrome is installed before running.

---

## Configuration

Open `startup5.js` and replace the placeholder credentials near the top of the `.then()` block:

```js
await page.type('input[name="userLoginId"]', 'YOUR_EMAIL@example.com');
await page.type('input[name="password"]',    'YOUR_PASSWORD');
```

> **Security note:** Avoid committing credentials to source control. A better approach is to read them from environment variables:
>
> ```js
> await page.type('input[name="userLoginId"]', process.env.NETFLIX_EMAIL);
> await page.type('input[name="password"]',    process.env.NETFLIX_PASSWORD);
> ```

Also update the `page.goto()` call to the Netflix watch URL for the title you want:

```js
await page.goto('https://www.netflix.com/watch/<TITLE_ID>');
```

---

## Running

```bash
npm start
# equivalent to: node startup5.js
```

Chrome will open, log in to Netflix, and navigate to the configured title. Focus the Chrome window and use the keyboard (or Bluetooth remote) to control playback.

---

## Keyboard / Remote Control Mapping

| Key | Action |
|-----|--------|
| `n` | Open / re-open the audio & subtitle panel |
| `Arrow Left` / `Arrow Right` | Switch between the Audio and Subtitle columns |
| `Arrow Up` / `Arrow Down` | Move one item up / down in the active column |
| `Enter` | Select the highlighted item |
| `x` | Close the audio & subtitle panel |
| `z` | Play / Pause |
| `o` | Toggle fullscreen |
| `a` | Seek back 10 seconds |
| `s` | Seek forward 10 seconds |
| `+` | Volume up |
| `-` | Volume down |
| `Backspace` | Go back to the Netflix home page |
| `1` | Set playback speed 0.5× |
| `2` | Set playback speed 0.75× |
| `3` | Set playback speed 1× (normal) |
| `4` | Set playback speed 1.25× |
| `5` | Set playback speed 1.5× |

---

## Project Structure

```
auto_mystreme/
├── startup5.js          ← Main entry point (Netflix remote control)
├── startup.js           ← Legacy entry point (connects to an external mystreme.ai instance)
├── startup2.cjs         ← Older CommonJS prototype (not in active use)
├── startup4.js          ← Intermediate prototype (not in active use)
├── myCodeSample.js      ← Standalone code snippets / experiments
├── package.json
├── package-lock.json
├── startup.command      ← macOS double-click launcher (startup.js)
├── startup_autoplay.command ← macOS double-click launcher with autoplay flag
└── services/            ← Per-service login and navigation handlers
    ├── netflix.js       ← Netflix login + play-button helper
    ├── amazon.js        ← Amazon Prime Video (stub — not yet functional)
    ├── appletv.js       ← Apple TV+ (stub — not yet functional)
    ├── disney.js        ← Disney+ (stub — not yet functional)
    └── google.js        ← Google Play / YouTube (stub — not yet functional)
```

---

## Known Limitations

- **SVG path index fragility:** Control bar icons are located by their index in a `querySelectorAll('path[fill-rule="evenodd"][clip-rule="evenodd"]')` result set. Netflix may change this index when it updates its player UI. The index is currently `5` for the subtitle button and `4` for the volume button.
- **Physical mouse interference:** The `MutationObserver` prevents accidental closure from the virtual cursor, but if the user physically moves their laptop's mouse over the panel border, Netflix's own `mouseleave` handler will still fire. The observer will re-insert the panel, but there may be a brief visual flicker.
- **Single profile:** The login flow clicks the first profile link it finds. Multi-profile households will always land on the first profile.
- **No DRM / Widevine considerations:** This project does not modify or circumvent DRM. All it does is automate UI interaction in a normal Chrome session. Credentials and watch history are processed by Netflix's own servers.

---

## Future Work

### Netflix

- **Config file / `.env` support** — Read credentials and the target watch URL from a `.env` file instead of hard-coding them.
- **Profile selection** — Accept a profile name as a command-line argument and click the matching profile tile after login.
- **Robust icon discovery** — Replace SVG path index heuristics with `aria-label` or `data-uia` attribute selectors if Netflix exposes them, making the code immune to player UI updates.
- **Physical mouse coexistence** — Investigate suppressing `mouseleave` events on the panel container (via `addEventListener` with `useCapture` and `preventDefault`) so the panel stays open even when the physical mouse accidentally moves over the panel edge.
- **Next episode / episode list navigation** — Map remote keys to the "next episode" button and the episode-picker panel.
- **Bluetooth remote pairing guide** — Document how to map a generic Bluetooth remote's buttons to the keyboard keys listed in the mapping table above (e.g., using `BetterTouchTool` on macOS or `xdotool` on Linux).

### Other Streaming Services

The `services/` directory contains stubs for Amazon Prime Video, Apple TV+, Disney+, and Google Play. Each needs:

1. **Login flow** — Fill in email/password fields, handle 2FA prompts if present.
2. **Player UI discovery** — Identify the DOM selectors for the play button, volume control, subtitle panel, and progress bar. Each service uses a completely different HTML structure.
3. **Subtitle/language panel control** — Replicate the `MutationObserver` + `scrollIntoView` pattern from the Netflix implementation, adapted to the service's own panel structure.
4. **Routing** — Integrate with `startup.js`'s `mystreme_autologin` dispatcher so the correct `services/<name>.js` module is loaded based on the URL.

Suggested priority order: **Amazon Prime Video** (most similar DOM structure to Netflix), then **Disney+**, then **Apple TV+**, then **Google Play**.
