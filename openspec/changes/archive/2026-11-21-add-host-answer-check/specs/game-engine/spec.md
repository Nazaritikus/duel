## ADDED Requirements

### Requirement: Answer check
While a player is answering, the host SHALL be able to check the answer: the game enters `checking` for that player and both clocks stop. `checking` SHALL last until the host marks the answer correct, wrong or pass, which then behaves exactly as from a turn. There SHALL be no way back to the same turn, and a second check SHALL be ignored. Checks SHALL NOT be counted in the statistics.

#### Scenario: Check stops both clocks
- **WHEN** player 1 has 20.0 s left and the host checks the answer, then waits 10 s
- **THEN** both players' times are unchanged after the 10 s

#### Scenario: Correct after a check
- **WHEN** the host checks player 1's answer and then marks it correct
- **THEN** the game enters `feedback_correct` for 2 s and the turn passes to player 2, as without a check

#### Scenario: Wrong after a check
- **WHEN** the penalty is 3 s, player 1 has 20.0 s left, and the host checks the answer and then marks it wrong
- **THEN** after the 3 s feedback player 1 has 17.0 s left and gets a new photo

#### Scenario: Second check ignored
- **WHEN** the game is checking player 1's answer and the host checks again
- **THEN** nothing changes

#### Scenario: Check outside a turn
- **WHEN** the host checks during the countdown, feedback, pause or after the game has finished
- **THEN** nothing changes

## MODIFIED Requirements

### Requirement: Pause
The host SHALL be able to pause and resume from any active state (countdown, a player answering, an answer check, feedback). While paused, both clocks SHALL stop and any countdown or feedback timer SHALL be suspended; after resuming, they SHALL continue with the time they had left, and a check SHALL continue with both clocks stopped. Pausing SHALL have no effect after the game has finished or while already paused; resuming SHALL have no effect unless paused.

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

#### Scenario: Pause during a check
- **WHEN** the host pauses while checking player 1's answer and resumes later
- **THEN** the game is checking player 1's answer again with both clocks stopped

#### Scenario: Pause after the game finished
- **WHEN** the game has finished and the host presses pause
- **THEN** the final state does not change

### Requirement: Host input outside an active turn
Host verdicts (correct, wrong, pass) SHALL only take effect while a player is answering or their answer is being checked. Verdicts received during the countdown, during feedback, while paused or after the game has finished SHALL be ignored and SHALL NOT change clocks, turn order, statistics or the current photo.

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
