# Zenith Agent

> **Time tracking with intention — as a resident desktop agent.** A floating productivity OS with a HUD layer, command palette, journaling, reminders, and Zen surface — all running locally in a single transparent Electron window, on a black canvas tuned the color of ink on lacquer.

Zenith Agent is built for people who treat their work like a craft. Long sessions. Repeated focus blocks. Written reflection. It borrows the visual language of Japanese minimalism, the workflow of a kanban board, and the rhythm of a Pomodoro timer, and folds them into one calm, dark-themed surface that lives entirely in `localStorage` — no servers, no accounts, no analytics.

This README is the **full specification** of the Electron desktop agent: every screen, every keystroke, every storage key, every design token. If you want the elevator pitch, read the next two paragraphs. If you want to ship a build, scroll to *Running locally*. If you want to extend it, read the whole thing.

---

## Table of contents

1. [Philosophy & goals](#philosophy--goals)
2. [The MVP](#the-mvp)
3. [Product surface — every feature](#product-surface--every-feature)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [State management — the main store](#state-management--the-main-store)
7. [Reminder engine — how scheduling works](#reminder-engine--how-scheduling-works)
8. [Notification system — toasts & browser](#notification-system--toasts--browser)
9. [Design system](#design-system)
10. [Window management — single transparent frame](#window-management--single-transparent-frame)
11. [Keyboard map](#keyboard-map)
12. [Local storage keys](#local-storage-keys)
13. [Project structure](#project-structure)
14. [Running locally](#running-locally)
15. [Build & deployment](#build--deployment)
16. [Extending Zenith Agent](#extending-zenith-agent)
17. [Non-goals](#non-goals)

---

## Philosophy & goals

Modern productivity apps optimize for **capture** (todo lists) or for **billing** (timesheets). Zenith Agent optimizes for **attention** — the act of choosing one thing, putting time into it, and writing down what happened. The product is shaped around three movements you repeat forever:

1. **Pick a card.** Decks group your projects; cards are the recurring focus blocks inside them (research, writing, reps).
2. **Run a session.** Stopwatch or countdown. One card or several at once. A sticky bottom timer never leaves you.
3. **Reflect.** Every card and every deck gets exactly one markdown journal with autosave. One target, one document, no fragmentation.

Zen mode and the rotating quote packs exist to **remove decoration** — when you're working, the screen should look like the inside of your head when you're calm. There are no streaks, no XP bars, no nags, no popups asking you to upgrade. The only reward is the time you put in.

### Design goals (the rules everything is built against)

| Goal | What it means in practice |
|---|---|
| **Local-first** | Every byte of state lives in `localStorage` (via Electron's `app.getPath('userData')`). The app loads from a static bundle and never talks to a backend. You can fly with it. |
| **One target, one document** | A task has one journal. A deck has one journal. The data layer enforces this — duplicate journals are deduped on hydrate. |
| **Quiet UI** | Black canvas, gold accent (`#c9a84c`), one display font (DM Sans). No emoji, no rainbow toasts, no celebratory animations. |
| **Recoverable destructive actions** | Every delete returns an undo handle via toast. Deleting a deck cascades to its tasks *and* their journals, but you get one button press to put it all back. |
| **Keyboard-first where it matters** | Esc closes everything. Arrow keys move through the tutorial. Alt+Space summons the agent. |
| **Single transparent window** | Frameless, always-on-top, click-through where transparent. The app feels like a native system utility, not a web page. |

---

## The MVP

If you cloned this repo and shipped what's already in `main` today, the product you'd be shipping is the MVP. Concretely:

- **Decks & cards** — create, rename, delete (with undo), and run timers against them. Tags and checklists supported.
- **Stopwatch + countdown** — per-card timer mode, locked after creation. Countdown alerts on finish.
- **Multi-task sessions** — start multiple cards, every selected card accrues the same duration.
- **History** — every session writes a `Log`; the History view groups by day with day and week totals.
- **Journal** — one markdown document per card, one per deck, with Edit / Split / Preview modes and autosave.
- **Reminders** — schedule a one-off or repeating reminder against any deck or card, fire a toast + browser notification + chime, jump straight into the target.
- **Focus mode** — full-screen stopwatch overlay (`Alt+F`); Esc to exit.
- **Zen mode** — full-screen wallpaper + rotating quote + greeting (`Alt+Z`); pick from four quote packs and three wallpaper categories.
- **Tutorial** — six-step illustrated walkthrough that auto-opens on first visit and lives behind a `? Tour` button forever after.
- **Command palette** — fuzzy search for cards, decks, and actions (`Alt+Space` to summon).
- **PWA-ish chrome** — safe-area padding, fullscreen API, mobile dropdown nav.

That entire MVP is implemented in **~6,200 lines of TypeScript and CSS** across `src/main/`, `src/renderer/`, and `src/shared/`. There is no backend.

---

## Product surface — every feature

### Decks & cards

A **Deck** is a project. A **Card** (internally `Task`) is a recurring block of work inside that project. Decks have a name and a colored dot; cards have a name, a tag, a total accumulated seconds counter, an optional checklist, and a locked timer mode.

```ts
// src/shared/types.ts
export type Task = {
  id: string;
  deckId: string;
  name: string;
  tag: string;              // optional filter tag
  totalSeconds: number;     // accrues every time you stop a session on this card
  createdAt: number;
  checklist?: ChecklistItem[];
  mode?: TimerMode;         // "stopwatch" | "countdown" — locked at creation
  targetSeconds?: number;   // only meaningful when mode === "countdown"
};
```

Why lock `mode` after creation? Because a card's history would be incoherent otherwise — a card that was a 25-min Pomodoro yesterday and a free stopwatch today would mean two different things in the same totals row. The store enforces it:

```ts
// src/main/store/index.ts — addTask
this.update(d => d.tasks.push({
  id: generateId(),
  deckId,
  name,
  tag: tag || '',
  totalSeconds: 0,
  createdAt: Date.now(),
  mode,  // locked at creation
  targetSeconds: mode === 'countdown' ? targetSeconds ?? 1500 : undefined
}))
```

Card and deck creation/editing both happen in modals (not inline forms) so the chrome stays calm and the keyboard focus is unambiguous.

### Checklists

Every card can carry a `ChecklistItem[]`. You add, toggle, and delete items; deletes are undoable through the unified toast system.

```ts
// src/main/store/index.ts
private toggleChecklist(taskId: string, itemId: string) {
  this.update(d => {
    const task = d.tasks.find(t => t.id === taskId)
    if (task?.checklist) task.checklist = task.checklist.map(i =>
      i.id === itemId ? { ...i, done: !i.done } : i
    )
  })
}
```

### Timer & sessions

There is a single source of truth for "what's running": an `ActiveTask` object on the main store.

```ts
export type ActiveTask = {
  taskIds: string[];   // can be many — multi-select sessions
  deckIds: string[];   // parallel array; deckIds[i] is the parent of taskIds[i]
  startedAt: number | null;
} | null
```

Starting tasks while a session is already live **commits** the previous session as logs first, then starts the new one — no time is ever lost:

```ts
// src/main/store/index.ts — startSession
private startSession(taskIds: string[]) {
  this.update(d => {
    if (d.active?.startedAt && d.active.taskIds.length) {
      this.commitSession(d, d.active)  // commit previous first
    }
    const deckIds = taskIds.map(id => d.tasks.find(t => t.id === id)?.deckId || '')
    d.active = { taskIds, deckIds, startedAt: Date.now() }
  })
}
```

A 500ms `setInterval` ticks while a session is active so the live HH:MM:SS counter in the bottom bar (and every selected card) updates without re-rendering the whole tree.

`commitSession` writes a `Log` to history *and* adds the elapsed seconds to the card's `totalSeconds`. Sessions shorter than 1 second are dropped — they're not interesting and they make the history view noisy.

### History

Every committed session becomes a `Log` row. The History view groups logs by day (using `dateKey(ts)`), sums per-day totals, and rolls up a rolling week total. Each row has a one-click *jump to journal* action that opens the journal view scoped to that card.

```ts
export type Log = {
  id: string;
  taskId: string; taskName: string;
  deckName: string; deckColor: string;
  duration: number;       // seconds
  startedAt: number; endedAt: number;
  hasJournal: boolean;    // flipped to true the moment a journal targets this log
};
```

### Journal

One markdown document per card, one per deck. The picker modal makes the target unambiguous — you don't write into "a journal", you write into *this deck's journal* or *this card's journal*. The data layer actively prevents duplicates: on hydrate it dedupes any legacy multi-journal-per-target rows (keeping the most recently updated), and on `upsertJournal` it searches for an existing journal for the same target before creating a new one.

```ts
// src/main/store/index.ts — upsertJournal
private upsertJournal(content: string, targetId: string, targetType: 'task'|'deck') {
  this.update(d => {
    const existing = d.journals.find(j =>
      targetType === 'task' ? j.taskId === targetId : j.deckId === targetId
    )
    if (existing) {
      existing.content = content
      existing.updatedAt = Date.now()
    } else {
      d.journals.push({
        id: generateId(),
        [targetType === 'task' ? 'taskId' : 'deckId']: targetId,
        content,
        updatedAt: Date.now()
      })
    }
  })
}
```

The editor has three modes — **Edit**, **Split**, **Preview** — rendered with `react-markdown` + `remark-gfm`. Autosave is silent; a footer shows word and character counts. Markdown styling lives in `src/renderer/shared/styles.css` under the `.markdown-body` selectors (headings, blockquotes with a gold left border, monospaced code blocks, gold underlined links).

When a deck or card is deleted, the cascade in `deleteDeck`/`deleteTask` removes the orphaned journals so the journal list never shows entries that point nowhere.

### Reminders

A reminder targets either a deck or a card and fires either once or on a recurring schedule. See [Reminder engine](#reminder-engine--how-scheduling-works) for the full algorithm.

```ts
// src/shared/types.ts
export type Reminder = {
  id: string;
  targetType: "task" | "deck";
  targetId: string;
  label: string;                    // cached for display even if the target moves
  deckName?: string; deckColor?: string;
  fireAt: number;                   // epoch ms for one-off; time-of-day source for repeats
  repeat: "none" | "daily" | "weekdays" | "weekly";
  weekday?: number;                 // 0=Sun..6=Sat (weekly only)
  enabled: boolean;
  notify: boolean;                  // browser Notification
  sound: boolean;                   // built-in two-tone chime
  createdAt: number;
  lastFiredAt?: number;             // dedupe guard
};
```

When a reminder fires you get **three** signals stacked:

1. A `toast.info` inside the app (with a *Open* action that jumps to the target).
2. A browser `Notification` (if permission was granted; click it to focus the tab and jump to the target).
3. A two-tone sine chime synthesized on the fly with `AudioContext` — no audio asset is shipped.

The reminders modal also persists the browser's notification permission state (`granted` / `denied` / `default` / unsupported) and shows the correct banner on subsequent opens — you don't get asked twice.

### Focus mode

A full-screen overlay that hides everything except a giant stopwatch readout of the currently running session. Tap or hit `Esc` to drop back to the app. The cursor is hidden after a moment of inactivity.

### Zen mode

A full-screen ambient surface: wallpaper, a rotating quote, a time-of-day greeting (*good morning / afternoon / evening / late night / still up*), and a kanji glyph that changes with the greeting. It exists to give you a screen worth keeping open while you think.

- **Quote packs** — Musashi (*The Book of Five Rings*), Bible Verses, Stoic (Marcus Aurelius / Seneca / Epictetus), Zen Proverbs. Persisted under `zenPack`.
- **Quote rotation** — Off, 10s, 20s, 30s, 60s, with manual `‹` `›` navigation. Persisted under `zenInterval`.
- **Wallpaper categories** —
  - **Pastel** — solid soft colors (cream, sand, mist, sage, blush, ice, lilac, peach).
  - **Gradient** — curated linear gradients (Midnight, Twilight, Ocean Deep, Forest, Autumn, Noir Gold).
  - **Curated** — built-in artwork (Musashi ink, zen garden, bamboo, temple).

Quote transitions use a custom `.quote-fade` keyframe that simultaneously fades opacity, eases a 10px translate, blurs out 6px, and tightens letter-spacing — the words feel like they're coming into focus, not popping in.

```css
@keyframes quoteFade {
  from { opacity: 0; transform: translateY(10px); filter: blur(6px); letter-spacing: 0.01em; }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0);   letter-spacing: 0; }
}
```

### Notifications (toasts)

A unified `toast` API wraps Sonner with a custom card-shaped badge — same look for every event in the app (create, edit, delete, journal saved, reminder fired).

```ts
toast.success("Deck created")
toast.info("Deck deleted", {
  action: { label: 'Undo', onClick: () => restoreDeck(deck, index) },
  description: deck.name
})
```

The undo variant returns a `Restore` button right in the toast, valid for 5 seconds.

### Tutorial

A 6-step modal walkthrough with real PNG screenshots of each view (stored under `src/assets/tutorial/`). Auto-opens on first visit (flag at `tutorialSeen`), reachable any time via the `? Tour` button in the top bar. Arrow keys walk through steps; clicking outside skips.

### Mobile dropdown nav

On screens narrower than the `sm:` breakpoint the top-bar action buttons collapse into a single `DropdownMenu` trigger. It opens with a smooth `data-[state=open]:zoom-in-95 slide-in-from-top-1` transition, rotates its `≡` glyph 90° while open, and gilds its border with the gold accent so the active state reads at a glance. Outside-click and select-to-close are handled by Radix.

---

## Architecture

- **Framework** — React 18 + Vite 5. Standard client-side SPA inside Electron. No SSR.
- **Runtime** — Electron 31 with `contextIsolation: true`, `sandbox: false`, single transparent window.
- **Build** — `electron-vite` produces a static `out/` deployable as a native app (dmg/AppImage).
- **Styling** — Tailwind CSS 3 with the CSS-first config in `src/renderer/shared/styles.css`; semantic tokens in hex via `@layer`.
- **State** — `localStorage` in Electron's userData directory. One `MainStore` class owns everything: decks/tasks/logs/journals/active/reminders.
- **Markdown** — `react-markdown` + `remark-gfm`, styled via `.markdown-body` rules in `styles.css`.
- **Notifications** — `sonner` wrapped by the custom toast style.
- **No backend.** Data never leaves the device.

```
┌──────────────────────────────────────────────────────────────┐
│  src/main/index.ts   ← Electron app entry + window creation │
│  src/main/store/     ← MainStore: state + persistence + IPC │
│  src/main/ipc/       ← Typed command handlers + validation  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  src/preload/index.ts  ← contextBridge: window.api           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  src/renderer/                                                  │
│  ├── App.tsx           ← View router + BottomBar + Toaster  │
│  ├── components/       ← BottomBar, Tutorial, ReminderModal │
│  ├── views/            ← Home, Decks, History, Journal,     │
│  │                     │   Search, Focus, Zen               │
│  ├── shared/           ← styles.css, utils.ts, types.ts     │
│  └── main.tsx          ← React 18 entry point               │
└──────────────────────────────────────────────────────────────┘
```

---

## Data model

Defined once in `src/shared/types.ts`. Every persisted entity is shown above; here's the relationship sketch:

```
Deck ─┬─< Task ─< ChecklistItem
      │     │
      │     └─< Log         (one Log per stopped session)
      │
      ├─< Journal           (one Journal per Deck, optional)
      └ Task ──< Journal    (one Journal per Task, optional)

Reminder ──> Deck  (targetType:"deck", targetId = deck.id)
        └──> Task  (targetType:"task", targetId = task.id)
```

A Journal has *either* a `taskId` *or* a `deckId` (never both meaningful at once). The store's dedupe key is `t:<taskId>` or `d:<deckId>` precisely to enforce the one-journal-per-target rule.

---

## State management — the main store

### `MainStore` (src/main/store/index.ts)

Owner of decks, tasks, logs, journals, active session, and reminders. Hydrates from `localStorage` on mount, sets a `version` flag, then mirrors every state slice back to storage on change via Immer produce:

```ts
private update(recipe: (draft: AgentState) => void): void {
  this.state = produce(this.state, (draft) => {
    recipe(draft)
    draft.version++  // critical for change detection
  })
  this.persist()     // debounced write to userData JSON
  this.broadcast()   // send to all renderer windows via IPC
}
```

The `version` gate matters — without it, the first render would overwrite real saved data with empty defaults. The store also:

- **Migrates** the legacy single-task `active` shape (`{ taskId, deckId }`) to the new multi-select `{ taskIds, deckIds }` shape.
- **Cleans up** orphaned journals on first load (journals whose target deck or card has been deleted).
- **Seeds** two starter decks (Academics, Projects) on a truly empty install — *never* fake logs or journals. The comment in source is load-bearing:

```ts
// @AI-INSTRUCTION: DO NOT EVER seed fake logs, history, or journals.
// The app must start with zero history to maintain authenticity.
```

The store returns a wide API: `startSession`, `stopSession`, `addDeck`, `addTask`, `updateTask`, `deleteLog`, `deleteTask`, `restoreTask`, `deleteDeck`, `restoreDeck`, `upsertJournal`, `deleteJournal`, and the three checklist helpers. `deleteDeck`/`deleteTask` cascade to journals and reminders so the state never contains orphans.

---

## Reminder engine — how scheduling works

The scheduler runs entirely in the foreground (it's a client-only app), so it has to be **idempotent** and **resilient to the user reopening the tab after the trigger time has passed**. The shape of the algorithm:

```ts
// src/main/store/index.ts — the polling tick
private startReminderPoller() {
  if (this.reminderInterval) clearInterval(this.reminderInterval)
  
  const check = () => {
    const now = Date.now()
    this.update(d => {
      d.reminders = d.reminders.map(r => {
        if (!r.enabled) return r
        let due = false

        if (r.repeat === "none") {
          // one-off: fire if past trigger and never fired
          if (r.fireAt <= now && (!r.lastFiredAt || r.lastFiredAt < r.fireAt)) due = true
        } else {
          // recurring: compute today's trigger from the time-of-day in r.fireAt
          const base = new Date(r.fireAt)
          const today = new Date(now)
          today.setHours(base.getHours(), base.getMinutes(), 0, 0)
          const trigger = today.getTime()
          const dayOk =
            r.repeat === "daily" ||
            (r.repeat === "weekdays" && today.getDay() >= 1 && today.getDay() <= 5) ||
            (r.repeat === "weekly" && today.getDay() === (r.weekday ?? base.getDay()))
          // fire only inside a 90-second window after the trigger, once per trigger
          if (dayOk && trigger <= now && (now - trigger < 90_000) && (!r.lastFiredAt || r.lastFiredAt < trigger)) due = true
        }

        if (due) {
          // Broadcast to all renderer windows
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send('reminder:fire', r)
          }
          return {
            ...r,
            lastFiredAt: now,
            enabled: r.repeat === "none" ? false : r.enabled
          }
        }
        return r
      })
    })
  }
  
  check()  // run immediately on start
  this.reminderInterval = setInterval(check, 15_000)  // poll every 15s
}
```

Key invariants:

- **One-offs disable themselves** after firing (`enabled: false`).
- **Recurring reminders** stay enabled but record `lastFiredAt` so the same trigger can't fire twice in the 15-second poll window.
- **90-second forgiveness window** — if the user reopens the tab within 90s of the trigger, the reminder still fires. Beyond that, it's considered missed and skipped (it'll fire on the next scheduled day).

`nextFireAt(reminder)` is the read-only counterpart used by the UI to display "next: tomorrow 9:00".

---

## Notification system — toasts & browser

The custom `toast` style in `styles.css` is the only toast layout in the app. It has:

- a colored 1.5×1.5px dot for kind (info / success / warn / error),
- a `micro-caps` label,
- an optional 11px description,
- an optional action button (gold-bordered `micro-caps` pill, used for Undo and Open),
- a dismiss `×`.

Toasts stack up to six at the bottom-center; defaults: 3.2s for plain notifications, 5s for undoables.

Browser notifications go through the Electron `Notification` API. It checks `Notification.permission`, builds a body string (`"Deck name — Card label"` for cards, `"Time for deck: Name"` for decks), tags by reminder id so the same reminder replaces its own previous notification, and auto-closes after 12 seconds.

---

## Design system

The design system is intentionally tiny — one accent color, one font, a handful of semantic surface tokens.

### Color tokens (defined in `src/renderer/shared/styles.css`)

| Token | Value | Used for |
|---|---|---|
| `--background` | `#000000` | The canvas |
| `--foreground` | `#ece9e3` | Body text |
| `--surface-1/2/3` | `#060606` / `#0a0a0a` / `#111111` | Card, popover, raised |
| `--border` / `--border-accent` | `#1a1a1a` / `#2c2c2c` | Hairlines |
| `--text-secondary` / `--text-dim` / `--text-ink` | `#7a7a7a` / `#4a4a4a` / `#b0a999` | Hierarchy |
| `--accent-gold` / `--accent-gold-dim` | `#c9a84c` / `#6e5524` | The only chromatic accent |
| `--danger` | `#c9a84c` | Same gold — destructive isn't red; it's deliberate |

These are aliased into Tailwind via `@layer utilities` so you can write `bg-surface-2 text-text-secondary border-border-accent` directly.

### Typography

One font: **DM Sans**, weights 200–700 plus italics, loaded from Google Fonts. The `--font-display`, `--font-serif`, and `--font-jp` tokens all point at it — there is no second face, no monospace except in code blocks.

Three text utilities do most of the work:

```css
.micro-caps { font-weight: 300; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; color: #7a7a7a; }
.timer-mono { font-weight: 200; letter-spacing: 0.06em; font-variant-numeric: tabular-nums; }
.display-italic { font-style: italic; }
```

`micro-caps` is the labels-and-chips voice. `timer-mono` is the HH:MM:SS voice (tabular numerals so digits don't dance). `display-italic` is the quote voice.

### Surface utilities

- `.card-soft` — the universal card background: a top-to-bottom gradient (`#0a0a0a → #050505`), an inner highlight, a soft drop shadow, `radius-lg`. Picks up a stronger shadow on hover.
- `.card-soft-active` — same shape with a 1px inset gold ring and a faint gold glow; used for running tasks.
- `.edge-soft` — adds the inset highlight/shadow pair *without* changing the radius. Used on toasts and on the chrome around modals so two borders meeting feel lifted instead of flat.
- `.gold-rule` — a 1px horizontal gradient from transparent → gold-dim → transparent. The divider in modals and headers.
- `.pulse-gold` — a 2.4s breathing opacity loop for the "session active" indicator.

### Animation

Every motion comes from CSS keyframes in `styles.css` — no animation library. The vocabulary:

| Class | What it does | Where |
|---|---|---|
| `.fade-in` | 0.3s opacity + 4px slide-up | Views appearing |
| `.quote-fade` / `.quote-fade-slow` | The blur/translate/letter-spacing combo above | Zen quote rotation |
| `.pulse-gold` | 2.4s opacity breath | Active-session dot |
| Radix `data-[state=open]:zoom-in-95 slide-in-from-top-1` | Dropdown entrance | Mobile nav |

### Scrollbars & selection

Both Firefox (`scrollbar-color`) and WebKit are themed to a slim brown-to-gold thumb. Text selection uses `--accent-gold-dim` so the gold thread runs through every state.

---

## Window management — single transparent frame

Zenith Agent runs in a **single, frameless, transparent Electron window** that feels like a native system utility.

### Window configuration (`src/main/index.ts`)

```ts
mainWindow = new BrowserWindow({
  width: 424,    // 400px UI + 24px margin for shadows
  height: 624,   // 600px UI + 24px margin
  frame: false,              // no OS chrome
  transparent: true,         // alpha channel for CSS shadows
  alwaysOnTop: true,         // stays above other apps
  level: 'floating',         // macOS: above normal windows
  skipTaskbar: true,         // no dock icon
  resizable: false,          // fixed size for consistent layout
  thickFrame: false,         // Windows: proper transparency
  hasShadow: false,          // we draw our own CSS shadow
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.mjs'),
    contextIsolation: true,  // security: isolate renderer from Node
    sandbox: false           // required for some Electron APIs
  }
})
```

### The "Shadow-Box" CSS trick

The window itself is transparent. The React app draws the actual "app" as a div with a 12px margin. This gives the OS room to render the drop-shadow and gold glow without clipping the edges.

```css
/* src/renderer/shared/styles.css */
.app-shell {
  width: calc(100% - 24px);
  height: calc(100% - 24px);
  margin: 12px;  /* critical: room for shadow */
  background: #050505;
  border: 1px solid #1f1f1f;
  border-radius: 16px;
  box-shadow: 
    0 24px 48px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
}
```

### Global hotkeys

```ts
// src/main/index.ts
globalShortcut.register('Alt+Space', () => {
  // Toggle app visibility
  if (!mainWindow) return
  mainWindow.isVisible() ? mainWindow.hide() : (mainWindow.show(), mainWindow.focus())
})

globalShortcut.register('Alt+F', () => {
  // Open Focus mode
  mainWindow?.webContents.send('view:open', 'focus')
})

globalShortcut.register('Alt+Z', () => {
  // Open Zen mode
  mainWindow?.webContents.send('view:open', 'zen')
})
```

---

## Keyboard map

| Key | Action |
|---|---|
| `Alt+Space` | Toggle app visibility (summon/hide) |
| `Alt+F` | Open Focus mode |
| `Alt+Z` | Open Zen mode |
| `Esc` | Exit Focus/Zen mode, close any modal, go back in navigation |
| `←` / `→` | Step through the tutorial |
| `Tab` / `Shift+Tab` | Focus order respects reading order; modals trap focus |
| `Enter` | Activate selected item in command palette / forms |

---

## Local storage keys

All state is namespaced under `zenith_agent_state` in Electron's userData directory:

| Key | Owner | Shape |
|---|---|---|
| `zenith_agent_state` | `MainStore` | `AgentState` JSON |
| `zenith.tutorial.seen` | App | `"1"` flag on first dismiss |
| `zenith.zen.pack` | Zen view | `QuotePackId` |
| `zenith.zen.customQuotes` | Zen view | `string[]` |
| `zenith.zen.customWalls` | Zen view | `string[]` (URLs or data-URLs) |
| `zenith.zen.wallIdx` | Zen view | `number` |
| `zenith.zen.intervalSec` | Zen view | `0 \| 10 \| 20 \| 30 \| 60` |

`loadLS`/`saveLS` wrap every read/write in a try/catch — if storage is full or disabled (private windows), the app degrades gracefully to "this session only" instead of crashing.

---

## Project structure

```
zenith-agent/
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron app entry + window creation
│   │   ├── store/
│   │   │   ├── index.ts          # MainStore: state + persistence + IPC
│   │   │   └── schemas.ts        # Zod validation for commands
│   │   └── ipc/
│   │       └── handlers.ts       # Typed command handlers
│   │
│   ├── preload/
│   │   └── index.ts              # contextBridge: window.api
│   │
│   ├── renderer/
│   │   ├── App.tsx               # View router + BottomBar + Toaster
│   │   ├── main.tsx              # React 18 entry point
│   │   ├── index.html            # Single HTML entry
│   │   ├── components/
│   │   │   ├── BottomBar.tsx     # Persistent tab nav + sticky timer
│   │   │   ├── Tutorial.tsx      # 6-step walkthrough modal
│   │   │   └── ReminderModal.tsx # Create/edit reminders
│   │   ├── views/
│   │   │   ├── HomeView.tsx      # Dashboard + quotes + stats
│   │   │   ├── DecksView.tsx     # Workspace: decks, cards, checklists
│   │   │   ├── HistoryView.tsx   # Session logs grouped by day
│   │   │   ├── JournalView.tsx   # Markdown journal picker + editor
│   │   │   ├── SearchView.tsx    # Fuzzy search with Fuse.js
│   │   │   ├── FocusView.tsx     # Full-screen timer overlay
│   │   │   └── ZenView.tsx       # Wallpaper + quotes + greeting
│   │   └── shared/
│   │       ├── styles.css        # Tailwind + design tokens + markdown
│   │       ├── types.ts          # Deck/Task/Journal/Log/Reminder types
│   │       ├── utils.ts          # Time formatters, ID generation, helpers
│   │       └── constants.ts      # Colors, quotes, wallpapers, defaults
│   │
│   └── shared/                   # Types/utils shared with main process
│       ├── types.ts
│       ├── utils.ts
│       └── constants.ts
│
├── electron.vite.config.ts       # Multi-build config (main/preload/renderer)
├── tailwind.config.js            # Tailwind v3 config with design tokens
├── postcss.config.cjs            # PostCSS plugins for Tailwind
├── package.json                  # Dependencies + build scripts
├── tsconfig.json                 # TypeScript config
└── README.md                     # This file
```

---

## Running locally

```bash
# Clone and install
git clone <repo>
cd zenith-agent
npm install

# Run in dev mode (with hot reload)
npm run dev

# The app will launch as a transparent window.
# Use Alt+Space to summon/hide it.
```

### Dev tools

- The main process logs to your terminal.
- Each renderer view has DevTools enabled in dev mode (press `Cmd+Option+I` or `Ctrl+Shift+I`).
- State is persisted to `~/Library/Application Support/Zenith Agent/zenith_agent_state.json` (macOS) or `%APPDATA%\Zenith Agent\` (Windows).

---

## Build & deployment

Zenith Agent is a **client-only Electron app**. The build pipeline targets native installers (dmg for macOS, AppImage for Linux).

### What `npm run build` does

```bash
npm run build       # == electron-vite build
```

Standard electron-vite build. Output:

```
out/
  main/
    index.js          # Electron main process bundle
  preload/
    index.mjs         # Preload script bundle
  renderer/
    index.html        # SPA entry
    assets/
      index-<hash>.js
      index-<hash>.css
```

### What `npm run package` does

```bash
npm run package     # == electron-builder
```

Produces native installers:

```
release/
  Zenith Agent-1.0.0.dmg      # macOS
  Zenith Agent-1.0.0.AppImage # Linux
```

### Code signing & notarization (macOS)

For distribution outside TestFlight:

1. Enroll in Apple Developer Program.
2. Create a "Developer ID Application" certificate.
3. Add to `package.json`:

```json
"build": {
  "mac": {
    "target": "dmg",
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "notarize": true
  }
}
```

4. Set environment variables before building:

```bash
export APPLE_ID=your@email.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=YOUR_TEAM_ID
npm run package
```

### Any other distribution

Point users to the `release/` folder and have them:
- **macOS**: Drag `Zenith Agent.app` to `/Applications`
- **Linux**: Make `Zenith Agent-*.AppImage` executable and run

No Node runtime, no edge worker, no environment variables required.

---

## Extending Zenith Agent

Common extension points and where to start:

| Want to… | Edit |
|---|---|
| Add a new quote pack | `src/shared/constants.ts` — push a new entry into `QUOTE_PACKS` |
| Add a new wallpaper category | `src/shared/constants.ts` — push into `WALLPAPERS` |
| Change the accent color | `src/renderer/shared/styles.css` — update `--accent-gold` |
| Change the font | `src/renderer/shared/styles.css` — swap the Google Fonts import |
| Add a new persisted slice of state | Extend `AgentState` in `types.ts` + add handlers in `MainStore` |
| Add a new toast variant | `src/renderer/shared/styles.css` — extend `.toast` selectors |
| Add a new top-bar action | `src/renderer/components/BottomBar.tsx` — add to tabs array |
| Add a new keyboard shortcut | `src/main/index.ts` — register with `globalShortcut` |
| Add system integration (e.g., idle detection) | `src/main/index.ts` — use Electron `powerMonitor` or `idleDetector` |

When you add a new persisted entity that targets a deck or task, remember to **cascade on delete**. Look at how `deleteDeck` and `deleteTask` cascade to journals and reminders — every new entity needs the same treatment or you'll end up with rows pointing at the void.

---

## Non-goals

What Zenith Agent is deliberately not, and won't become:

- **A team tool.** No multi-user, no sync, no shared decks. Single-user, single-device, local-first.
- **A billing tool.** No invoicing, no client rates, no exports tuned for accounting.
- **A todo app.** The checklist on a card is incidental — the unit of work is the card itself.
- **Gamified.** No streaks, no XP, no nags. There's a card, a timer, and a blank page. Put the time in. Write what happened. Come back tomorrow.
- **Cloud-synced.** Your data stays on your machine. If you want to back it up, copy the `zenith_agent_state.json` file.

> "Today is victory over yourself of yesterday." — Musashi

---

## Troubleshooting

### Window won't show / is completely transparent
- Check that `transparent: true` and `hasShadow: false` are both set in `BrowserWindow` options.
- Verify the `.app-shell` CSS has the 12px margin and background color.

### Timer doesn't update / feels laggy
- The timer uses a 500ms `setInterval` in the renderer. If your system is under heavy load, consider increasing to 1000ms.
- Ensure `clearInterval` is properly returned in the `useEffect` cleanup (see `BottomBar.tsx`).

### Reminders don't fire
- Check that the main process `startReminderPoller` is called after `store.init()`.
- Verify the 90-second forgiveness window logic matches your timezone expectations.

### Styles aren't applying / Tailwind classes ignored
- Clear the Vite cache: `rm -rf node_modules/.vite out`
- Ensure `postcss.config.cjs` uses `module.exports` (CommonJS) for Electron compatibility.

### Build fails with "module not found"
- Electron-vite outputs `.mjs` for preload scripts in dev. Ensure imports in `main/index.ts` use `.mjs` extension or configure `resolve.extensions`.

---

## License

MIT. Do what you want with it. If you build something cool, let us know.

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes (`git commit -am 'Add amazing thing'`)
4. Push to the branch (`git push origin feature/amazing-thing`)
5. Open a Pull Request

Please keep changes aligned with the design goals: local-first, quiet UI, keyboard-first, single transparent window.

---

## Acknowledgments

- The visual language of Japanese minimalism
- The workflow of kanban boards
- The rhythm of Pomodoro timers
- Every person who treats their work like a craft

> "The sword is the soul. The soul is the sword." — Musashi  
> Zenith Agent should feel like an extension of your focus — present but never intrusive.
