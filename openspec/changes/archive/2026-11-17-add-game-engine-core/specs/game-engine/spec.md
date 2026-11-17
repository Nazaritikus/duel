# Spec Delta

## ADDED Requirements

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
