# Spec Delta

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

#### Scenario: Admin page without a session
- **WHEN** a visitor without a session opens any `/admin` page other than the login page
- **THEN** they are sent to the login page and no admin data is requested

#### Scenario: Signed-in non-admin opens the admin
- **WHEN** a signed-in user who is not on the allowlist opens `/admin`
- **THEN** a no-access message with a logout button is shown instead of the admin pages

### Requirement: Category management
The admin SHALL create, edit (name, hint), publish and unpublish categories. The list SHALL show name, photo count (red when below 60), status and last update.

#### Scenario: Publish blocked below minimum
- **WHEN** the admin publishes a category with fewer than 60 photos or any photo without an answer
- **THEN** publishing is refused with the reason shown

## ADDED Requirements

### Requirement: Magic link login
The login page SHALL send a magic link to the entered email that returns the user to the admin. A link SHALL be sent only to an existing user; requesting one SHALL NOT create an account. After a request the page SHALL show the same confirmation whether or not the address is known, so it does not reveal who has access.

#### Scenario: Known admin requests a link
- **WHEN** an admin enters their email and requests a link, then opens it
- **THEN** they are signed in and land on the categories list

#### Scenario: Unknown email
- **WHEN** someone enters an email that has no account
- **THEN** no account is created and the page shows the same confirmation as for a known email

#### Scenario: Logout
- **WHEN** the admin presses «Вийти»
- **THEN** the session ends and the login page is shown

### Requirement: Category list search
The categories list SHALL filter by a case-insensitive substring of the name as the admin types, and SHALL show an empty-state message when nothing matches.

#### Scenario: Search by name
- **WHEN** the admin types «авто» in the search field
- **THEN** only categories whose name contains «авто» in any case are listed

### Requirement: Category editor fields
The editor SHALL edit the name (required, 1–60 characters after trimming) and an optional player hint, and SHALL show a summary of the photo count, photos without an answer and vertical photos. Saving an invalid name SHALL be refused with the reason shown next to the field.

#### Scenario: Create a category
- **WHEN** the admin enters a name and saves a new category
- **THEN** it is created as a draft and appears in the list

#### Scenario: Empty name
- **WHEN** the admin saves a category with an empty or blank name
- **THEN** nothing is saved and the name field shows the reason

### Requirement: Publish rule enforced by the database
Setting a category's status to published SHALL be refused by the database itself, not only by the UI, when it has fewer than 60 photos or any photo with an empty answer. Trusted maintenance scripts running with the secret key SHALL be exempt so the mock catalog can be seeded.

#### Scenario: Admin bypasses the UI
- **WHEN** an admin client sets `status = 'published'` through the API on a category with 59 answered photos
- **THEN** the write is rejected and the category stays a draft

#### Scenario: Valid publish
- **WHEN** an admin publishes a category with 60 photos that all have answers
- **THEN** the category becomes published

#### Scenario: Seed script
- **WHEN** the seed script publishes a mock category of 12 photos with the secret key
- **THEN** the write succeeds

### Requirement: Publish reasons
The editor SHALL list every reason a category cannot be published (too few photos, with the current count; photos without an answer, with their number) and SHALL disable publishing while any reason applies. A published category that no longer meets the rule SHALL show the same reasons as a warning.

#### Scenario: Two reasons
- **WHEN** a draft has 12 photos and 3 of them have no answer
- **THEN** the editor lists both reasons and the publish button is disabled

#### Scenario: Unpublish
- **WHEN** the admin unpublishes a published category
- **THEN** it becomes a draft and is no longer visible to players

### Requirement: Delete category
The editor SHALL delete a category only after an in-page confirmation, removing its storage files as well as its row and photo rows.

#### Scenario: Confirmed delete
- **WHEN** the admin confirms deleting a category with photos
- **THEN** its files, photo rows and row are gone and the list no longer shows it

#### Scenario: Cancelled delete
- **WHEN** the admin cancels the confirmation
- **THEN** nothing is deleted
