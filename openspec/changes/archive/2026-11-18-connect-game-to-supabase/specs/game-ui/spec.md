# Spec Delta

## MODIFIED Requirements

### Requirement: Preloading
The next 2–3 photos and their answer photos SHALL be preloaded so a new photo appears without delay.

#### Scenario: Instant next photo
- **WHEN** the turn passes
- **THEN** the next photo is already decoded and displays without a loading state

#### Scenario: What is preloaded
- **WHEN** photo 5 of the shuffled order is shown
- **THEN** photo 5's answer photo and photos 6–8 with their answer photos are requested and decoded in the background

## ADDED Requirements

### Requirement: Category source
The setup screen SHALL list only published categories from the database with their photo counts, sorted by name, and a duel SHALL use that category's photos and answers. Draft categories SHALL NOT be listed even when the browser has a signed-in admin session. A configuration flag SHALL switch the game to the built-in mock catalog.

#### Scenario: Published only for a signed-in admin
- **WHEN** an admin is signed in on the same browser and a draft category exists
- **THEN** the setup screen does not list the draft

#### Scenario: Mock catalog
- **WHEN** the app runs with the mock flag or without database settings
- **THEN** the setup screen lists the mock catalog

### Requirement: Loading before start
Starting a duel SHALL load the category and decode its first three photos (in the shuffled order) and their answer photos before the countdown, waiting at most 8 seconds. While loading, the start button SHALL say «Завантаження…»; if the category cannot be loaded, an error SHALL be shown and the setup screen SHALL stay.

#### Scenario: First photo ready
- **WHEN** the countdown ends
- **THEN** the first photo is already decoded and appears immediately

#### Scenario: Category fails to load
- **WHEN** the database cannot be reached after «Почати дуель»
- **THEN** «Не вдалося завантажити категорію» is shown and the duel does not start

### Requirement: Photo load failure
If a photo fails to load during the game, the photo frame SHALL show «Фото не завантажилось» instead of a broken image, and the game SHALL continue normally.

#### Scenario: Broken photo
- **WHEN** the current photo's file cannot be loaded
- **THEN** the frame shows «Фото не завантажилось» and the host can still judge or pass
