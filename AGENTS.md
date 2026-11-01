# Temple Services project guidance

- Repository: https://github.com/manojkumarparmar/templeservices
- Production website: https://templeservices.pages.dev/
- Hosting: Cloudflare Pages project `templeservices`, production branch `main`. Pushes to main trigger deployment. Preserve this hosting arrangement; do not create a replacement Sites project.
- D1 database: `templeservices-db`, binding `DB`, ID `b7b70a10-5530-44f4-a02b-a7176d940102`. Stores volunteer records, authentication, laundry updates, and backup requests.
- R2 object storage: `templeservices-photos`, binding `PHOTOS`. Stores photos; preserve private bucket access.
- Configuration lives in `wrangler.toml`; read `README.md` for deployment and authentication details. Never store credentials in project guidance or source.
- Build: `node scripts/build.mjs`. Tests require Node.js 24+: `node --test tests/*.test.mjs`.
- Existing migrations 0001 and 0002 were applied in production. Use new forward migrations for database changes; do not reapply the seed migration to the live database.
- Volunteer directory should use wide row cards with filters and sort options above the list.
- Per the user, only Nanda Kumar Das and Ajinkya are male among the existing volunteers. Women's names end in `Mtj`; Ajinkya's display name is `Ajinkya Pr`; Nanda Kumar Das remains unchanged. Add `Vaidehi Mtj` without inventing contact details or assignments.

