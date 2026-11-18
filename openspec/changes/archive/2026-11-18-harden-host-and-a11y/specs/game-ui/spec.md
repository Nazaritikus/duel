## MODIFIED Requirements

### Requirement: Setup screen
The setup screen SHALL collect two player names, a category (published only, with search and scroll), time per player (45/60/90 s), penalty (3/5 s) and who starts (player 1 / random). An empty name SHALL fall back to "Гравець 1" / "Гравець 2". The duel SHALL start only with a category selected. The last names and settings SHALL be pre-filled on the next visit. Time, penalty, starter and the category grid SHALL each be a single-choice group that the keyboard moves through with the arrow keys and that assistive technology announces as a group of options. A category name SHALL never overflow its card: names longer than two lines are cut with an ellipsis. Player-name inputs and the category search SHALL not show spellcheck or autocorrect marks.

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

#### Scenario: Arrow keys in an option group
- **WHEN** focus is on the selected "60 с" option and the host presses `→`
- **THEN** "90 с" becomes selected and focused

#### Scenario: Long category name
- **WHEN** a category name is 60 characters long
- **THEN** its card shows at most two lines of the name followed by an ellipsis, and the photo count stays visible

### Requirement: Host hotkeys
The host SHALL control the game with keys: `→`/`Enter` correct, `X` wrong, `P` pass, `Space` pause/resume, `Esc` exit to menu with confirmation; `F` toggles fullscreen and `M` toggles sound on every screen. Letter keys SHALL be matched by physical key position so they work with any keyboard layout. Held-down keys SHALL NOT repeat the action. Hotkeys SHALL be ignored while focus is in an `input` or `textarea`. When focus is on a button, `Enter` and `Space` SHALL activate that button and SHALL NOT fire a hotkey.

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

#### Scenario: Enter on a focused button
- **WHEN** the exit confirmation is open, the host moves focus to «Продовжити гру» with `Tab` and presses `Enter`
- **THEN** the dialog closes and the game continues

### Requirement: Exit to menu
`Esc` during a game SHALL pause it and show an in-page confirmation "Вийти в меню?" (never a browser dialog). `Enter` SHALL confirm and return to the setup screen with names and settings kept; `Esc` SHALL cancel, closing the dialog and resuming the game unless the host had paused it before pressing `Esc`. While the dialog is open, other hotkeys SHALL be ignored. Focus SHALL start on «Вийти», SHALL stay inside the dialog while it is open (the game behind it cannot be focused), and SHALL return to where it was when the dialog is cancelled.

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

#### Scenario: Focus stays in the dialog
- **WHEN** the confirmation is open and the host presses `Tab` repeatedly
- **THEN** focus moves only between «Продовжити гру» and «Вийти» (and the browser chrome), never to the game behind

### Requirement: Host help
The setup screen SHALL offer «Як провести гру», an in-page panel with the host instructions (share this tab with audio on the video call, go fullscreen, judge with the keys, pause, exit) and the hotkeys cheat sheet. The panel SHALL close with its close button or `Esc`. While the panel is open the setup form behind it SHALL not be focusable, and on close focus SHALL return to «Як провести гру».

#### Scenario: Open help
- **WHEN** the host presses «Як провести гру»
- **THEN** a panel lists the sharing steps and every hotkey with its action

#### Scenario: Close help
- **WHEN** the help panel is open and the host presses `Esc`
- **THEN** the panel closes and the setup screen keeps its entries

#### Scenario: Focus returns to the trigger
- **WHEN** the host opens the help panel and closes it with «Закрити»
- **THEN** focus is on «Як провести гру»

### Requirement: Result screen
The result screen SHALL show the winner or "Нічия", the end reason ("Час суперника вичерпано" / "Фото закінчились"), the winner's remaining time, each player's stats (correct, wrong, pass), and actions "Реванш" and "Інша категорія". Copy SHALL not depend on the grammatical gender or case of player names. When the screen appears, focus SHALL be on "Реванш".

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

#### Scenario: Keyboard rematch
- **WHEN** the result screen appears and the host presses `Enter`
- **THEN** the rematch starts

## ADDED Requirements

### Requirement: Screen-share text hygiene
The shared tab SHALL render native controls (scrollbars, search fields, focus and selection colours) in the dark theme. Browser auto-translation SHALL not alter the logo, player names or hotkey labels. Numbers SHALL not be separated from their units across a line break («45 с», «12 фото»). A long answer in the answer bar SHALL wrap to at most two lines with an ellipsis and never cover the photo frame beyond the bar.

#### Scenario: Dark scrollbars
- **WHEN** the category grid has more categories than fit and scrolls
- **THEN** its scrollbar is drawn in the dark theme

#### Scenario: Auto-translate
- **WHEN** the browser translates the page into English
- **THEN** "DUEL", the player names and the key labels stay unchanged

#### Scenario: Long answer
- **WHEN** an answer is 120 characters long
- **THEN** the answer bar shows two lines ending with an ellipsis
