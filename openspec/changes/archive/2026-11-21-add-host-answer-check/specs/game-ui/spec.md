## ADDED Requirements

### Requirement: Answer check screen
While an answer is being checked, the game screen SHALL show the correct answer in the answer bar and the answer photo instead of the question photo if there is one, in a neutral (not green or red) frame. The answering player's panel SHALL be tagged «Перевірка» with their stopped time, and the screen SHALL show the host hint «→ правильно · X помилка». No sound SHALL play when the check starts.

#### Scenario: Check reveals the answer
- **WHEN** the host presses `Q` while player 1 answers a photo with answer «Мона Ліза — Леонардо да Вінчі»
- **THEN** that answer is shown, player 1's panel is tagged «Перевірка», and both times stop

#### Scenario: Answer photo during a check
- **WHEN** the photo has `answer_storage_path` and the host presses `Q`
- **THEN** the answer photo replaces the question photo

#### Scenario: Verdict after a check
- **WHEN** the host presses `X` during the check
- **THEN** the usual wrong-answer feedback with the penalty follows

## MODIFIED Requirements

### Requirement: Host hotkeys
The host SHALL control the game with keys: `→`/`Enter` correct, `X` wrong, `P` pass, `Q` check the answer, `Space` pause/resume, `Esc` exit to menu with confirmation; `F` toggles fullscreen and `M` toggles sound on every screen. Letter keys SHALL match by physical position (any layout). Held keys SHALL NOT repeat. Hotkeys SHALL be ignored while typing in a text field. On a focused button, `Enter` and `Space` SHALL activate that button and SHALL NOT fire a hotkey.

#### Scenario: Typing a name
- **WHEN** focus is in the player-name input and the host types "X"
- **THEN** the letter is typed and no game action fires

#### Scenario: Ukrainian keyboard layout
- **WHEN** the host's layout is Ukrainian and they press the key labelled X (which types "ч")
- **THEN** the answer is marked wrong

#### Scenario: Check key on a Ukrainian layout
- **WHEN** the host's layout is Ukrainian and they press the key labelled Q (which types "й") during a turn
- **THEN** the answer check starts

#### Scenario: Held key
- **WHEN** the host holds `Space` down
- **THEN** the game pauses once and does not toggle back and forth

#### Scenario: Fullscreen and mute keys
- **WHEN** the host presses `F` and then `M` on the setup screen with no input focused
- **THEN** the page enters fullscreen and sound is muted

#### Scenario: Enter on a focused button
- **WHEN** the exit confirmation is open, the host moves focus to «Продовжити гру» with `Tab` and presses `Enter`
- **THEN** the dialog closes and the game continues
