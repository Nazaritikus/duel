## MODIFIED Requirements

### Requirement: Photo order
Photos SHALL NOT repeat within a game, and both players SHALL draw from the same sequence. By default the photos SHALL be shuffled once per game; the shuffle SHALL be determined by a game seed so that a game can be reproduced, and a rematch uses a new seed. A game MAY instead be created with a fixed order: the photos are then shown exactly in the given order, every game and rematch of that category shows the same sequence, and the seed still decides a random first player.

#### Scenario: No repeats
- **WHEN** a category has 60 photos and 60 have been shown
- **THEN** no photo was shown twice

#### Scenario: Same seed, same order
- **WHEN** two games are created from the same photos with the same seed
- **THEN** both games show the photos in the same order

#### Scenario: Different seeds, different order
- **WHEN** two games are created from the same 60 photos with different seeds
- **THEN** the photo orders differ

#### Scenario: Fixed order
- **WHEN** a game is created with a fixed order from photos A, B, C, D
- **THEN** the photos are shown as A, B, C, D

#### Scenario: Fixed order ignores the seed
- **WHEN** two games are created with a fixed order from the same photos and different seeds
- **THEN** both games show the photos in the same order

#### Scenario: Fixed order keeps a random starter
- **WHEN** games are created with a fixed order, the first player set to random and many different seeds
- **THEN** both players start in some of those games
