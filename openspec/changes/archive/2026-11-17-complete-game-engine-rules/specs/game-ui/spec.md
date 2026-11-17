# Spec Delta

## MODIFIED Requirements

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
