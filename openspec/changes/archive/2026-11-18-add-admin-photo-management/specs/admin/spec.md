# Spec Delta

## MODIFIED Requirements

### Requirement: Bulk photo upload
The admin SHALL upload photos by drag & drop. A file name SHALL become the answer (`fiat-500.jpg` → «Fiat 500»). A file named `<name>.answer.<ext>` SHALL be attached as the answer photo of `<name>.<ext>`. Images SHALL be compressed client-side (about 1600 px, WebP) and `is_vertical` SHALL be detected.

#### Scenario: Answer photo pairing
- **WHEN** `fiat-500.jpg` and `fiat-500.answer.jpg` are uploaded together
- **THEN** one photo is created with the second file as its answer photo

#### Scenario: Answer from file name
- **WHEN** `eiffel_tower.jpg` and `iPhone-15.png` are uploaded
- **THEN** their answers are «Eiffel Tower» and «iPhone 15»

#### Scenario: Answer photo for an existing photo
- **WHEN** the category already has a photo answered «Fiat 500» and `fiat-500.answer.jpg` is uploaded alone
- **THEN** the file becomes that photo's answer photo and no new photo is created

#### Scenario: Unmatched answer photo
- **WHEN** `ghost.answer.jpg` is uploaded and no photo matches «Ghost»
- **THEN** nothing is uploaded for it and the file is listed as an error with the reason

#### Scenario: Compression and orientation
- **WHEN** a 4000×3000 JPEG taken in portrait orientation is uploaded
- **THEN** the stored file is at most 1600 px on its longer side and the photo is marked vertical

#### Scenario: Progress and failures
- **WHEN** 72 files are uploaded and one cannot be decoded
- **THEN** the editor shows progress while uploading, 71 photos are created after the existing ones, and the failed file is listed by name

### Requirement: Photo editing
Each photo card SHALL allow inline editing of the single answer (no alternative answers), adding/replacing/removing the answer photo, and deleting the photo together with its storage files. Vertical photos SHALL carry a "вертикальне" badge.

#### Scenario: Delete photo
- **WHEN** the admin deletes a photo that has an answer photo
- **THEN** the row and both storage objects are removed

#### Scenario: Edit answer
- **WHEN** the admin changes an answer and leaves the field or presses Enter
- **THEN** the trimmed answer is saved and the category's counts update

#### Scenario: Empty answer marked
- **WHEN** a photo has no answer
- **THEN** its card has a red border and says «Немає відповіді»

#### Scenario: Delete needs confirmation
- **WHEN** the admin presses the delete button on a card
- **THEN** the card asks for confirmation and nothing is deleted until it is confirmed

#### Scenario: Replace answer photo
- **WHEN** the admin picks a new answer photo for a photo that already has one
- **THEN** the new file replaces the old one in storage and on the card

## ADDED Requirements

### Requirement: Category cover
The categories list SHALL show each category's first photo (lowest position) as its cover, and a neutral placeholder when the category has no photos.

#### Scenario: Cover from the first photo
- **WHEN** a category has photos
- **THEN** the list shows the photo with the lowest position as its cover

### Requirement: Production access
The app SHALL be deployed to a public production URL where the admin panel works, and a magic link requested there SHALL return the user to the admin on that URL.

#### Scenario: Editor signs in on production
- **WHEN** an allowlisted editor requests a magic link on the production URL and opens it
- **THEN** they are signed in to the admin on the production URL
