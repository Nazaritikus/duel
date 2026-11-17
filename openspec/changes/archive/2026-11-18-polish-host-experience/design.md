# Design

## Context

- `GameFlow` owns setup ↔ game. `ActiveGame` drives the game through `useGame`, which re-renders every animation frame with `state` and `now`, and through `useHostHotkeys(handler)`, which is attached only in the game. `hotkeyFor(event)` matches `KeyboardEvent.code`, ignores modifiers, repeats and editable targets.
- The setup screen is a 1440×810 stage. The header holds the «DUEL» logo on the left and «Нова гра» on the right, so the header has free space for small controls.
- The pause overlay is `PauseOverlay` in `GameScreen.tsx`, with a title and one hint line.
- There are no audio assets and no audio code. The roadmap requires sounds generated in code.

## Goals / Non-Goals

**Goals:** audible feedback that survives screen sharing, one-key fullscreen and mute, and on-screen guidance for a first-time host.

**Non-Goals:** volume control, audio files, any game-rule change.

## Decisions

### 1. Cue detection is pure (`sound/cues.ts`)
`cuesBetween(prev: { state, now } | null, next: { state, now }): Cue[]`, where `Cue = 'correct' | 'wrong' | 'tick' | 'gameOver'`. The rules:
- **Phase entry:** `feedback` (when the previous phase was not feedback with the same `endsAt`) gives `correct` or `wrong` (wrong and pass share the buzz). `finished` from any other phase gives `gameOver`.
- **Tick:** both frames are in `turn` for the same player, and `s(prev) > s(next)`, where `s = ceil(remaining / 1000)` and `s(next) <= 10`. This gives one tick per whole second for 10 → 1. It never fires while paused (the phase is not `turn`) or after the end. The frame that enters the last 10 s ticks for 10.
- **Turn start in the last 10 s:** when the turn starts with ≤ 10 s left (after a correct answer), the first tick comes on the next whole-second boundary. There is no tick on entry, which avoids double sound right after the chime.

The rules are covered by unit tests built on the engine (`startedGame`, `gameReducer`).

### 2. Synth (`sound/synth.ts`)
`createSoundEngine({ createContext = () => new AudioContext() })` exposes:
- `unlock()`, which creates or resumes the context and is called on the first pointerdown/keydown;
- `play(cue)`, which is a no-op when there is no context yet.

Each cue is a small schedule of oscillator notes through one shared gain node:
- correct: two sine notes, 660 Hz then 990 Hz, 0.12 s each;
- wrong: a 140 Hz square wave for 0.35 s with a falling pitch;
- tick: a 1000 Hz triangle blip of 0.04 s;
- gameOver: triangle notes 784 → 659 → 523 → 392 Hz, 0.18 s each.

Each note has short attack and release envelopes to avoid clicks. The note tables are exported so a test can check that every cue schedules notes on a fake context.

### 3. Mute and sound wiring
- `sound/muteStorage.ts` stores `loadMuted` / `saveMuted` under `duel.sound.v1` (`{ muted: boolean }`). It is safe when storage is unavailable.
- `GameFlow` owns `muted` state (initialised from storage) and the engine (`soundEngine` prop, defaulting to the real one when `AudioContext` exists and a silent one otherwise). It passes `muted` to `ActiveGame` and `SetupScreen`.
- `useGameSounds(state, now, engine, muted)` in `ActiveGame` keeps the previous `{ state, now }` in a ref, computes the cues each frame and plays them unless muted. The ref advances even when muted, so unmuting never replays old events.

### 4. App-level hotkeys
`appHotkeyFor(event)` uses the same guards as `hotkeyFor` and maps `KeyF` → `fullscreen` and `KeyM` → `mute`. `useAppHotkeys(handler)` is attached in `GameFlow` on every screen. The game hotkeys stay separate, so `F` and `M` never reach the engine.

### 5. Fullscreen (`useFullscreen`)
- `toggle()` calls `document.documentElement.requestFullscreen()` or `document.exitFullscreen()`, and swallows rejections.
- `isFullscreen` tracks `fullscreenchange`.
- It is unsupported when `document.fullscreenEnabled` is false; the button is then hidden.

### 6. Help and cheat sheet
- `HotkeyList` renders the key list (`→ / Enter`, `X`, `P`, `Space`, `Esc`, `F`, `M`) as `<dl>` rows with `<kbd>`. It is used in `HostHelp` and in `PauseOverlay`, where it is compact, in two columns.
- `HostHelp` is an in-page dialog on the setup stage (`role="dialog"`, `aria-modal`). It has numbered steps:
  1. share this tab in Zoom / Meet / Discord and turn on «Поділитися звуком вкладки» / «Share tab audio» so players hear the sounds;
  2. press `F` for full screen;
  3. start, listen to the answer, judge with the keys;
  4. `Space` pauses (the photo is hidden), `Esc` exits.

  It closes with «Закрити» or `Esc`, and focus moves to the close button on open.
- Setup header: the right side becomes «Звук: увімк./вимк.» (a toggle button with `aria-pressed`), «На весь екран» and «Як провести гру». «Нова гра» moves next to the logo.
- Game header: «Звук вимкнено» appears before the category text while muted.

### Decisions made autonomously
1. **Wrong and pass share one buzz**; there is no separate pass sound.
2. **Ticks** on whole seconds 10 → 1 of the active clock only, with no tick on the turn's first frame.
3. **Synth timbres and frequencies** as in §2; one fixed volume (0.25 gain).
4. **`F`/`M` work on every screen**, including setup, but never while typing.
5. **Help is an in-page panel**, not a separate route; the cheat sheet is repeated on the pause overlay.
6. **The real-call test is an owner follow-up**; the tab-audio sharing hint is in the help panel.

## Risks / Trade-offs

- **Autoplay policy:** the context is created or resumed on the first gesture. The start button and every hotkey count as gestures, so the first cue (a correct answer) always has an unlocked context.
- **Video calls compress audio:** short tones with a fast attack survive better than long sweeps. The cues are kept short and mid-range.
- **Frame-based detection:** at 60 fps a whole-second crossing is always seen. A throttled background tab may skip frames, but the crossing is still detected on the next frame (a single tick, possibly late).

## Migration Plan

Frontend only. Deploy with `npx vercel deploy --prod` after verification.
