# Temple Services project guidance

- Repository: https://github.com/manojkumarparmar/templeservices
- Production website: https://templeservices.pages.dev/
- Hosting: Cloudflare Pages project `templeservices`, production branch `main`. Pushes to main trigger deployment. Preserve this hosting arrangement; do not create a replacement Sites project.
- D1 database: `templeservices-db`, binding `DB`, ID `b7b70a10-5530-44f4-a02b-a7176d940102`. Stores volunteer records, authentication, laundry updates, and backup requests.
- R2 object storage: `templeservices-photos`, binding `PHOTOS`. Stores photos; preserve private bucket access.
- Phone sign-in uses Firebase Authentication, US numbers only. Preserve Cloudflare hosting and storage. Firebase requires billing, Phone enabled, the production authorized domain, a US-only SMS region policy and `FIREBASE_WEB_CONFIG` in Pages settings. See README setup steps. Never infer US eligibility from +1 alone. Do not enable test bypasses in production.
- Migrations 0003 (volunteer names) and 0004 (private phone field) were applied directly to production D1 on November 1, 2026. Krithika was also renamed Krithika Mtj directly in production. Do not reapply schema migration 0004.
- Firebase project `temple-services-513414` (number `197416540652`) is managed using `apexsteeldesigns@gmail.com`. Web app ID: `1:197416540652:web:b4ca3b782934a84d10c8c9`. Authentication Phone provider, US-only SMS policy, production authorized domain, and Blaze plan were confirmed on November 1, 2026. Blaze was activated via a Google Cloud free trial shown as expiring January 31, 2027; billing may require owner attention then. Real SMS verification remains pending a volunteer's phone number. Public web configuration is in `wrangler.toml`.
- Configuration lives in `wrangler.toml`; read `README.md` for deployment and authentication details. Never store credentials in project guidance or source.
- Build: `node scripts/build.mjs`. Tests require Node.js 24+: `node --test tests/*.test.mjs`.
- Existing migrations 0001 and 0002 were applied in production. Use new forward migrations for database changes; do not reapply the seed migration to the live database.
- Volunteer directory should use wide row cards with filters and sort options above the list.
- Notes: one non-deleted entry per volunteer/date/shift, with author-only edit and delete. Other volunteers may add separate entries. Enforce ownership and optimistic versions on the server, preserve retained photos, and reject foreign photo references. Migration 0005 was applied to production D1 on November 1, 2026; do not reapply. Deletion hides records/photos without permanent removal and permits a replacement entry.
- The Schedule tab shows a compact Monday–Sunday recurring schedule below Permanent backups. Admins, super-admins and coordinators can edit the whole week with one shared edit/save flow, using only existing active volunteers. The recurring endpoint may update assignments only, never contact details or roles, and must save atomically with conflict checks.
- Per the user, only Nanda Kumar Das and Ajinkya are male among the existing volunteers. Women's names end in `Mtj`; Ajinkya's display name is `Ajinkya Pr`; Nanda Kumar Das remains unchanged. Add `Vaidehi Mtj` without inventing contact details or assignments.

