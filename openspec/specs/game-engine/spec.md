# game-engine Specification

## Purpose
Pure, UI-independent game logic for a two-player duel: chess-clock timers, turn
passing, penalties, pause and end-of-game resolution. Implemented as a reducer /
state machine (`setup → countdown → turn → feedback_correct | feedback_wrong → … → finished`, plus `paused`).

## Requirements

### Requirement: Chess-clock timers
Each player SHALL have an independent timer (default 60 s, configurable 45/60/90 s). Only the active player's timer SHALL run. Remaining time SHALL be derived from `performance.now()` timestamps, never from counting ticks.

#### Scenario: Only the active clock runs
- **WHEN** player 1 is answering
- **THEN** player 1's time decreases and player 2's time stays frozen

#### Scenario: Background tab does not cause drift
- **WHEN** rendering is throttled for several seconds
- **THEN** the remaining time after resuming equals the real elapsed time, not the number of rendered frames

### Requirement: Countdown before the first turn
The game SHALL start with a 3-2-1 countdown showing who starts. Both clocks SHALL be stopped during the countdown. The starting player SHALL be player 1 or random, per setup.

#### Scenario: Countdown ends
- **WHEN** the countdown reaches zero
- **THEN** the starting player's first photo is shown and their clock starts

### Requirement: Correct answer
When the host marks an answer correct, the game SHALL enter `feedback_correct` for 2 s with both clocks stopped, then pass the turn to the other player with a new photo.

#### Scenario: Turn passes after a correct answer
- **WHEN** the host marks player 1's answer correct
- **THEN** both clocks stop for 2 s, and then player 2's clock starts with the next photo

### Requirement: Wrong answer or pass
Wrong answer and pass SHALL behave identically, differing only in the label ("Помилка · штраф" / "Пас · штраф"). The game SHALL enter `feedback_wrong` for 3 s while the same player's clock keeps running (this is the penalty), then show the same player a new photo.

#### Scenario: Penalty consumes the player's time
- **WHEN** the host marks player 1's answer wrong with 20.0 s left
- **THEN** after the 3 s feedback player 1 has 17.0 s left and gets a new photo

#### Scenario: Pass
- **WHEN** the host presses pass
- **THEN** the result is the same as a wrong answer with the label "Пас · штраф"

### Requirement: Pause
The host SHALL be able to pause and resume from any active state. While paused, both clocks SHALL stop and any feedback timer SHALL be suspended.

#### Scenario: Pause during penalty
- **WHEN** the host pauses 1 s into a 3 s penalty and resumes later
- **THEN** the remaining 2 s of the penalty continue after resuming

### Requirement: Photo order
Photos SHALL be shuffled once per game and SHALL NOT repeat within a game. Both players draw from the same sequence.

#### Scenario: No repeats
- **WHEN** a category has 60 photos and 60 have been shown
- **THEN** no photo was shown twice

### Requirement: End of game
The game SHALL end when a player's time reaches 0 (that player loses), immediately, even during a penalty. If the category runs out of photos, the player with more remaining time SHALL win; equal time (to 0.1 s) SHALL be a draw. There is no undo of host decisions.

#### Scenario: Time runs out during penalty
- **WHEN** player 1 has 1.5 s left and answers wrong
- **THEN** the game finishes at 0:00 after 1.5 s with player 2 as the winner, without waiting for the rest of the feedback

#### Scenario: Photos run out
- **WHEN** the last photo is answered and player 1 has 14.2 s, player 2 has 9.8 s
- **THEN** player 1 wins with reason "Фото закінчились"

#### Scenario: Draw
- **WHEN** photos run out and both players have 12.3 s
- **THEN** the result is a draw

### Requirement: Statistics
The engine SHALL count, per player, correct answers, wrong answers and passes, for the result screen.

#### Scenario: Stats on finish
- **WHEN** the game finishes
- **THEN** each player's correct, wrong and pass counts are available

### Requirement: Host input outside an active turn
Host actions (correct, wrong, pass) SHALL only take effect while a player is answering. Actions received during feedback or after the game has finished SHALL be ignored and SHALL NOT change clocks, turn order or the current photo.

#### Scenario: Double press during correct feedback
- **WHEN** the host marks player 1's answer correct and presses "correct" again during the 2 s feedback
- **THEN** the second press is ignored and the turn passes to player 2 exactly once

#### Scenario: Press during wrong feedback
- **WHEN** the host presses "wrong" during an ongoing 3 s penalty
- **THEN** the penalty is not extended or restarted

#### Scenario: Press after the game finished
- **WHEN** the game has finished and the host presses "correct"
- **THEN** the final state does not change
