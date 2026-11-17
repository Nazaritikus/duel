# admin Specification

## Purpose
Admin panel for managing categories and photos stored in Supabase.

## Requirements

### Requirement: Admin authentication
The admin panel (`/admin/*`) SHALL require Supabase Auth login (email magic link) for a single admin. Writes to `categories`, `photos` and the `photos` storage bucket SHALL be allowed only for the admin via RLS; anonymous users SHALL read only published categories and their photos.

#### Scenario: Anonymous write blocked
- **WHEN** an anonymous client inserts into `photos`
- **THEN** RLS rejects the write

### Requirement: Category management
The admin SHALL create, edit (name, hint), publish and unpublish categories. The list SHALL show name, photo count (red when below 60), status and last update.

#### Scenario: Publish blocked below minimum
- **WHEN** the admin publishes a category with fewer than 60 photos or any photo without an answer
- **THEN** publishing is refused with the reason shown

### Requirement: Bulk photo upload
The admin SHALL upload photos by drag & drop. A file name SHALL become the answer (`fiat-500.jpg` → «Fiat 500»). A file named `<name>.answer.<ext>` SHALL be attached as the answer photo of `<name>.<ext>`. Images SHALL be compressed client-side (about 1600 px, WebP) and `is_vertical` SHALL be detected.

#### Scenario: Answer photo pairing
- **WHEN** `fiat-500.jpg` and `fiat-500.answer.jpg` are uploaded together
- **THEN** one photo is created with the second file as its answer photo

### Requirement: Photo editing
Each photo card SHALL allow inline editing of the single answer (no alternative answers), adding/replacing/removing the answer photo, and deleting the photo together with its storage files. Vertical photos SHALL carry a "вертикальне" badge.

#### Scenario: Delete photo
- **WHEN** the admin deletes a photo that has an answer photo
- **THEN** the row and both storage objects are removed
