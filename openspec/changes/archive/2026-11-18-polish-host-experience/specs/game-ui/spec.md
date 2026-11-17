# Spec Delta

## MODIFIED Requirements

### Requirement: Host hotkeys
The host SHALL control the game with keys: `→`/`Enter` correct, `X` wrong, `P` pass, `Space` pause/resume, `Esc` exit to menu with confirmation; `F` toggles fullscreen and `M` toggles sound on every screen. Letter keys SHALL be matched by physical key position so they work with any keyboard layout. Held-down keys SHALL NOT repeat the action. Hotkeys SHALL be ignored while focus is in an `input` or `textarea`.

#### Scenario: Typing a name
- **WHEN** focus is in the player-name input and the host types "X"
- **THEN** the letter is typed and no game action fires

#### Scenario: Ukrainian keyboard layout
- **WHEN** the host's layout is Ukrainian and they press the key labelled X (which types "ч")
- **THEN** the answer is marked wrong

#### Scenario: Held key
- **WHEN** the host holds `Space` down
- **THEN** the game pauses once and does not toggle back and forth

#### Scenario: Fullscreen and mute keys
- **WHEN** the host presses `F` and then `M` on the setup screen with no input focused
- **THEN** the page enters fullscreen and sound is muted

### Requirement: Pause overlay
While the game is paused, the game screen SHALL show a "ПАУЗА" overlay stating that both clocks are stopped, with the hotkeys cheat sheet. The photo SHALL NOT be visible while paused, and both player panels SHALL be shown frozen with their stopped times.

#### Scenario: Photo hidden while paused
- **WHEN** the host pauses during a player's turn
- **THEN** the overlay "ПАУЗА" is shown and the photo is not visible behind it

#### Scenario: Resume
- **WHEN** the host resumes
- **THEN** the overlay disappears and the same photo is shown again

#### Scenario: Cheat sheet on pause
- **WHEN** the host pauses
- **THEN** the overlay lists the hotkeys and what they do

## ADDED Requirements

### Requirement: Sound effects
The game SHALL play short sounds generated in the browser (no audio files): a chime on a correct answer, a buzz on a wrong answer or pass, a tick on each whole second of the active player's last 10 seconds, and a fanfare when the game ends. Each event SHALL sound once.

#### Scenario: Correct answer
- **WHEN** the host marks an answer correct
- **THEN** the correct chime plays once

#### Scenario: Last seconds ticking
- **WHEN** the active player's clock runs from 10.0 s down to 7.0 s
- **THEN** a tick plays at 10, 9, 8 and 7 seconds remaining and not while the clock is stopped

#### Scenario: Game over
- **WHEN** a player's time runs out
- **THEN** the game-over fanfare plays once and no tick follows

### Requirement: Mute
The host SHALL be able to mute and unmute all sounds with `M` or the setup screen toggle. The choice SHALL persist across reloads, and while muted the game header SHALL show «Звук вимкнено» in text.

#### Scenario: Muted game
- **WHEN** sound is muted and the host marks an answer wrong
- **THEN** no sound plays and the header shows «Звук вимкнено»

#### Scenario: Remembered
- **WHEN** the host mutes and reloads the page
- **THEN** sound is still muted

### Requirement: Fullscreen
The host SHALL be able to toggle browser fullscreen with `F` on any screen or with the «На весь екран» button on the setup screen. If the browser refuses, nothing else SHALL change.

#### Scenario: Leave fullscreen
- **WHEN** the page is fullscreen and the host presses `F`
- **THEN** the page leaves fullscreen

### Requirement: Host help
The setup screen SHALL offer «Як провести гру», an in-page panel with the host instructions (share this tab with audio on the video call, go fullscreen, judge with the keys, pause, exit) and the hotkeys cheat sheet. The panel SHALL close with its close button or `Esc`.

#### Scenario: Open help
- **WHEN** the host presses «Як провести гру»
- **THEN** a panel lists the sharing steps and every hotkey with its action

#### Scenario: Close help
- **WHEN** the help panel is open and the host presses `Esc`
- **THEN** the panel closes and the setup screen keeps its entries
