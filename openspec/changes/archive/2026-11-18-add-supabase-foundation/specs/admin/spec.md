# Spec Delta

## ADDED Requirements

### Requirement: Content storage layout
Photo files SHALL be stored in a private storage bucket `photos` under `<category_id>/<photo_id>.<ext>`, with the answer photo at `<category_id>/<photo_id>.answer.<ext>`. Files SHALL be readable only through the access rules, never through permanent public URLs.

#### Scenario: Published photo readable
- **WHEN** an anonymous client requests a signed URL for a photo of a published category
- **THEN** the URL is issued and the file can be downloaded

#### Scenario: Draft photo not readable
- **WHEN** an anonymous client requests a photo file of a draft category
- **THEN** the request is rejected

### Requirement: Data integrity
Deleting a category SHALL delete its photo rows. Each photo's position SHALL be unique within its category. A category's last-update time SHALL change when the category or any of its photos is created, changed or deleted.

#### Scenario: Cascade delete
- **WHEN** the admin deletes a category with 60 photos
- **THEN** no photo rows of that category remain

#### Scenario: Duplicate position
- **WHEN** two photos of the same category are saved with the same position
- **THEN** the second save is rejected

#### Scenario: Photo change updates the category
- **WHEN** the admin edits a photo's answer
- **THEN** the category's last-update time becomes the time of that edit

## MODIFIED Requirements

### Requirement: Admin authentication
The admin panel (`/admin/*`) SHALL require Supabase Auth login (email magic link) for admins identified by an allowlist kept in the database (one or more people), not by an email in code. Writes to `categories`, `photos` and the `photos` storage bucket SHALL be allowed only for the admin via RLS; anonymous users and signed-in non-admins SHALL read only published categories and their photos.

#### Scenario: Anonymous write blocked
- **WHEN** an anonymous client inserts into `photos`
- **THEN** RLS rejects the write

#### Scenario: Draft hidden from the public
- **WHEN** an anonymous client lists categories while one is in draft
- **THEN** the draft category and its photos are not returned

#### Scenario: Signed-in non-admin
- **WHEN** a signed-in user who is not on the admin allowlist updates a category
- **THEN** RLS rejects the write

#### Scenario: Second admin
- **WHEN** a content editor's email is added to the allowlist and they sign in
- **THEN** they can create and edit categories like the owner

#### Scenario: Admin writes
- **WHEN** the admin creates a draft category and uploads a photo file to it
- **THEN** both succeed and the admin can read the draft
