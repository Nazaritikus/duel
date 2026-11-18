## MODIFIED Requirements

### Requirement: Category management
The admin SHALL create, edit (name, hint), publish and unpublish categories. The list SHALL show name, photo count (red when below 50), status and last update.

#### Scenario: Publish blocked below minimum
- **WHEN** the admin publishes a category with fewer than 50 photos or any photo without an answer
- **THEN** publishing is refused with the reason shown

### Requirement: Publish rule enforced by the database
Setting a category's status to published SHALL be refused by the database itself, not only by the UI, when it has fewer than 50 photos or any photo with an empty answer. Trusted maintenance scripts running with the secret key SHALL be exempt so the mock catalog can be seeded.

#### Scenario: Admin bypasses the UI
- **WHEN** an admin client sets `status = 'published'` through the API on a category with 49 answered photos
- **THEN** the write is rejected and the category stays a draft

#### Scenario: Valid publish
- **WHEN** an admin publishes a category with 50 photos that all have answers
- **THEN** the category becomes published

#### Scenario: Seed script
- **WHEN** the seed script publishes a mock category of 12 photos with the secret key
- **THEN** the write succeeds
