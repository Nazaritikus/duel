# Duel — фази імплементації

> Первинний план фаз (17.11.2026), перенесений із claude.ai-проєкту «Duel».
> Актуальний статус і підсумки фаз — `docs/roadmap.md`; цей файл не оновлюється.

Одна фаза = одна OpenSpec-зміна (`/openspec-propose` → `/openspec-apply-change` → `/openspec-archive-change`).
Розмір фази: 1–3 вечори, приблизно 5–12 задач, один чіткий результат, який можна перевірити.
Правила гри: `openspec/specs/game-engine`, екрани: `game-ui`, адмінка: `admin`. Дизайн: https://claude.ai/artifact/GKXno9183U6HMvp5GGtsqi (знімок — `docs/design/`)

**Порядок:** спершу гра, яку можна зіграти офлайн на локальних фото (фази 1–4), потім бекенд і адмінка (5–7), далі гра на реальних даних (8) і поліровка (9). Тож уже після фази 4 можна зіграти першу дуель із друзями.

```
1 engine-core ─► 2 engine-rules ─► 3 play-screen ─► 4 game-flow   (MVP офлайн)
                                                       │
5 supabase-foundation ─► 6 admin-categories ─► 7 admin-photos
                                                       │
                                     8 game-on-supabase ─► 9 polish
```

---

## Фаза 1 — `add-game-engine-core`
**Мета:** чиста логіка ходу без UI.
- `src/game`: типи (`GameState`, `Player`, `Photo`, `Action`), reducer
- Шахові годинники на `performance.now()`: дія `tick(now)`, у state зберігаються позначки часу, а не кількість тіків
- `correct` → `feedback_correct` 2 с (обидва годинники стоять) → хід суперника
- `wrong` / `pass` → `feedback_wrong` 3 с (годинник гравця йде) → той самий гравець, нове фото
- Кінець гри, коли час = 0, зокрема посеред штрафу
- Vitest: перехід ходу, штраф, кінець часу під час штрафу, відсутність дрейфу

**Поза scope:** countdown, пауза, кінець фото, статистика, UI.
**Готово, коли:** `npm test` зелений, у reducer немає імпортів React/Supabase.
**Prompt:** `/openspec-propose "game engine core: chess clocks, turns, correct/wrong/pass feedback, time-out"`

## Фаза 2 — `complete-game-engine-rules`
**Мета:** усі правила з `game-engine` spec.
- Стан `countdown` (3-2-1, хто починає: гравець 1 / випадково)
- `pause` / `resume` з будь-якого активного стану; таймер feedback теж стоїть
- Shuffle фото без повторів (seedable, щоб тести були детерміновані)
- Кінець фото: перемагає той, у кого більше часу; рівний час (до 0.1 с) — нічия
- Статистика: правильні, помилки, паси
- Хелпер форматування часу (`m:ss`, десяті в останні 10 с)
- Vitest на всі сценарії зі spec

**Поза scope:** UI.
**Готово, коли:** кожен Scenario з `game-engine/spec.md` покритий тестом.
**Prompt:** `/openspec-propose "complete game engine rules: countdown, pause, shuffle, photos exhausted and draw, stats, time formatting"`

## Фаза 3 — `add-play-screen`
**Мета:** ігровий екран, на якому можна грати з клавіатури.
- App shell: routing (`/`, `/play`, `/admin/*` як заглушка), шрифти (Unbounded, Inter, JetBrains Mono), design tokens (CSS variables з `CLAUDE.md`)
- `Stage` 16:9, масштабується під вікно
- Ігровий екран: фото (`object-fit: contain`), status bar, активний / «Заморожено», стан «Останні 10 с»
- Feedback-стани: зелений (2 с), червоний (3 с, «Помилка» / «Пас»), відповідь, фото відповіді, якщо є
- Hook `useGameLoop` (rAF → `tick`), hook `useHostHotkeys` (ігнорувати, коли фокус в input)
- Mock-категорія: JSON + кілька картинок у `public/mock/`

**Поза scope:** налаштування, результат, пауза-оверлей, Supabase.
**Готово, коли:** `/play` з mock-даними можна пройти до кінця за допомогою клавіш; вигляд збігається з дизайном.
**Prompt:** `/openspec-propose "play screen: stage 16:9, photo, status bar, feedback states, host hotkeys, mock category"`

