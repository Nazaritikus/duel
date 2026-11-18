## 1. Database

- [x] 1.1 Run `npx supabase migration new lower_publish_minimum`: `create or replace function public.enforce_publish_rule()` with `total < 50`, the same body otherwise. Re-apply the `revoke execute`.
- [x] 1.2 `tests/db/publish.test.ts`: reject 49 answered photos, reject 50 with one blank, publish 50. Run `npm run db:reset` and `npm run test:db`.

## 2. Admin UI

- [x] 2.1 `publishRules.ts`: set `MIN_PHOTOS = 50`. Update `publishRules.test.ts` and `AdminRoutes.test.tsx` (red count below 50, «Потрібно щонайменше 50 фото, зараз 12»).

## 3. Verify, deploy, record

- [x] 3.1 Run `npm test`, `npm run build`, `npm run lint` and `npx @fission-ai/openspec validate --all --strict`.
- [x] 3.2 Update CLAUDE.md (publish rule ≥ 50) and the roadmap.
- [ ] 3.3 Cloud: `npx supabase db push --remote` and `npx vercel deploy --prod` (after the owner approves the commit).
