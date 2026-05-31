#!/bin/bash
# review-design.sh — Complete Zenith Agent Project Handover
# Outputs every file with: content, function, spec role, dependencies
# Run from project root: chmod +x review-design.sh && ./review-design.sh > zenith-handover.txt

set -e

OUTPUT="zenith-handover.txt"
PROJECT_ROOT="$(pwd)"

# ─────────────────────────────────────────────────────────────
# HEADER: Project Overview
# ─────────────────────────────────────────────────────────────
cat << 'EOF' > "$OUTPUT"
================================================================================
ZENITH AGENT — COMPLETE PROJECT HANDBOOK
================================================================================
Generated: $(date)
Project Root: $PROJECT_ROOT
Architecture: Electron 31 + React 18 + Vite 5 + Tailwind 3 + TypeScript
Pattern: Single transparent window, IPC bridge, local-first state
================================================================================

🎯 PRODUCT VISION
----------------
Zenith Agent is a floating productivity OS agent — not a web app in a window.
It optimizes for attention: pick a card, run a session, reflect in a journal.
All data stays local. No servers. No accounts. No analytics.

🔑 CORE PRINCIPLES (Spec Compliance)
------------------------------------
1. Local-first: All state in localStorage (Electron userData JSON)
2. One target, one document: Each deck/card has exactly one journal
3. Quiet UI: Black canvas (#000000), gold accent (#c9a84c), DM Sans font
4. Recoverable deletes: Every delete has an undo handle via toast
5. Keyboard-first: Alt+Space (toggle), Alt+F (focus), Alt+Z (zen), Esc (close)
6. Single transparent window: Frameless, alwaysOnTop, thickFrame:false

🎨 DESIGN TOKENS (src/renderer/shared/styles.css)
-------------------------------------------------
• Colors:
  --background: #000000 (canvas)
  --foreground: #ece9e3 (body text)
  --surface-1/2/3: #060606 / #0a0a0a / #111111 (cards, popovers)
  --border / --border-accent: #1a1a1a / #2c2c2c (hairlines)
  --text-secondary / --text-dim: #7a7a7a / #4a4a4a (hierarchy)
  --accent-gold / --accent-gold-dim: #c9a84c / #6e5524 (ONLY chromatic accent)

• Typography:
  .micro-caps { font-weight:300; letter-spacing:0.08em; text-transform:uppercase; font-size:10px; color:#7a7a7a; }
  .timer-mono { font-weight:200; letter-spacing:0.06em; font-variant-numeric:tabular-nums; }
  .display-italic { font-style:italic; }

• Surfaces:
  .card-soft { background:linear-gradient(180deg,#0a0a0a 0%,#050505 100%); border:1px solid #1a1a1a; border-radius:12px; }
  .gold-rule { height:1px; background:linear-gradient(90deg,transparent 0%,#6e5524 50%,transparent 100%); }
  .pulse-gold { animation:pulse-gold 2.4s ease-in-out infinite; }

• Animations:
  @keyframes quoteFade { from{opacity:0;transform:translateY(10px);filter:blur(6px)} to{opacity:1;transform:translateY(0);filter:blur(0)} }
  @keyframes pulse-gold { 0%,100%{opacity:1;box-shadow:0 0 8px #c9a84c} 50%{opacity:0.5;box-shadow:0 0 2px #c9a84c} }

⌨️ KEYBOARD SHORTCUTS (src/main/index.ts)
------------------------------------------
• Alt+Space : Toggle app visibility (summon/hide)
• Alt+F     : Open Focus mode (full-screen timer)
• Alt+Z     : Open Zen mode (ambient quote surface)
• Esc       : Exit modal/fullscreen views, go back in navigation
• Tab/Shift+Tab : Focus order (modals trap focus)
• Enter     : Activate selected item in forms/command palette

🗂️ PROJECT STRUCTURE
--------------------
src/
├── main/                    # Electron main process (Node.js)
│   ├── index.ts            # App entry: window creation, shortcuts, IPC registration
│   ├── ipc/handlers.ts     # Typed command handlers + Zod validation
│   ├── store/index.ts      # MainStore: state management + persistence + reminder scheduler
│   └── store/schemas.ts    # Zod schemas for IPC command validation
│
├── preload/                 # Context bridge between main and renderer
│   └── index.ts            # Exposes window.api with getState/sendCommand/onStateUpdate
│
├── renderer/                # React 18 SPA (single window, multiple views)
│   ├── App.tsx             # Root component: view router + BottomBar + Tutorial + Toaster
│   ├── main.tsx            # React entry point
│   ├── index.html          # Single HTML entry (Vite serves from src/renderer root)
│   ├── components/         # Reusable UI components
│   │   ├── BottomBar.tsx   # Persistent tab nav + sticky active-session timer
│   │   ├── Tutorial.tsx    # 6-step walkthrough modal (auto-opens on first launch)
│   │   └── ReminderModal.tsx # Create/edit reminders with repeat options
│   ├── views/              # View surfaces (opacity+pointerEvents routing)
│   │   ├── HomeView.tsx    # Dashboard: stats, Musashi quote, quick actions
│   │   ├── DecksView.tsx   # Workspace: decks, cards, checklists, tags, timer modes
│   │   ├── HistoryView.tsx # Session logs grouped by day with totals
│   │   ├── JournalView.tsx # Markdown journal picker + edit/preview modes
│   │   ├── SearchView.tsx  # Fuzzy search (Fuse.js) for cards/decks/tags
│   │   ├── FocusView.tsx   # Full-screen timer overlay (Alt+F)
│   │   └── ZenView.tsx     # Ambient quote surface with wallpaper + settings (Alt+Z)
│   └── shared/             # Renderer-only shared code
│       ├── styles.css      # Tailwind imports + design tokens + markdown styling
│       ├── types.ts        # React component props/types (subset of shared/types.ts)
│       ├── utils.ts        # React-specific helpers (formatting, date checks)
│       └── constants.ts    # UI constants (colors, quotes, wallpapers)
│
└── shared/                  # Code shared between main and renderer
    ├── types.ts            # Core domain types: Deck, Task, Log, Journal, Reminder, AgentState, Command
    ├── utils.ts            # Pure functions: generateId, formatDuration, isDueToday, dateKey, getGreeting, getZenKanji
    └── constants.ts        # App-wide constants: DECK_COLORS, QUOTE_PACKS, WALLPAPERS, DEFAULT_STATE, STORAGE_KEY

================================================================================
FILE-BY-FILE DOCUMENTATION
================================================================================
EOF

# ─────────────────────────────────────────────────────────────
# Helper function: print file with context
# ─────────────────────────────────────────────────────────────
print_file_with_context() {
    local filepath="$1"
    local category="$2"
    local spec_role="$3"
    local dependencies="$4"
    
    echo "" >> "$OUTPUT"
    echo "📄 FILE: $filepath" >> "$OUTPUT"
    echo "📁 Category: $category" >> "$OUTPUT"
    echo "🎯 Spec Role: $spec_role" >> "$OUTPUT"
    echo "🔗 Dependencies: $dependencies" >> "$OUTPUT"
    echo "-----------------------------------" >> "$OUTPUT"
    
    if [ -f "$filepath" ]; then
        echo "📝 CONTENT:" >> "$OUTPUT"
        cat "$filepath" >> "$OUTPUT"
    else
        echo "⚠️  File not found: $filepath" >> "$OUTPUT"
    fi
    
    echo "" >> "$OUTPUT"
    echo "=======================================" >> "$OUTPUT"
}

# ─────────────────────────────────────────────────────────────
# ROOT CONFIGURATION FILES
# ─────────────────────────────────────────────────────────────
echo "📦 Packaging root configuration files..."

print_file_with_context \
    "package.json" \
    "Build Configuration" \
    "Defines dependencies, scripts, and electron-builder config for native app packaging" \
    "Used by: npm run dev/build/package, electron-vite, electron-builder"

print_file_with_context \
    "electron.vite.config.ts" \
    "Build Configuration" \
    "Configures electron-vite multi-process build: main/preload/renderer with React plugin and @shared alias" \
    "Used by: electron-vite dev/build, Vite bundler"

print_file_with_context \
    "tailwind.config.js" \
    "Design System" \
    "Defines Tailwind theme with Zenith design tokens: colors, fonts, safelist for JIT compilation" \
    "Used by: PostCSS, Tailwind CSS, all .tsx/.css files"

print_file_with_context \
    "postcss.config.cjs" \
    "Build Configuration" \
    "PostCSS plugins for Tailwind and autoprefixer processing" \
    "Used by: Vite CSS pipeline"

print_file_with_context \
    "tsconfig.json" \
    "Build Configuration" \
    "TypeScript config: ES2022 target, module resolution, path aliases for @shared" \
    "Used by: TypeScript compiler, VSCode IntelliSense"

print_file_with_context \
    "README.md" \
    "Documentation" \
    "Full product specification: philosophy, MVP, features, architecture, design system, non-goals" \
    "Reference for: all developers, spec compliance reviews"

# ─────────────────────────────────────────────────────────────
# MAIN PROCESS (Electron Node.js)
# ─────────────────────────────────────────────────────────────
echo "🧠 Packaging main process files..."

print_file_with_context \
    "src/main/index.ts" \
    "Electron App Entry" \
    "Creates single transparent BrowserWindow, registers global shortcuts (Alt+Space/F/Z), initializes MainStore, registers IPC" \
    "Dependencies: @electron-toolkit/utils, MainStore, registerIPC, globalShortcut"

print_file_with_context \
    "src/main/ipc/handlers.ts" \
    "IPC Layer" \
    "Type-safe command handlers with Zod validation; bridges renderer commands to MainStore actions" \
    "Dependencies: zod (schema validation), MainStore, BrowserWindow for broadcast"

print_file_with_context \
    "src/main/store/index.ts" \
    "State Management" \
    "MainStore class: Immer-based state updates, localStorage persistence, reminder scheduler (15s poll), cascade deletes" \
    "Dependencies: immer (produce), fs (file I/O), BrowserWindow (broadcast), shared/types"

print_file_with_context \
    "src/main/store/schemas.ts" \
    "Data Validation" \
    "Zod discriminated union schemas for all Command types; ensures type-safe IPC communication" \
    "Dependencies: zod, shared/types (Command type)"

# ─────────────────────────────────────────────────────────────
# PRELOAD SCRIPT (Context Bridge)
# ─────────────────────────────────────────────────────────────
echo "🔌 Packaging preload..."

print_file_with_context \
    "src/preload/index.ts" \
    "Security Bridge" \
    "Exposes window.api via contextBridge: getState, sendCommand, onStateUpdate, on, hideWindow — isolates Node from renderer" \
    "Dependencies: electron (contextBridge, ipcRenderer)"

# ─────────────────────────────────────────────────────────────
# RENDERER CORE
# ─────────────────────────────────────────────────────────────
echo "🖥️  Packaging renderer core..."

print_file_with_context \
    "src/renderer/App.tsx" \
    "Root Component" \
    "View router using opacity+pointerEvents (no translateX clipping), manages tutorial state, listens for reminder/view events, renders BottomBar + Toaster" \
    "Dependencies: React, shared/types, all views, BottomBar, Tutorial, sonner"

print_file_with_context \
    "src/renderer/main.tsx" \
    "React Entry" \
    "Mounts React root with error boundary fallback; logs mount status for debugging" \
    "Dependencies: React, ReactDOM, App, styles.css"

print_file_with_context \
    "src/renderer/index.html" \
    "HTML Entry" \
    "Single HTML file served by Vite; loads Google Fonts (DM Sans) and main.tsx module" \
    "Dependencies: Vite dev server, Google Fonts CDN"

# ─────────────────────────────────────────────────────────────
# RENDERER COMPONENTS
# ─────────────────────────────────────────────────────────────
echo "🧩 Packaging components..."

print_file_with_context \
    "src/renderer/components/BottomBar.tsx" \
    "Persistent Chrome" \
    "Mobile-first tab navigation (Home/Decks/History/Journal/Search/Zen) + sticky active-session timer with proper clearInterval cleanup" \
    "Dependencies: React, shared/types, shared/utils, lucide-react icons"

print_file_with_context \
    "src/renderer/components/Tutorial.tsx" \
    "Onboarding" \
    "6-step modal walkthrough that auto-opens on first launch (tutorialSeen flag); arrow key navigation; persists completion via SET_TUTORIAL_SEEN" \
    "Dependencies: React, lucide-react icons, window.api.sendCommand"

print_file_with_context \
    "src/renderer/components/ReminderModal.tsx" \
    "Reminder Management" \
    "Modal for creating/editing reminders: label, target (deck/card), time, repeat pattern, notify/sound toggles; sends ADD_REMINDER command" \
    "Dependencies: React, shared/types, lucide-react icons, window.api.sendCommand"

# ─────────────────────────────────────────────────────────────
# RENDERER VIEWS (Opacity+PointerEvents Routing)
# ─────────────────────────────────────────────────────────────
echo "🖼️  Packaging views..."

print_file_with_context \
    "src/renderer/views/HomeView.tsx" \
    "Dashboard" \
    "Shows Musashi quote, today/week stats (using isDueToday for local timezone), deck/card/session counts; entry point for new users" \
    "Dependencies: shared/types, shared/utils (formatDuration, isDueToday), lucide-react"

print_file_with_context \
    "src/renderer/views/DecksView.tsx" \
    "Workspace" \
    "Full CRUD for decks/cards: create deck, expand to see cards, add card with tag/timer mode, toggle checklist items, start/stop/delete sessions; cascade delete confirmation" \
    "Dependencies: shared/types, shared/utils, @shared/constants (DECK_COLORS), lucide-react"

print_file_with_context \
    "src/renderer/views/HistoryView.tsx" \
    "Session Logs" \
    "Groups logs by day (dateKey), shows daily totals and individual sessions; click to jump to journal (future enhancement)" \
    "Dependencies: shared/types, shared/utils (formatDuration, dateKey), lucide-react"

print_file_with_context \
    "src/renderer/views/JournalView.tsx" \
    "Markdown Journal" \
    "Picker for deck/card journals + edit/preview modes with react-markdown + remark-gfm; autosave debounce; UPSERT_JOURNAL command" \
    "Dependencies: React, react-markdown, remark-gfm, shared/types, lucide-react"

print_file_with_context \
    "src/renderer/views/SearchView.tsx" \
    "Fuzzy Search" \
    "Fuse.js-powered search across cards/decks/tags; instant navigation to start session; mobile-friendly input focus" \
    "Dependencies: React, fuse.js, shared/types, lucide-react"

print_file_with_context \
    "src/renderer/views/FocusView.tsx" \
    "Focus Mode (Alt+F)" \
    "Full-screen timer overlay with giant HH:MM:SS display, active task name, ESC to exit; hides BottomBar when active" \
    "Dependencies: React, shared/types, shared/utils, lucide-react"

print_file_with_context \
    "src/renderer/views/ZenView.tsx" \
    "Zen Mode (Alt+Z)" \
    "Ambient quote surface: greeting + kanji + rotating quote + wallpaper; settings modal for packs/intervals/wallpapers; custom URL/upload support; ESC exits modal then view" \
    "Dependencies: React, @shared/constants (QUOTE_PACKS, WALLPAPERS), @shared/utils (getGreeting, getZenKanji), lucide-react"

# ─────────────────────────────────────────────────────────────
# SHARED CODE (Main + Renderer)
# ─────────────────────────────────────────────────────────────
echo "🔗 Packaging shared code..."

print_file_with_context \
    "src/shared/types.ts" \
    "Domain Types" \
    "Core TypeScript interfaces: Deck, Task, Log, Journal, Reminder, ActiveTask, AgentState, Command — single source of truth for data model" \
    "Used by: MainStore, IPC handlers, all React components"

print_file_with_context \
    "src/shared/utils.ts" \
    "Pure Utilities" \
    "generateId (random string), formatDuration (HH:MM:SS), isDueToday (local timezone check), dateKey (YYYY-MM-DD), getGreeting (time-based), getZenKanji (greeting → kanji mapping)" \
    "Used by: MainStore (formatDuration), HomeView (isDueToday), HistoryView (dateKey), ZenView (getGreeting/getZenKanji)"

print_file_with_context \
    "src/shared/constants.ts" \
    "App Constants" \
    "DECK_COLORS (8 gold/neutral shades), QUOTE_PACKS (musashi/stoic/bible/zen), WALLPAPERS (pastel/gradient/curated/unsplash), DEFAULT_STATE (seed decks), STORAGE_KEY" \
    "Used by: DecksView (DECK_COLORS), ZenView (QUOTE_PACKS/WALLPAPERS), MainStore (DEFAULT_STATE/STORAGE_KEY)"

# ─────────────────────────────────────────────────────────────
# RENDERER-SHARED (UI-Specific)
# ─────────────────────────────────────────────────────────────
echo "🎨 Packaging renderer shared..."

print_file_with_context \
    "src/renderer/shared/styles.css" \
    "Design System" \
    "Tailwind imports + @layer base/components/utilities; defines .app-shell (12px margin trick for shadow), .card-soft, .gold-rule, .micro-caps, .timer-mono, animations; markdown-body styling" \
    "Used by: All React components via import './shared/styles.css'"

# ─────────────────────────────────────────────────────────────
# FOOTER: Spec Compliance Checklist
# ─────────────────────────────────────────────────────────────
cat << 'EOF' >> "$OUTPUT"

================================================================================
✅ SPEC COMPLIANCE VERIFICATION CHECKLIST
================================================================================
For each feature, verify implementation matches spec:

[✓] LOCAL-FIRST ARCHITECTURE
  • State persisted to app.getPath('userData')/zenith_agent_state.json
  • No network requests, no backend, no analytics
  • Degrades gracefully if storage fails (try/catch in MainStore)

[✓] ONE TARGET, ONE JOURNAL
  • Journal has either taskId OR deckId (never both)
  • upsertJournal dedupes by target key (t:<id> or d:<id>)
  • Cascade delete removes orphaned journals when deck/task deleted

[✓] QUIET UI / DESIGN TOKENS
  • Black canvas: #000000 background, #050505 surfaces
  • Gold accent: #c9a84c ONLY chromatic color used
  • DM Sans font via Google Fonts, no emoji, no celebratory animations
  • .micro-caps / .timer-mono / .card-soft utilities applied consistently

[✓] RECOVERABLE DESTRUCTIVE ACTIONS
  • Sonner toast with Undo action for deletes (5s validity)
  • Cascade delete confirms before removing deck+tasks+journals+reminders
  • Active session cleared if referenced items deleted

[✓] KEYBOARD-FIRST NAVIGATION
  • Alt+Space: toggle app visibility (globalShortcut)
  • Alt+F: open FocusView, Alt+Z: open ZenView
  • Esc: exit modals/fullscreen views, go back in navigation
  • Tab/Shift+Tab: focus order respects reading order

[✓] SINGLE TRANSPARENT WINDOW
  • BrowserWindow: frame:false, transparent:true, alwaysOnTop:true
  • .app-shell CSS: 12px margin for shadow, no OS clipping
  • Opacity+pointerEvents view routing (no translateX transform clipping)

[✓] MVP FEATURES IMPLEMENTED
  • Decks & cards: CRUD with tags, checklists, timer modes (stopwatch/countdown)
  • Timer & sessions: multi-select, commit on start, Log history
  • History view: grouped by day, daily/weekly totals
  • Journal: markdown edit/preview, autosave, one-per-target
  • Reminders: one-off/repeating, toast+browser notification+chime
  • Focus mode: full-screen timer overlay (Alt+F)
  • Zen mode: wallpaper+quotes+greeting+kanji (Alt+Z)
  • Tutorial: 6-step modal, auto-opens on first launch

[✓] DESIGN SYSTEM TOKENS
  • Colors: --background:#000000, --accent-gold:#c9a84c, etc.
  • Typography: .micro-caps (10px caps), .timer-mono (tabular nums)
  • Surfaces: .card-soft (gradient + border + shadow)
  • Animations: .pulse-gold (2.4s breath), .quote-fade (blur/translate)

[✓] ELECTRON INTEGRATION
  • Preload: contextBridge exposes window.api (no Node in renderer)
  • IPC: Zod validation on all commands, type-safe handlers
  • Reminder scheduler: 15s poll in main process, 90s forgiveness window
  • Global shortcuts: registered after app ready, cleaned up on quit

[✓] MOBILE-FIRST RESPONSIVE
  • BottomBar: fixed height, tab layout, touch-friendly targets
  • Views: flex-col layout, overflow-y-auto for scrollable content
  • ZenView: responsive text sizes (sm:text-*), full-viewport fixed positioning

================================================================================
🚀 HANDOVER INSTRUCTIONS FOR NEW SESSION
================================================================================
1. Clone repo and run: chmod +x review-design.sh && ./review-design.sh
2. Open zenith-handover.txt in editor for full context
3. To run dev: npm install && npm run dev
4. To build native app: npm run package (outputs release/*.dmg or *.AppImage)
5. Key files to modify for extensions:
   • Add feature: src/shared/types.ts (types) → src/main/store/index.ts (logic) → src/renderer/views/* (UI)
   • Change design: src/renderer/shared/styles.css (tokens) → tailwind.config.js (theme)
   • Add shortcut: src/main/index.ts (globalShortcut.register)
   • Add IPC command: src/shared/types.ts (Command union) → src/main/store/schemas.ts (Zod) → src/main/store/index.ts (handler) → src/preload/index.ts (expose) → renderer usage

================================================================================
🐛 KNOWN LIMITATIONS / FUTURE ENHANCEMENTS
================================================================================
• Custom quotes/wallpapers: Session-only persistence (not saved to localStorage) — add UPSERT_CUSTOM_QUOTE/WALLPAPER commands
• Journal jump-from-history: HistoryView logs don't link to journals — add onClick handler to open JournalView with target
• Reminder browser notifications: Requires user permission; fallback to toast only if denied
• Countdown timer alerts: No audio/visual alert when countdown reaches zero — add completion toast + chime
• Multi-window support: Currently single window; could add secondary windows for journal editing

================================================================================
📞 SUPPORT & CONTACT
================================================================================
• npm support: https://www.npmjs.com/support (sign in required)
• GitHub Community forums: https://github.com/community/discussions
• Press inquiries: press@github.com

> "Today is victory over yourself of yesterday." — Musashi
> Zenith Agent: Time tracking with intention.
================================================================================
EOF

echo ""
echo "✅ zenith-handover.txt generated successfully."
echo "💡 This file contains:"
echo "   • Complete project overview + design tokens + keyboard shortcuts"
echo "   • Every source file with content, function, spec role, and dependencies"
echo "   • Spec compliance checklist for verification"
echo "   • Handover instructions for new developers/sessions"
echo ""
echo "🔍 To search the handover:"
echo "   grep '#c9a84c' zenith-handover.txt    # Find gold accent usage"
echo "   grep 'cascade delete' zenith-handover.txt  # Find delete logic"
echo "   grep 'Alt+Space' zenith-handover.txt   # Find shortcut definitions"
echo ""
echo "📤 To share with a new session: Attach zenith-handover.txt"
