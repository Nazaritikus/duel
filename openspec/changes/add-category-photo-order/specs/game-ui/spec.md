## MODIFIED Requirements

### Requirement: Category source
The setup screen SHALL list only published categories from the database with their photo counts, sorted by name, and a duel SHALL use that category's photos, answers and photo order setting (shuffled, or the order set in the admin). Draft categories SHALL NOT be listed even when the browser has a signed-in admin session. A configuration flag SHALL switch the game to the built-in mock catalog.

#### Scenario: Published only for a signed-in admin
- **WHEN** an admin is signed in on the same browser and a draft category exists
- **THEN** the setup screen does not list the draft

#### Scenario: Mock catalog
- **WHEN** the app runs with the mock flag or without database settings
- **THEN** the setup screen lists the mock catalog

#### Scenario: Category with a fixed order
- **WHEN** a published category is set to «Від легких до складних» and the host starts a duel and then a rematch with it
- **THEN** both games show the photos in the category's order
