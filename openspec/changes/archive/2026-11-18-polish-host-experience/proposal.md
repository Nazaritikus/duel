# Proposal

## Why

The duel runs end to end on real data, but the host still runs it silently from memory: there are no sounds that make the moment land for players on the call, no quick way to go full screen, and nothing on screen tells a new host which keys to press or how to share the tab. This phase closes that before real games over Zoom / Meet.

## What Changes

**Sounds (generated in code with the Web Audio API, no audio files):**
- correct: a short rising two-note chime;
- wrong and pass: a short low buzz;
- last 10 seconds: a soft tick on every whole second of the active player's clock;
- game over: a short descending fanfare;
- the audio context starts on the host's first click or key press (browser autoplay rules), so the first sound is never lost.

**Mute:**
- `M` toggles sound anywhere in the app (except while typing);
- a «Звук» toggle on the setup screen;
- while muted, the game header shows «Звук вимкнено»;
- the choice is remembered in the browser.

**Fullscreen:** `F` toggles browser fullscreen anywhere (except while typing), and the setup screen has a «На весь екран» button.

**Host help:**
- a «Як провести гру» button on the setup screen opens an in-page panel with the host instructions: share this tab with audio in Zoom / Meet / Discord, go full screen, judge with the keys, pause, exit;
- the panel includes the hotkeys cheat sheet;
- the pause overlay also shows the cheat sheet, so the host can look it up mid-game.

**Game rules:** no change.

**Out of scope:**
- Volume control.
- Custom sound packs or audio files.
- The test game over a real call: that is an owner follow-up, not code.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`game-ui`:**
  - "Host hotkeys" adds `F` (fullscreen) and `M` (mute);
  - "Pause overlay" shows the hotkeys;
  - added "Sound effects", "Mute", "Fullscreen" and "Host help".

## Impact

- **New:**
  - `src/features/play/sound/*` (synth cues, cue detection from state changes, audio engine, mute storage);
  - `useFullscreen`, `HostHelp` and the hotkeys list component;
  - tests for each.
- **Changed:**
  - `useHostHotkeys` (app-level keys);
  - `GameFlow`, `SetupScreen`, `GameScreen` (header indicator, pause overlay);
  - `flow.css` / `play.css`.
- **Deploy:** production redeploy at the end.
