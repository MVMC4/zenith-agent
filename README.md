# ZENITH AGENT — COMPLETE PROJECT HANDBOOK & CONTEXT HANDOFF

> **Time tracking with intention — as a resident desktop agent.**
> A floating productivity OS with a HUD layer, command palette, journaling, reminders, and Zen surface — all running locally in a single transparent Electron window, on a black canvas tuned the color of ink on lacquer.

**Generated:** June 2026
**Architecture:** Electron 31 + React 18 + Vite 5 + Tailwind 3 + TypeScript
**Pattern:** Single transparent window, IPC bridge, local-first state (Immer + Zod)

---

## 🎯 1. PRODUCT VISION & PHILOSOPHY

Zenith Agent is built for people who treat their work like a craft. It optimizes for **attention** — the act of choosing one thing, putting time into it, and writing down what happened. 

### Core Design Principles
1. **Local-first:** All state in `localStorage` (Electron `userData` JSON). No servers. No accounts. No analytics.
2. **One target, one document:** Each deck/card has exactly one journal. Deduped on hydrate.
3. **Quiet UI:** Black canvas (`#000000`), gold accent (`#c9a84c`), DM Sans font. No emoji, no celebratory animations.
4. **Recoverable deletes:** Every delete has an undo handle via toast. Cascade deletes are safe.
5. **Keyboard-first:** `Alt+Space` (toggle), `Alt+F` (focus), `Alt+Z` (zen), `Esc` (close).
6. **Single transparent window:** Frameless, `alwaysOnTop`, `thickFrame:false`. The "Shadow-Box" CSS trick provides the OS window shadow without clipping.

---

## 🚀 2. THE MVP (Current Shippable State)

If you clone this repo today, the following features are **fully implemented, tested, and bug-free**:

*   **Decks & Cards Workspace:** Horizontal deck tabs. Card grid with inline checklists.
*   **Multi-Select Group Sessions:** `Cmd/Ctrl+Click` or use "Select" mode to run multiple cards simultaneously. Floating action bar to "Start Group".
*   **Auto-Save Journal:** 1-second debounced auto-save to local storage. Slide-up Target Picker modal. Edit/Preview markdown modes.
*   **Timeline History:** Collapsible day folders. Visual timeline with colored deck dots and connecting lines. Precise start/end timestamps.
*   **Fuzzy Search:** Command-palette style UI. Groups results by Deck. Instant session starting.
*   **Zen Mode:** Ambient wallpaper + rotating quotes + active session overlay. Custom URL/Image uploads.
*   **Focus Mode:** Distraction-free giant stopwatch overlay.
*   **Reminders Engine:** 15s main-process poller. 90s forgiveness window. Synthesized AudioContext chime.
*   **Tutorial:** 6-step keyboard-navigable onboarding modal.

---

## 🎨 3. DESIGN SYSTEM & TOKENS

### Color Palette
| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Canvas** | `#000000` | The transparent OS background |
| **Surface 1** | `#060606` | Headers, Sidebars, Bottom Bar |
| **Surface 2** | `#0a0a0a` | Cards, Inputs, Modals |
| **Surface 3** | `#111111` | Active states, Hover states |
| **Border** | `#1a1a1a` | Hairlines, Dividers |
| **Foreground** | `#ece9e3` | Primary body text |
| **Text Sec.** | `#7a7a7a` | Labels, `micro-caps` |
| **Accent Gold** | `#c9a84c` | **The only chromatic accent** |

### Typography & Utilities
*   **Font:** DM Sans (Google Fonts).
*   `.micro-caps`: `font-weight: 300; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px;`
*   `.timer-mono`: `font-weight: 200; font-variant-numeric: tabular-nums;` (Prevents digit jumping).
*   `.card-soft`: Gradient background (`#0a0a0a` to `#050505`), 12px radius, soft shadow.
*   `.pulse-gold`: 2.4s breathing opacity animation for active timers.

---

## 🖥️ 4. PRODUCT SURFACE (Feature Deep-Dive)

### A. Decks & Cards (Workspace)
*   **UI:** Top horizontal tabs for Decks. Grid of Cards below.
*   **Actions:** Click card to start/stop. `Cmd+Click` to multi-select.
*   **Modals:** Deck and Card creation/editing happen in modals to keep the chrome calm. Timer mode (Stopwatch/Countdown) is locked after creation to preserve historical data integrity.
*   **Checklists:** Expandable per card. Add, toggle, delete.

### B. Journal (Auto-Save Markdown)
*   **UI:** Clean header with Target Picker button and Edit/Preview segmented control.
*   **Target Picker:** Slide-up overlay grouped by Deck -> Cards.
*   **Auto-Save:** 1000ms debounce on keystrokes. Immediate save on unmount/target-switch to prevent data loss.
*   **Footer:** Live word count and "Saving... / Saved" status indicator.

