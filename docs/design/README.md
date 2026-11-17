# Design

Live canvas (source of truth, editable): https://claude.ai/artifact/GKXno9183U6HMvp5GGtsqi

`source/` holds a snapshot of the canvas files (2026-11-17). Each `*.dc.html` is one artboard in the Claude Design component format: plain HTML with inline styles, `{{holes}}` filled from the `renderVals()` script at the bottom, `<sc-for>` / `<sc-if>` for loops and conditions, `<dc-import>` to embed another artboard. They do not render standalone (they need the canvas runtime), but they are the exact reference for layout, sizes, colours and copy when implementing screens. To get images, open the canvas and use Share › Export (PNG/PDF).

## Screens

Game screens are a fixed 1440×810 (16:9) stage for screen sharing. Admin screens are 1440×900.

| Artboard | File | Notes |
|---|---|---|
| 1. Налаштування гри | `source/Main.dc.html` | Player names, category grid with search, time 45/60/90, penalty, who starts |
| 2. Гра — хід гравця | `source/Game.dc.html` | Photo + status bar. Tweaks: `mode` = `turn` / `pause` / `last10`, `active` player |
| 3. Гра — помилка / пас | `source/GameWrong.dc.html` | Red overlay, correct answer, "−3 с". Tweak `kind` = Помилка / Пас |
| 4. Гра — правильно (2 с) | `source/GameCorrect.dc.html` | Green frame, correct answer, "хід переходить до …" |
| 5. Переможець | `source/Result.dc.html` | Tweak `reason` = Час вичерпано / Фото закінчились / Нічия |
| Відлік 3-2-1 | `source/Countdown.dc.html` | Starting player and countdown |
| Пауза | `source/GamePause.dc.html` | Embeds `Game` with `mode="pause"` |
| Останні 10 с | `source/GameLast10.dc.html` | Embeds `Game` with `mode="last10"` |
| Адмінка — категорії | `source/AdminCategories.dc.html` | List with photo count (red < 60) and status |
| Адмінка — редагування категорії | `source/AdminCategoryEdit.dc.html` | Upload zone, question/answer photo slots, vertical badge |

`source/canvas.json` is the canvas index (artboard positions and titles).

## Tokens

| Token | Value | Use |
|---|---|---|
| Background | `#0B0D12` | Page |
| Surface | `#151922` | Panels, inputs |
| Surface (frozen) | `#10131A` | Frozen player panel |
| Border | `#2A3040` / `#232838` | Inputs / panels, progress track |
| Text | `#F3F4F6` | Primary |
| Text muted | `#9CA3AF` | Labels |
| Frozen text | `#C4C9D2` | Frozen player time and tag |
| Placeholder | `#8B93A1` | Input placeholders, photo placeholders |
| Player 1 | `#F5A524` | Accent, active frame |
| Player 2 | `#3BC9F5` | Accent, active frame |
| Correct | `#30A46C` (text `#4ADE80`) | Correct feedback |
| Wrong | `#E5484D` (text `#FF8B8E`) | Wrong/pass feedback, last 10 s |

Fonts: Unbounded (display, 500/700/800), Inter (body, 400–700), JetBrains Mono 700 (timers). All support Cyrillic.

Rules carried from the design audit: text contrast ≥ 4.5:1; never show state through opacity alone (video compression destroys it); timers show `m:ss`, tenths only in the last 10 s.
