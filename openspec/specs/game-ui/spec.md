# game-ui Specification

## Purpose
Screens shown on the shared tab: setup, countdown, game, feedback, pause, result.
Optimised for screen sharing (16:9, high contrast, large type). Host controls are keyboard-only so nothing control-related is visible on stream.

## Requirements

### Requirement: Setup screen
The setup screen SHALL collect two player names, a category (published only, with search and scroll), time per player (45/60/90 s), penalty (3 s) and who starts (player 1 / random).

#### Scenario: Only published categories
- **WHEN** a category is in draft
- **THEN** it is not listed on the setup screen

### Requirement: Game screen
The game screen SHALL show the current photo (`object-fit: contain`, vertical photos centred on a dark background) and a bottom status bar with both players' names, times and progress bars. The active player SHALL be highlighted with their colour; the frozen player SHALL be labelled "Заморожено" and remain readable (no opacity dimming, text contrast ≥ 4.5:1).

#### Scenario: Frozen player readable
- **WHEN** player 2 is frozen
- **THEN** player 2's time is shown in light grey (#C4C9D2) on the dark panel, not faded

### Requirement: Timer format
Times SHALL be shown as `m:ss`. In the last 10 s the active player's time SHALL show tenths (`0:07.4`) with a red frame and the label "Останні секунди". Displayed time SHALL be truncated to the shown precision, never rounded up, so a timer shows `0:00` / `0:00.0` only in its final fraction and the shown time never exceeds the real remaining time.

#### Scenario: Last 10 seconds
- **WHEN** the active player's time drops below 10 s
- **THEN** the timer shows tenths and the panel turns red

#### Scenario: Truncation
- **WHEN** a player has 42.9 s left and is not in the last 10 s, or 7.46 s left in the last 10 s
- **THEN** the timer shows `0:42`, or `0:07.4`

#### Scenario: Full minute
- **WHEN** a player has exactly 60 s left
- **THEN** the timer shows `1:00`

### Requirement: Feedback states
`feedback_correct` SHALL show a green frame and the correct answer for 2 s. `feedback_wrong` SHALL show a red overlay, the correct answer and "−3 с" for 3 s. If the photo has an answer photo, it SHALL replace the question photo during feedback.

#### Scenario: Answer photo
- **WHEN** the photo has `answer_storage_path`
- **THEN** the answer photo is shown during feedback instead of the question photo

### Requirement: Host hotkeys
The host SHALL control the game with keys: `→`/`Enter` correct, `X` wrong, `P` pass, `Space` pause/resume, `Esc` exit to menu with confirmation. Hotkeys SHALL be ignored while focus is in an `input` or `textarea`.

#### Scenario: Typing a name
- **WHEN** focus is in the player-name input and the host types "X"
- **THEN** the letter is typed and no game action fires

### Requirement: Preloading
The next 2–3 photos and their answer photos SHALL be preloaded so a new photo appears without delay.

#### Scenario: Instant next photo
- **WHEN** the turn passes
- **THEN** the next photo is already decoded and displays without a loading state

### Requirement: Result screen
The result screen SHALL show the winner or "Нічия", the end reason ("Час суперника вичерпано" / "Фото закінчились"), each player's stats, and actions "Реванш" and "Інша категорія".

#### Scenario: Rematch
- **WHEN** the host chooses "Реванш"
- **THEN** a new game starts with the same players, category and settings, with a fresh shuffle