### C. History (Timeline)
*   **UI:** Collapsible dropdown folders for each day (e.g., "Today", "Yesterday").
*   **Timeline:** Vertical line with colored dots matching the Deck's color.
*   **Data:** Shows exact start/end times (e.g., `14:30 - 15:15`) and total duration.
*   **Action:** Clicking a row jumps to the Journal view scoped to that card.

### D. Search (Command Palette)
*   **UI:** Large search input with clear button.
*   **Logic:** `Fuse.js` fuzzy search across Card Names, Tags, and Deck Names.
*   **Grouping:** Results are visually grouped by their parent Deck with colored dots.

### E. Zen Mode (Ambient Surface)
*   **UI:** Full-screen overlay (`absolute inset-0` to respect `.app-shell` rounded corners).
*   **Features:** Time-based greeting + Kanji glyph. Rotating quotes.
*   **Active Overlay:** If a timer is running, a quiet pill at the bottom shows the task name and live elapsed time.
*   **Settings:** Modal for Quote Packs, Auto-Rotate intervals, and Wallpaper categories (Pastel, Gradient, Unsplash, Custom URL/Upload).

### F. Focus Mode
*   **UI:** Pure black overlay. Giant `HH:MM:SS` timer.
*   **Logic:** Hides cursor after 4s of inactivity. ESC to exit.

---

## 📂 5. FILE-BY-FILE DOCUMENTATION (Context Handoff)

### Build & Config
*   **`package.json`**: Dependencies (`fuse.js`, `immer`, `lucide-react`, `react-markdown`, `sonner`, `zod`). Build scripts for `electron-vite` and `electron-builder`.
*   **`electron.vite.config.ts`**: Multi-process build config. Aliases `@shared` to `src/shared`.
*   **`tailwind.config.js`**: Safelists critical utility classes. Extends theme with Zenith color tokens.
*   **`tsconfig.json`**: ES2022 target, strict mode, path aliases.

### Main Process (Node.js)
*   **`src/main/index.ts`**: 
    *   Creates the `BrowserWindow` (424x624, `transparent: true`, `frame: false`, `alwaysOnTop: true`).
    *   Registers global shortcuts (`Alt+Space`, `Alt+F`, `Alt+Z`).
    *   Initializes `MainStore` and registers IPC.
*   **`src/main/ipc/handlers.ts`**: 
    *   Defines the **Zod Discriminated Union** schema for all `Command` types.
    *   Validates incoming IPC messages from the renderer before passing to the store.
*   **`src/main/store/index.ts`** (**The Brain**):
    *   `MainStore` class using `Immer` for immutable state updates.
    *   **Persistence:** Debounced writes to `userData/zenith_agent_state.json`.
    *   **Cascade Deletes:** `deleteDeck` safely removes child tasks, journals, and reminders. `deleteTask` correctly splices parallel `active.deckIds` arrays.
    *   **Reminder Poller:** 15s `setInterval`. Checks `fireAt` with a 90s forgiveness window for recurring tasks. Broadcasts `reminder:fire` to all renderer windows.
    *   **Session Commit:** `commitSession` calculates duration, drops <1s sessions, and pushes to `logs` with `endedAt` and `hasJournal: false`.

### Preload (Security Bridge)
*   **`src/preload/index.ts`**: Exposes `window.api` via `contextBridge`. Methods: `getState`, `sendCommand`, `onStateUpdate`, `on` (for events), `hideWindow`.

### Renderer (React 18 SPA)
*   **`src/renderer/App.tsx`** (**The Shell**):
    *   **Routing:** Opacity-based view routing (preserves state like scroll position and inputs).
    *   **Audio:** `AudioContext` synthesized two-tone chime for reminders.
    *   **Cleanup:** Properly returns unsubscribe functions in `useEffect` to prevent IPC listener leaks on Hot-Reload.
    *   **Layout:** `.app-shell` with 12px margin for the CSS drop-shadow trick.
*   **`src/renderer/views/DecksView.tsx`**:
    *   Multi-select logic (`Set<string>`). Floating "Start Group" action bar.
    *   Inline checklist toggles with `stopPropagation` to prevent triggering the card's timer.
*   **`src/renderer/views/JournalView.tsx`**:
    *   1000ms debounced auto-save via `useEffect` and `setTimeout`.
    *   Slide-up Target Picker overlay.
*   **`src/renderer/views/HistoryView.tsx`**:
    *   Groups logs by `dateKey`. Sorts descending.
    *   Renders collapsible day folders and a visual timeline with connecting lines.
*   **`src/renderer/views/SearchView.tsx`**:
    *   `useMemo` for `Fuse.js` instance. Groups results by Deck.
*   **`src/renderer/views/ZenView.tsx`**:
    *   Uses `absolute inset-0` (not `fixed`) to stay perfectly inside the `.app-shell` rounded corners without clipping.
    *   Settings modal uses `z-index: 100` to guarantee it sits above the Zen backdrop.
*   **`src/renderer/components/BottomBar.tsx`**:
    *   Sticky active session pill with 500ms `setInterval` tick.
    *   Tab navigation.
