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
The game screen SHALL show a header with the category name and photo number, the current photo (`object-fit: contain`, framed in the active player's colour) and a status bar with both players' names, times and remaining-time bars. The active player SHALL be highlighted in their colour and labelled "Відповідає"; the frozen player SHALL be labelled "Заморожено" and stay readable (no opacity dimming, contrast ≥ 4.5:1).

#### Scenario: Frozen player readable
- **WHEN** player 2 is frozen
- **THEN** player 2's time is shown in light grey (#C4C9D2) on the dark panel, not faded

#### Scenario: Header
- **WHEN** the 7th photo of the category "Автомобілі" is shown
- **THEN** the header reads "Категорія: Автомобілі · фото 7"

#### Scenario: Vertical photo
- **WHEN** the current photo is vertical
- **THEN** it is shown whole, centred, with dark space on both sides, not cropped or stretched

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
`feedback_correct` SHALL show a green frame, the correct answer and who answers next for 2 s, with panels tagged "Правильно" / "Наступний хід". `feedback_wrong` SHALL show a red overlay, the correct answer, "−3 с" and a countdown to the next photo for 3 s, with the answering panel red and tagged "Помилка · штраф" / "Пас · штраф". An answer photo, if present, SHALL replace the question photo during feedback.

#### Scenario: Answer photo
- **WHEN** the photo has `answer_storage_path`
- **THEN** the answer photo is shown during feedback instead of the question photo

#### Scenario: Correct feedback
- **WHEN** the host marks player 1's answer correct
- **THEN** the correct answer is shown in green with "Наступний хід: <player 2 name>", and player 1's panel is tagged "Правильно"

#### Scenario: Pass feedback
- **WHEN** the host presses pass for player 1
- **THEN** the correct answer and "−3 с" are shown, player 1's panel is tagged "Пас · штраф" and their time keeps decreasing

### Requirement: Host hotkeys
The host SHALL control the game with keys: `→`/`Enter` correct, `X` wrong, `P` pass, `Space` pause/resume, `Esc` exit to menu with confirmation. Letter keys SHALL be matched by physical key position so they work with any keyboard layout. Held-down keys SHALL NOT repeat the action. Hotkeys SHALL be ignored while focus is in an `input` or `textarea`.

#### Scenario: Typing a name
- **WHEN** focus is in the player-name input and the host types "X"
- **THEN** the letter is typed and no game action fires

#### Scenario: Ukrainian keyboard layout
- **WHEN** the host's layout is Ukrainian and they press the key labelled X (which types "ч")
- **THEN** the answer is marked wrong

#### Scenario: Held key
- **WHEN** the host holds `Space` down
- **THEN** the game pauses once and does not toggle back and forth

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

### Requirement: Fixed 16:9 stage
Game screens SHALL be laid out on a fixed 1440×810 stage that is scaled uniformly to fit the browser window, centred and letterboxed on the page background, so the shared tab always shows the whole layout at the same proportions.

#### Scenario: Wide window
- **WHEN** the window is 2560×1080
- **THEN** the stage is scaled to 1920×1080, centred horizontally, with background-coloured bars left and right, and nothing is cropped

#### Scenario: Narrow window
- **WHEN** the window is 1280×1024
- **THEN** the stage is scaled to 1280×720, centred vertically, and nothing is cropped

### Requirement: Pause overlay
While the game is paused, the game screen SHALL show a "ПАУЗА" overlay stating that both clocks are stopped. The photo SHALL NOT be visible while paused, and both player panels SHALL be shown frozen with their stopped times.

#### Scenario: Photo hidden while paused
- **WHEN** the host pauses during a player's turn
- **THEN** the overlay "ПАУЗА" is shown and the photo is not visible behind it

#### Scenario: Resume
- **WHEN** the host resumes
- **THEN** the overlay disappears and the same photo is shown again
