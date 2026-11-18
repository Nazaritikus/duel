## MODIFIED Requirements

### Requirement: Bulk photo upload
The admin SHALL upload photos by drag & drop. A file name SHALL become the answer (`fiat-500.jpg` → «Fiat 500»). A file named `<name>.answer.<ext>` SHALL be attached as the answer photo of `<name>.<ext>`. Images SHALL be compressed client-side (about 1600 px, WebP) and `is_vertical` SHALL be detected. Progress SHALL be shown as a progress bar with the processed count; assistive technology SHALL be told when the batch finishes, not after every file. Leaving the editor (in-app navigation, reload or closing the tab) while files are still uploading SHALL ask for confirmation first.

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

#### Scenario: Leaving during an upload
- **WHEN** 40 of 72 files are uploaded and the admin clicks «← Категорії»
- **THEN** the admin is asked to confirm leaving; cancelling keeps the editor open and the upload running

### Requirement: Photo editing
Each photo card SHALL allow inline editing of the single answer (no alternative answers), adding/replacing/removing the answer photo, and deleting the photo together with its storage files. Vertical photos SHALL carry a "вертикальне" badge. Deleting SHALL ask in an in-page modal dialog whose actions are «Видалити» and «Скасувати», with focus starting on «Скасувати» and returning to the card's delete button when cancelled. Pressing Enter while composing text with an input method SHALL NOT save the answer.

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
- **THEN** a dialog asks for confirmation with focus on «Скасувати», and nothing is deleted until «Видалити» is pressed

#### Scenario: Cancel delete returns focus
- **WHEN** the admin opens the delete dialog for a photo and presses `Esc`
- **THEN** the dialog closes, nothing is deleted and focus is on that card's delete button

#### Scenario: Replace answer photo
- **WHEN** the admin picks a new answer photo for a photo that already has one
- **THEN** the new file replaces the old one in storage and on the card

### Requirement: Content storage layout
Photo files SHALL be stored in a private storage bucket `photos` under `<category_id>/<photo_id>.<ext>`, with the answer photo at `<category_id>/<photo_id>.answer.<ext>`. Files SHALL be readable only through the access rules, never through permanent public URLs. A photo row's file paths SHALL be rejected unless they start with its own category's folder. Admin clients SHALL only be able to upload raster images (WebP, JPEG, PNG, AVIF); vector files are reserved for trusted maintenance scripts.

#### Scenario: Published photo readable
- **WHEN** an anonymous client requests a signed URL for a photo of a published category
- **THEN** the URL is issued and the file can be downloaded

#### Scenario: Draft photo not readable
- **WHEN** an anonymous client requests a photo file of a draft category
- **THEN** the request is rejected

#### Scenario: Path outside the category folder
- **WHEN** a photo of category A is saved with a storage path under category B's folder
- **THEN** the write is rejected

#### Scenario: SVG upload by an admin
- **WHEN** a signed-in admin uploads an SVG file to the `photos` bucket
- **THEN** the upload is rejected

### Requirement: Data integrity
Deleting a category SHALL delete its photo rows. Each photo's position SHALL be unique within its category. A category's last-update time SHALL change when the category or any of its photos is created, changed or deleted; a single write that touches many photos of one category SHALL update that category once.

#### Scenario: Cascade delete
- **WHEN** the admin deletes a category with 60 photos
- **THEN** no photo rows of that category remain

#### Scenario: Duplicate position
- **WHEN** two photos of the same category are saved with the same position
- **THEN** the second save is rejected

#### Scenario: Photo change updates the category
- **WHEN** the admin edits a photo's answer
- **THEN** the category's last-update time becomes the time of that edit

#### Scenario: Bulk insert
- **WHEN** 60 photos of one category are inserted in a single request
- **THEN** the category's last-update time changes and the category row is updated once

### Requirement: Category list search
The categories list SHALL filter by a case-insensitive substring of the name as the admin types, and SHALL show an empty-state message when nothing matches. The query SHALL be kept in the page address so that a reload or the browser's back button restores it.

#### Scenario: Search by name
- **WHEN** the admin types «авто» in the search field
- **THEN** only categories whose name contains «авто» in any case are listed

#### Scenario: Reload keeps the search
- **WHEN** the admin has typed «авто» and reloads the page
- **THEN** the search field still contains «авто» and the list is filtered

### Requirement: Category editor fields
The editor SHALL edit the name (required, 1–60 characters after trimming) and an optional player hint, and SHALL show a summary of the photo count, photos without an answer and vertical photos. Saving an invalid name SHALL be refused with the reason shown next to the field and focus moved to the name field. Leaving the editor (in-app navigation, reload or closing the tab) with unsaved name or hint changes SHALL ask for confirmation first.

#### Scenario: Create a category
- **WHEN** the admin enters a name and saves a new category
- **THEN** it is created as a draft and appears in the list

#### Scenario: Empty name
- **WHEN** the admin saves a category with an empty or blank name
- **THEN** nothing is saved, the name field shows the reason and has focus

#### Scenario: Unsaved changes
- **WHEN** the admin edits the hint without saving and clicks «← Категорії»
- **THEN** the admin is asked to confirm; confirming leaves without saving, cancelling keeps the edit

#### Scenario: Saved changes
- **WHEN** the admin saves the edits and then clicks «← Категорії»
- **THEN** the list opens without a confirmation

### Requirement: Delete category
The editor SHALL delete a category only after confirmation in an in-page modal dialog with the actions «Видалити» and «Скасувати» (focus starting on «Скасувати»), removing its storage files as well as its row and photo rows.

#### Scenario: Confirmed delete
- **WHEN** the admin confirms deleting a category with photos
- **THEN** its files, photo rows and row are gone and the list no longer shows it

#### Scenario: Cancelled delete
- **WHEN** the admin cancels the confirmation
- **THEN** nothing is deleted and focus returns to «Видалити категорію»

## ADDED Requirements

### Requirement: Maintenance script environment
Scripts that target the cloud project SHALL read `.env.local` in preference to `.env`, the same precedence as the browser build.

#### Scenario: Env precedence
- **WHEN** `.env` and `.env.local` both define `VITE_SUPABASE_URL` with different values and a script runs with `--remote`
- **THEN** the script uses the value from `.env.local`

### Requirement: Non-destructive re-seed
Re-running the seed SHALL never leave a seeded category without photos: new files and rows SHALL be in place before the old ones are removed, and a failure SHALL leave the previous photos intact. The seed SHALL refuse to run when more than one category has the name it is about to seed.

#### Scenario: Re-seed keeps photos visible
- **WHEN** the seed refills a published mock category
- **THEN** at every moment players can load that category with at least its previous or its new photos

#### Scenario: Duplicate seeded name
- **WHEN** two categories are named «Цифри» and the seed runs
- **THEN** the seed stops with an error naming the duplicate and changes nothing for that category

### Requirement: Orphaned file cleanup
A cleanup script SHALL list storage files whose category or photo row no longer exists and SHALL delete them only when explicitly asked.

#### Scenario: Orphan dry run
- **WHEN** a category row was deleted directly in the database and the cleanup script runs without `--apply`
- **THEN** it lists that category's files and deletes nothing

#### Scenario: Orphan cleanup
- **WHEN** the cleanup script runs with `--apply`
- **THEN** the listed files are deleted and files of existing photos are untouched
