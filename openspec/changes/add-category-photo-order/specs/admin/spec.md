## ADDED Requirements

### Requirement: Photo order setting
The category editor SHALL have a «Порядок фото» setting with the values «Випадковий» and «Від легких до складних», saved together with the name and hint. New and existing categories SHALL default to «Випадковий». With «Від легких до складних» the game SHALL show the photos in the editor's order.

#### Scenario: Default for a new category
- **WHEN** the admin creates a category without touching «Порядок фото»
- **THEN** the category is saved with «Випадковий»

#### Scenario: Switch to a fixed order
- **WHEN** the admin selects «Від легких до складних» and saves
- **THEN** reopening the editor shows «Від легких до складних» and players get the photos in the editor's order

### Requirement: Photo reordering
The editor SHALL show each photo's number in the current order and SHALL let the admin change the order by dragging a photo card onto another position, or with the keyboard through «Перемістити раніше» / «Перемістити пізніше» buttons on each card. Each move SHALL be saved at once, as a single change to the whole category, and SHALL only be allowed for admins. A failed save SHALL restore the previous order and show an error. The first photo SHALL remain the category's cover.

#### Scenario: Drag to reorder
- **WHEN** the admin drags photo 5 onto position 1
- **THEN** it becomes photo 1, the former photos 1–4 become 2–5, and the order is kept after a reload

#### Scenario: Keyboard move
- **WHEN** the admin focuses «Перемістити раніше» on photo 3 and presses `Enter`
- **THEN** it becomes photo 2, the former photo 2 becomes photo 3, and focus stays on the moved photo's button

#### Scenario: Ends of the list
- **WHEN** a card is the first photo
- **THEN** its «Перемістити раніше» button is disabled

#### Scenario: Failed save
- **WHEN** saving a new order fails
- **THEN** the grid returns to the previous order and an error is shown

#### Scenario: Not an admin
- **WHEN** a signed-in user who is not an admin calls the reorder operation for a category
- **THEN** the call is rejected and the positions do not change

#### Scenario: Incomplete order rejected
- **WHEN** the reorder operation is called with a list that misses one of the category's photos or contains a photo of another category
- **THEN** the call is rejected and the positions do not change

#### Scenario: Cover follows the order
- **WHEN** the admin moves another photo to position 1
- **THEN** the categories list shows that photo as the cover