## Фаза 4 — `add-game-flow-screens` ✅ MVP офлайн
**Мета:** повний цикл гри від налаштувань до реваншу.
- Екран налаштувань: імена, категорія (з mock-списку, пошук + прокрутка), час 45/60/90, хто починає
- Екран відліку 3-2-1
- Оверлей паузи (`Space`), вихід `Esc` з підтвердженням
- Екран результату: переможець / нічия, причина, статистика, «Реванш», «Інша категорія»
- Component tests на Setup → Game → Result

**Поза scope:** Supabase, звуки.
**Готово, коли:** можна зіграти дуель повністю, з реваншем, на mock-даних.
**Prompt:** `/openspec-propose "game flow: setup, countdown, pause overlay, result and rematch"`

## Фаза 5 — `add-supabase-foundation`
**Мета:** бекенд та інфраструктура.
- Міграції: `categories`, `photos` (з `answer_storage_path`, `is_vertical`, `position`), індекси, `updated_at` trigger
- RLS: anon читає тільки published-категорії та їхні фото; писати може тільки адмін (email у `app_metadata` або allowlist)
- Storage bucket `photos` + policies
- Згенеровані TS-типи (`supabase gen types`), `src/lib/supabase.ts`
- Seed-скрипт з mock-категорією
- Vercel: проєкт, env vars, preview deploy

**Поза scope:** UI адмінки.
**Готово, коли:** міграції застосовуються на чисту БД; anon не може писати (перевірено SQL-тестом або скриптом); preview deploy відкривається.
**Prompt:** `/openspec-propose "supabase foundation: schema, RLS, storage bucket, generated types, seed, vercel deploy"`

## Фаза 6 — `add-admin-categories`
**Мета:** вхід в адмінку та керування категоріями.
- Логін magic link, `RequireAdmin` guard для `/admin/*`, logout
- Список категорій: назва, кількість фото (червоним < 60), статус, дата
- Створення / редагування (назва, підказка)
- Publish / unpublish з валідацією (≥60 фото, у всіх є відповідь) і повідомленням про причину

**Поза scope:** фото.
**Готово, коли:** адмін створює категорію, а її публікацію блокує валідація.
**Prompt:** `/openspec-propose "admin auth and categories: magic link, guard, list, create/edit, publish validation"`

## Фаза 7 — `add-admin-photo-management`
**Мета:** наповнення категорій фото.
- Bulk upload drag & drop з прогресом
- Стиснення на клієнті (~1600px, WebP), визначення `is_vertical`
- Назва файлу → відповідь; `<name>.answer.<ext>` → фото відповіді
- Сітка карток: inline-редагування відповіді, додати / замінити / прибрати фото відповіді, позначка «вертикальне»
- Видалення фото разом з файлами в Storage
- Unit-тести на парсинг назв файлів і pairing

**Поза scope:** зміна порядку фото drag & drop (не потрібна, бо фото перемішуються).
**Готово, коли:** категорію з 60+ фото можна наповнити за кілька хвилин і опублікувати.
**Prompt:** `/openspec-propose "admin photo management: bulk upload, compression, filename answers, answer photos, edit and delete"`

## Фаза 8 — `connect-game-to-supabase`
**Мета:** гра на реальних даних.
- Налаштування беруть published-категорії з Supabase (замість mock)
- Перед стартом завантажуються фото категорії, Storage URLs
- Preload 2–3 наступних фото разом із фото відповідей (`img.decode()`)
- Стани завантаження й помилок (немає мережі, порожня категорія)
- Mock-режим лишається для розробки (через env flag)

**Готово, коли:** дуель на опублікованій категорії йде без затримок при зміні фото.
**Prompt:** `/openspec-propose "connect game to supabase: published categories, photo loading, preloading with answer photos"`

## Фаза 9 — `polish-host-experience`
**Мета:** готово до першої справжньої гри.
- Звуки: правильно, помилка, тікання в останні 10 с, кінець гри; mute toggle
- Fullscreen-кнопка
- Шпаргалка hotkeys та інструкція для ведучого на екрані налаштувань («шарити вкладку + share audio, не перемикатися»)
- Production deploy, перевірка у Zoom / Meet (читабельність після стиснення)

**Готово, коли:** проведена тестова гра через відеодзвінок.
**Prompt:** `/openspec-propose "polish host experience: sounds, fullscreen, hotkeys cheat sheet, host instructions, production deploy"`
