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
The game SHALL start with a 3-2-1 countdown (3 s) showing who starts. Both clocks SHALL be stopped during the countdown. The starting player SHALL be player 1 or random, per setup; a random choice SHALL be made once when the game is created.

#### Scenario: Countdown ends
- **WHEN** the countdown reaches zero
- **THEN** the starting player's first photo is shown and their clock starts

#### Scenario: Clocks stopped during countdown
- **WHEN** 2 s of the countdown have elapsed
- **THEN** both players still have their full starting time

#### Scenario: Random starting player is known during the countdown
- **WHEN** setup chooses a random starting player
- **THEN** the starting player is fixed and shown from the first moment of the countdown, and the same game seed always picks the same player

### Requirement: Correct answer
When the host marks an answer correct, the game SHALL enter `feedback_correct` for 2 s with both clocks stopped, then pass the turn to the other player with a new photo.

#### Scenario: Turn passes after a correct answer
- **WHEN** the host marks player 1's answer correct
- **THEN** both clocks stop for 2 s, and then player 2's clock starts with the next photo

### Requirement: Wrong answer or pass
Wrong answer and pass SHALL behave identically, differing only in the label ("Помилка · штраф" / "Пас · штраф"). The game SHALL enter `feedback_wrong` for the penalty chosen in setup (3 s or 5 s, default 3 s) while the same player's clock keeps running (this is the penalty), then show the same player a new photo.

#### Scenario: Penalty consumes the player's time
- **WHEN** the penalty is 3 s and the host marks player 1's answer wrong with 20.0 s left
- **THEN** after the 3 s feedback player 1 has 17.0 s left and gets a new photo

#### Scenario: Five-second penalty
- **WHEN** the penalty is 5 s and the host marks player 1's answer wrong with 20.0 s left
- **THEN** after the 5 s feedback player 1 has 15.0 s left and gets a new photo

#### Scenario: Pass
- **WHEN** the host presses pass
- **THEN** the result is the same as a wrong answer with the label "Пас · штраф"

### Requirement: Pause
The host SHALL be able to pause and resume from any active state (countdown, a player answering, feedback). While paused, both clocks SHALL stop and any countdown or feedback timer SHALL be suspended; after resuming, they SHALL continue with the time they had left. Pausing SHALL have no effect after the game has finished or while already paused; resuming SHALL have no effect unless paused.

#### Scenario: Pause during penalty
- **WHEN** the host pauses 1 s into a 3 s penalty and resumes later
- **THEN** the remaining 2 s of the penalty continue after resuming

#### Scenario: Clocks do not run while paused
- **WHEN** player 1 has 30.0 s left, the host pauses for 10 s and resumes
- **THEN** player 1 still has 30.0 s left at the moment of resuming

#### Scenario: Pause during correct feedback
- **WHEN** the host pauses 0.5 s into the 2 s correct feedback and resumes later
- **THEN** the turn passes to the other player 1.5 s after resuming

#### Scenario: Pause during countdown
- **WHEN** the host pauses 1 s into the countdown and resumes later
- **THEN** the countdown continues with 2 s left

#### Scenario: Pause after the game finished
- **WHEN** the game has finished and the host presses pause
- **THEN** the final state does not change

### Requirement: Photo order
Photos SHALL be shuffled once per game and SHALL NOT repeat within a game. Both players draw from the same sequence. The shuffle SHALL be determined by a game seed so that a game can be reproduced; a rematch uses a new seed.

#### Scenario: No repeats
- **WHEN** a category has 60 photos and 60 have been shown
- **THEN** no photo was shown twice

#### Scenario: Same seed, same order
- **WHEN** two games are created from the same photos with the same seed
- **THEN** both games show the photos in the same order

#### Scenario: Different seeds, different order
- **WHEN** two games are created from the same 60 photos with different seeds
- **THEN** the photo orders differ

### Requirement: End of game
The game SHALL end when a player's time reaches 0 (that player loses), immediately, even during a penalty. If the category runs out of photos, the game SHALL end when the feedback for the last photo ends, and the player with more remaining time SHALL win; times SHALL be compared truncated to tenths of a second, and equal truncated times SHALL be a draw. There is no undo of host decisions.

#### Scenario: Time runs out during penalty
- **WHEN** player 1 has 1.5 s left and answers wrong
- **THEN** the game finishes at 0:00 after 1.5 s with player 2 as the winner, without waiting for the rest of the feedback

#### Scenario: Photos run out
- **WHEN** the last photo is answered and player 1 has 14.2 s, player 2 has 9.8 s
- **THEN** player 1 wins with reason "Фото закінчились"

#### Scenario: Draw
- **WHEN** photos run out and both players have 12.3 s
- **THEN** the result is a draw

#### Scenario: Draw within the same tenth
- **WHEN** photos run out with player 1 at 12.34 s and player 2 at 12.39 s
- **THEN** the result is a draw

#### Scenario: Wrong answer on the last photo
- **WHEN** player 1 answers the last photo wrong with 10.0 s left while player 2 has 8.5 s
- **THEN** the game finishes after the 3 s penalty with player 2 as the winner (7.0 s against 8.5 s) and reason "Фото закінчились"

### Requirement: Statistics
The engine SHALL count, per player, correct answers, wrong answers and passes, for the result screen.

#### Scenario: Stats on finish
- **WHEN** the game finishes
- **THEN** each player's correct, wrong and pass counts are available

### Requirement: Host input outside an active turn
Host actions (correct, wrong, pass) SHALL only take effect while a player is answering. Actions received during the countdown, during feedback, while paused or after the game has finished SHALL be ignored and SHALL NOT change clocks, turn order, statistics or the current photo.

#### Scenario: Double press during correct feedback
- **WHEN** the host marks player 1's answer correct and presses "correct" again during the 2 s feedback
- **THEN** the second press is ignored and the turn passes to player 2 exactly once

#### Scenario: Press during wrong feedback
- **WHEN** the host presses "wrong" during an ongoing 3 s penalty
- **THEN** the penalty is not extended or restarted

#### Scenario: Press after the game finished
- **WHEN** the game has finished and the host presses "correct"
- **THEN** the final state does not change

#### Scenario: Press during countdown
- **WHEN** the host presses "correct" during the countdown
- **THEN** nothing changes and the starting player's first turn begins when the countdown ends

#### Scenario: Press while paused
- **WHEN** the game is paused and the host presses "wrong"
- **THEN** nothing changes and no wrong answer is counted
