# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
