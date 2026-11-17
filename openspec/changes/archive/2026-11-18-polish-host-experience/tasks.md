# Tasks

## 1. Sound

- [x] 1.1 `sound/cues.ts` `cuesBetween` (design §1) with engine-based tests: correct, wrong and pass each sound once; ticks at 10…1 only for the active turn; none while paused; game over once and no tick after; no replay when the same feedback persists.
- [x] 1.2 `sound/synth.ts` `createSoundEngine` (design §2) with a fake AudioContext test: no sound before unlock, each cue schedules its notes, resume on unlock.
- [x] 1.3 `sound/muteStorage.ts` with tests; `useGameSounds` in `ActiveGame`; `muted` state and `soundEngine` prop in `GameFlow`; unlock on first pointer/key. Component test with a fake engine: correct → `play('correct')`; muted → nothing; mute persists.

## 2. Hotkeys, fullscreen, help

- [x] 2.1 `appHotkeyFor` / `useAppHotkeys` (`F`, `M`) and `useFullscreen`, with tests (ignored in inputs, toggles, refused request harmless).
- [x] 2.2 `HotkeyList`, `HostHelp` dialog and the new setup header controls (sound toggle, fullscreen, help); «Звук вимкнено» in the game header; cheat sheet on the pause overlay. Component tests: help opens/closes with Esc, the setup toggle mutes, the header indicator, the pause overlay lists the keys.

## 3. Verification and deploy

- [x] 3.1 `npm test`, `npm run test:db`, `npm run build`, `npm run lint`, `openspec validate --all --strict`.
- [ ] 3.2 Browser check: setup header and help panel against the stage design, sounds audible in a real game (correct, wrong, last 10 s, game over), `F` and `M`. _Visual part done (setup header, help panel, pause cheat sheet, `M` indicator, production). Hearing the sounds and real fullscreen need a person: left for the owner (see `docs/autonomous-run.md`)._
- [x] 3.3 `npx vercel deploy --prod`; verify production. Test game over Zoom / Meet → owner follow-up in `docs/autonomous-run.md`.
