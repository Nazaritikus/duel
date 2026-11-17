# game-ui Specification

## Purpose
Screens shown on the shared tab: setup, countdown, game, feedback, pause, result.
Optimised for screen sharing (16:9, high contrast, large type). Host controls are keyboard-only so nothing control-related is visible on stream.

## Requirements

### Requirement: Setup screen
The setup screen SHALL collect two player names, a category (published only, with search and scroll), time per player (45/60/90 s), penalty (3/5 s) and who starts (player 1 / random). An empty name SHALL fall back to "Гравець 1" / "Гравець 2". The duel SHALL start only with a category selected. The last names and settings SHALL be pre-filled on the next visit.

#### Scenario: Only published categories
- **WHEN** a category is in draft
- **THEN** it is not listed on the setup screen

#### Scenario: Search
- **WHEN** the host types "фігу" in the category search
- **THEN** only categories whose name contains it (case-insensitive) are listed

#### Scenario: Empty name
- **WHEN** the second name is left empty and the duel starts
- **THEN** player 2 is shown as "Гравець 2"

#### Scenario: Settings remembered
- **WHEN** the host starts a duel with names "Назар" and "Олена", 90 s and a 5 s penalty, then reloads the page
- **THEN** the setup screen is pre-filled with those names and settings

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
`feedback_correct` SHALL show a green frame, the correct answer and who answers next for 2 s, with panels tagged "Правильно" / "Наступний хід". `feedback_wrong` SHALL show a red overlay, the correct answer, the penalty ("−3 с" or "−5 с") and a countdown to the next photo for the penalty's length, with the answering panel red and tagged "Помилка · штраф" / "Пас · штраф". An answer photo, if present, SHALL replace the question photo during feedback.

#### Scenario: Answer photo
- **WHEN** the photo has `answer_storage_path`
- **THEN** the answer photo is shown during feedback instead of the question photo

#### Scenario: Correct feedback
- **WHEN** the host marks player 1's answer correct
- **THEN** the correct answer is shown in green with "Наступний хід: <player 2 name>", and player 1's panel is tagged "Правильно"

#### Scenario: Pass feedback
- **WHEN** the host presses pass for player 1
- **THEN** the correct answer and "−3 с" are shown, player 1's panel is tagged "Пас · штраф" and their time keeps decreasing

#### Scenario: Five-second penalty shown
- **WHEN** the penalty is 5 s and the host marks an answer wrong
- **THEN** "−5 с" is shown and the next photo appears after 5 s

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

#### Scenario: What is preloaded
- **WHEN** photo 5 of the shuffled order is shown
- **THEN** photo 5's answer photo and photos 6–8 with their answer photos are requested and decoded in the background

### Requirement: Result screen
The result screen SHALL show the winner or "Нічия", the end reason ("Час суперника вичерпано" / "Фото закінчились"), the winner's remaining time, each player's stats (correct, wrong, pass), and actions "Реванш" and "Інша категорія". Copy SHALL not depend on the grammatical gender or case of player names.

#### Scenario: Rematch
- **WHEN** the host chooses "Реванш"
- **THEN** a new game starts with the same players, category and settings, with a fresh shuffle

#### Scenario: Another category
- **WHEN** the host chooses "Інша категорія"
- **THEN** the setup screen is shown with the same names and settings

#### Scenario: Draw
- **WHEN** photos ran out with equal time
- **THEN** the headline is "Нічия" and the reason says both players had the same time

#### Scenario: Stats
- **WHEN** player 1 finished with 14 correct, 3 wrong and 1 pass
- **THEN** player 1's card shows 14 "правильно", 3 "помилки" and 1 "пас"

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

### Requirement: Countdown screen
Before the first turn the game SHALL show a countdown screen with the category name, "Починає" and the starting player's name in their colour, the 3-2-1 number in a ring of that colour, and both players' panels frozen at their full time.

#### Scenario: Random starter shown
- **WHEN** setup chose "Випадково" and the game picked player 2
- **THEN** the countdown shows player 2's name in player 2's colour from the first second

#### Scenario: Countdown ends
- **WHEN** the number reaches zero
- **THEN** the game screen appears with the starter's first photo

### Requirement: Exit to menu
`Esc` during a game SHALL pause it and show an in-page confirmation "Вийти в меню?" (never a browser dialog). `Enter` SHALL confirm and return to the setup screen with names and settings kept; `Esc` SHALL cancel, closing the dialog and resuming the game unless the host had paused it before pressing `Esc`. While the dialog is open, other hotkeys SHALL be ignored.

#### Scenario: Confirm exit
- **WHEN** the host presses `Esc` and then `Enter`
- **THEN** the setup screen is shown with the same names, category and settings

#### Scenario: Cancel exit
- **WHEN** the host presses `Esc` during a turn and then `Esc` again
- **THEN** the dialog closes and the turn continues with the time it had when `Esc` was first pressed

#### Scenario: Cancel keeps an earlier pause
- **WHEN** the game is paused, the host presses `Esc` and then `Esc` again
- **THEN** the dialog closes and the game stays paused

#### Scenario: Judging keys ignored in the dialog
- **WHEN** the confirmation is open and the host presses `X`
- **THEN** no answer is marked and the dialog stays open

### Requirement: Category source
The setup screen SHALL list only published categories from the database with their photo counts, sorted by name, and a duel SHALL use that category's photos and answers. Draft categories SHALL NOT be listed even when the browser has a signed-in admin session. A configuration flag SHALL switch the game to the built-in mock catalog.

#### Scenario: Published only for a signed-in admin
- **WHEN** an admin is signed in on the same browser and a draft category exists
- **THEN** the setup screen does not list the draft

#### Scenario: Mock catalog
- **WHEN** the app runs with the mock flag or without database settings
- **THEN** the setup screen lists the mock catalog

### Requirement: Loading before start
Starting a duel SHALL load the category and decode its first three photos (in the shuffled order) and their answer photos before the countdown, waiting at most 8 seconds. While loading, the start button SHALL say «Завантаження…»; if the category cannot be loaded, an error SHALL be shown and the setup screen SHALL stay.

#### Scenario: First photo ready
- **WHEN** the countdown ends
- **THEN** the first photo is already decoded and appears immediately

#### Scenario: Category fails to load
- **WHEN** the database cannot be reached after «Почати дуель»
- **THEN** «Не вдалося завантажити категорію» is shown and the duel does not start

### Requirement: Photo load failure
If a photo fails to load during the game, the photo frame SHALL show «Фото не завантажилось» instead of a broken image, and the game SHALL continue normally.

#### Scenario: Broken photo
- **WHEN** the current photo's file cannot be loaded
- **THEN** the frame shows «Фото не завантажилось» and the host can still judge or pass
