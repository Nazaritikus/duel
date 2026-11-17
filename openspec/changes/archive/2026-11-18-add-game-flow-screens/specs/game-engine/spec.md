# Spec Delta

## MODIFIED Requirements

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