*   **`src/renderer/components/ReminderModal.tsx`**:
    *   **Bug Fix:** If user picks a time earlier than "now", it automatically advances `fireAt` to tomorrow.
    *   Weekday selector for weekly repeats.

### Shared Code
*   **`src/shared/types.ts`**: Core domain types (`Deck`, `Task`, `Log`, `Journal`, `Reminder`, `ActiveTask`, `AgentState`, `Command`).
*   **`src/shared/utils.ts`**: Pure functions (`generateId`, `formatDuration`, `isDueToday`, `dateKey`, `getGreeting`, `getZenKanji`).
*   **`src/shared/constants.ts`**: `DECK_COLORS` (mid-tones visible on dark backgrounds), `QUOTE_PACKS`, `WALLPAPERS`, `DEFAULT_STATE` (seeds 2 decks, `createdAt: 0`).
*   **`src/renderer/shared/styles.css`**: Tailwind directives, `@layer` tokens, `.app-shell` shadow trick, `.markdown-body` styling, keyframes (`quoteFade`, `pulse-gold`).

---

## 🗄️ 6. DATA MODEL & STATE MANAGEMENT

### AgentState (The Single Source of Truth)
```typescript
export type AgentState = {
  version: number; // Incremented on every Immer produce to trigger IPC broadcast
  decks: Deck[];
  tasks: Task[];
  logs: Log[];
  journals: Journal[];
  active: ActiveTask; // { taskIds: string[], deckIds: string[], startedAt: number | null }
  reminders: Reminder[];
  tutorialSeen: boolean;
  zenPack: string;
  zenInterval: number;
  zenWallpaper: string;
}
```

### IPC Command Flow
1. Renderer calls `window.api.sendCommand({ type: 'START_SESSION', taskIds: ['t1', 't2'] })`.
2. Preload forwards via `ipcRenderer.send('agent:command', cmd)`.
3. Main process `ipc/handlers.ts` validates against Zod schema.
4. `MainStore.handleCommand` routes to `startSession()`.
5. `Immer` produces new state, writes to disk, and broadcasts `agent:stateUpdate` to all windows.

---

## ⌨️ 7. KEYBOARD MAP & WINDOW MANAGEMENT

| Key | Action |
| :--- | :--- |
| `Alt+Space` | **Global**: Toggle app visibility (Summon/Hide) |
| `Alt+F` | **Global**: Open Focus Mode |
| `Alt+Z` | **Global**: Open Zen Mode |
| `Esc` | Exit Focus/Zen, close Modals, clear Search |
| `Cmd/Ctrl + Click`| Multi-select cards in Decks View |
| `Arrow Keys` | Navigate Tutorial steps |

**The "Shadow-Box" CSS Trick:**
The Electron window is completely transparent (`transparent: true`, `hasShadow: false`). The React app renders a `.app-shell` div with a 12px margin. This gives the OS room to render the CSS `box-shadow` and gold glow without clipping the edges against the screen bounds.

---

## 🛠️ 8. INSTRUCTIONS (Running & Building)

### Prerequisites
*   Node.js 18+
*   npm 9+

### Development
```bash
# Clone and install
git clone <repo-url>
cd zenith-agent
npm install

# Run in dev mode (with Vite HMR and Electron hot-reload)
npm run dev
```
*The app will launch as a transparent, always-on-top window. Use `Alt+Space` to summon/hide it.*

### Build Native App
```bash
# Compile TypeScript and bundle Vite assets
npm run build

# Package into native installers (.dmg for macOS, .AppImage for Linux)
npm run package
```
*Outputs to the `release/` folder.*

### Code Signing (macOS Distribution)
To distribute outside your local machine, you must notarize the app:
```bash
export APPLE_ID=your@email.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=YOUR_TEAM_ID
npm run package
```

---

## 🤝 9. CONTRIBUTING

We welcome contributions that align with the **Quiet UI** and **Local-First** philosophies.

1.  **Fork & Branch**: `git checkout -b feature/amazing-thing`
2.  **No Backend Calls**: Zenith is strictly local. Do not introduce network requests, analytics, or telemetry.
3.  **Respect the Palette**: Do not introduce new chromatic colors. Use `#c9a84c` (Gold) for accents, and the grayscale surface tokens for everything else.
4.  **Cascade on Delete**: If you add a new entity that targets a Deck or Task (like Reminders or Journals), you **must** update `deleteDeck` and `deleteTask` in `src/main/store/index.ts` to cascade the deletion, preventing orphaned records.
5.  **Submit PR**: Open a Pull Request with a clear description of the UX problem you are solving.

---

## ⚖️ 10. LICENSE

**MIT License**

Copyright (c) 2026 Zenith Agent Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

> *"Today is victory over yourself of yesterday." — Miyamoto Musashi*
> **Zenith Agent**: Put the time in. Write what happened. Come back tomorrow.
