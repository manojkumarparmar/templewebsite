# Temple Services — persistent project memory

Session date: November 1, 2026, America/Chicago. This records work actually performed and user preferences. Historical roster information is not a seed or an instruction to overwrite live records.

## Repository and production

- GitHub: https://github.com/manojkumarparmar/templeservices
- Website: https://templeservices.pages.dev/
- Checkout for this chat: `C:/Users/mparm/Documents/Codex/2026-11-01/on-the-website-for-the-volunteer/work`.
- Cloudflare Pages project `templeservices`; pushing `main` automatically deploys. Continue using Cloudflare, not a replacement Sites/Firebase Hosting project.
- `wrangler.toml` declares Pages output `dist`, D1 binding `DB` (`templeservices-db`, ID `b7b70a10-5530-44f4-a02b-a7176d940102`), and private R2 binding `PHOTOS` (`templeservices-photos`). D1 stores people, assignments, authentication, notes, and backups. R2 stores photos, served through application endpoints.
- Cloudflare account used by the owner: `apexsteeldesigns@gmail.com`; GitHub is associated with `mparmar.ufl@gmail.com`. These are separate from volunteer permissions.
- Build `node scripts/build.mjs`; tests `node --test tests/*.test.mjs` require Node 24+. Cloudflare server check: `npx --offline wrangler pages functions build functions --outdir .wrangler/verify` when Wrangler is cached.

## Volunteer directory and presentation

- Wide, full-width row cards replace the prior card grid; name/roles, recurring service, and availability are arranged across the row on larger screens.
- Controls above the list: search by name/availability; role filter; service-day filter; sorting by name A–Z/Z–A or most recurring shifts; matching count and no-results state.
- Existing admin/super-admin permissions remain for adding/editing volunteer profiles, private emails/phone numbers, roles, availability, active status and assignments. Super-admin protection and self-demotion restrictions remain.
- Add volunteer and Edit volunteer are visible to authorized signed-in administrators. One normal Sign in button is retained; the extra “Sign in to manage volunteers” button was removed at the user's request.
- Removed introductory/help text: “View the schedule without signing in.”, “Sign in with an administrator account to add people or edit volunteer details.”, “Recurring service assignments, availability, and roles.”, and the long “Use Add volunteer…” instruction.
- Do not display empty-state filler “No availability notes added.” or “No recurring shifts assigned.” Empty availability/service headings are omitted; meaningful notes and assignments still display.
- Instructions tab has a prominent warning-colored “Work in progress” banner: the page is still being prepared and users should check with the coordinator for current service guidance.

## Names and last observed roster

- User specified only Nanda Kumar Das and Ajinkya were male in the original roster. Women use the `Mtj` suffix. Ajinkya was renamed `Ajinkya Pr`; Nanda Kumar Das was unchanged.
- Added Vaidehi Mtj with no invented contact information or assignments. User subsequently added her phone and assigned admin, coordinator, volunteer and backup roles through the website. Do not promote her again or require an email if configured phone sign-in supplies her login method.
- Krithika existed in live D1 beyond the original seed and was renamed Krithika Mtj directly.
- Last live directory read in this chat showed 18 active people: Ajinkya Pr, Divya Rupini Mtj, Hema Mtj, Hema Sirasha Mtj, Kalyani Mtj, Krithika Mtj, Manjuali Mtj, Nanda Kumar Das, Padma Sakhi Mtj, Renuka Mtj, Roopal Mtj, Sangeeta Patel Mtj, Shiromani Radha Mtj, Sreeja Mtj, Sulakshna Mtj, Swetha Mtj, Vaidehi Mtj and Vishaka Mtj.
- At that read, Manjuali had admin/headpujari/coordinator roles, Nanda had super-admin/coordinator roles, and Vaidehi had admin/coordinator/volunteer/backup roles; the others had volunteer roles. Eleven people had phone numbers, seven had none. No availability notes were entered. Contacts are deliberately not copied into memory; read D1 when explicitly needed.
- The user edits people and assignments through the live website. D1 is authoritative. In particular, Shiromani Radha is the current Tuesday evening name and Krithika is Friday evening; do not replace them from the older static fallback.

## Recurring weekly schedule

- Schedule tab ends with a compact recurring week below Permanent backups. Monday–Sunday, Morning and Evening columns, just names or Unassigned; no per-day/per-shift action buttons in view mode.
- One Edit recurring schedule button for signed-in admin/super-admin/coordinator roles. Each shift has a multi-person checkbox picker populated only from existing active volunteers. Empty assignments and multiple volunteers are allowed.
- One Save recurring schedule button commits the whole week and returns to view mode; Cancel discards the draft. Saving updates D1 assignments, the rolling schedule and directory.
- `/api/recurring/save` only updates assignments, not contacts or roles. The whole week is saved atomically in one guarded statement; version/roster conflicts reject all changes rather than partially saving. Coordinators do not gain profile editing or private contact visibility.
- Implementation: `recurring.js`, `server/volunteers.mjs`, Schedule markup/styles in `index.html`.

## Notes: one entry, author-only editing and deletion

- Each person may have one non-deleted entry per service date/shift; other people can add independent entries for the same day/shift.
- Add Notes becomes Edit Notes after that user saves. The editor preloads checklist, text and photos. It offers Save Notes, Cancel and Delete Notes. Users, including administrators, cannot edit/delete someone else's entry; server checks use volunteer IDs rather than display names.
- While editing, hide the saved preview of that same entry; show it again after save/cancel. Keep other people's entries visible. Background refresh must preserve the editing draft and keep the duplicate preview hidden.
- Optimistic versions prevent lost edits; an operation ID makes save retries idempotent. Retained photos must belong to the entry. New photos use unique R2 keys; failed saves clean up uploads; removed attachments are cleaned up.
- Delete is a soft delete in D1. Deleted entries disappear from schedules and their photos are no longer served by the application; author can add a new entry afterward. No permanent retention cleanup is enabled.
- On the user's explicit request, the experimental Sunday November 1, 2026 morning entry `01ff5bc9-3fda-49d9-9f50-d18530b6439c` was soft-deleted directly in D1. Verified zero remaining visible notes on that specific shift. Sunday evening was not cleared.
- Implementation: `server/api.mjs` and `index.html`; APIs `/api/updates` and `/api/updates/delete`.

## Shift action permissions

- Signed-out visitors can view the schedule but see no shift action buttons. The normal Sign in button remains.
- Signed-in active volunteers can Add/Edit Notes only on yesterday/today shifts; no notes action on future shifts.
- Need backup appears only today/future and only for that shift's currently assigned volunteer or any coordinator/admin/super-admin. A confirmed replacement can request another backup; the replaced original volunteer no longer qualifies solely from the original assignment.
- Ordinary volunteers can request backup only in their own name. Privileged roles may request on behalf of others. Server enforces both assignment and date rules, not just button visibility.
- Opt for backup on a pending request remains available to signed-in active volunteers. Existing backup version checks, repeated replacements and history remain intact.
- Recurring editor and volunteer profile actions keep their separate role restrictions.

## Authentication and Firebase

- Google sign-in remains. Email codes remain conditional on Resend configuration. Phone login was added using Firebase Authentication, while website/D1/R2 remain Cloudflare services.
- Firebase/GCP project `temple-services-513414`, project number `197416540652`; verified account `apexsteeldesigns@gmail.com`. Web app `Temple Services`, ID `1:197416540652:web:b4ca3b782934a84d10c8c9`.
- Initial CLI permission failures were followed by the user accepting Firebase terms in the console and enabling Firebase on the existing GCP project. Do not create another project because the earlier project list was empty.
- User enabled Phone provider and activated Blaze. Verified console showed Blaze via Google Cloud Free Trial, $300 remaining at that moment, expiring January 31, 2027. This was not a confirmed permanent paid-billing upgrade; owner may need to address billing when the trial ends. Do not change billing without the owner.
- Saved SMS region policy: Allow United States only. Authorized domain: `templeservices.pages.dev`. Do not treat +1 alone as US verification because the prefix is shared.
- Public Firebase web configuration is stored as `FIREBASE_WEB_CONFIG` in tracked `wrangler.toml`; this is a browser API configuration, not a service-account key. Do not store tokens, refresh tokens, OTPs or private keys in files, logs, guidance or chat output.
- `phone-auth.js` lazy-loads Firebase Auth, uses reCAPTCHA, memory-only Firebase persistence and a resend cooldown. Server verifies signature/project/issuer/expiry/recent phone authentication and matches an active D1 volunteer's registered number, then creates the existing HttpOnly application session. Numbers are administrator-only in the directory. Changing a phone number revokes application sessions.
- Privacy information and SMS consent text were updated. Keep Temple Services branding; avoid volunteer-facing Apex branding.
- Live `/api/auth/config` was verified with Firebase enabled; live sign-in dialog was verified showing US mobile number and Send text code. User added phone numbers through volunteer forms. Actual real-phone SMS delivery and completed phone authentication were not confirmed in this chat. This is the outstanding verification item, not a missing-code/configuration task.
- CLI workaround for a missing `rc` dependency: `npx --yes --package=rc --package=firebase-tools@latest firebase ... --account apexsteeldesigns@gmail.com`. Never print raw `firebase login:list --json` output: it can include tokens; filter results to the exact safe fields before emitting output.

## Production database migrations

All migrations below were already applied to production. Use new forward migrations, never reapply these to initialized D1:

| Migration | Purpose |
| --- | --- |
| 0001_shared_storage.sql | Laundry notes, photos and backup records |
| 0002_volunteers_auth.sql | Volunteers, assignments, roles and authentication; original seed |
| 0003_volunteer_names.sql | Mtj suffixes, Ajinkya Pr and Vaidehi Mtj |
| 0004_phone_sign_in.sql | Private, unique volunteer phone field |
| 0005_editable_notes.sql | Note version/edit operation/deletion fields and one-live-entry index |

0003–0005 were applied directly with targeted `wrangler d1 execute --remote --file` commands. Their presence in source does not imply they are pending in production or recorded in a Wrangler migrations tracking table. Inspect actual schema before running anything.

## Verification and deployment history

- Latest implementation commit before this memory update: `d81334c` (sign-in/date/assignment restrictions), pushed to main. All 36 tests passed; static build and Cloudflare Worker compilation passed.
- Prior changes: `2cc77ea` directory/filters/names; `205d226` clearer management forms; `699eaf2`, `a3285e5`, `c7b3601` removed duplicate sign-in/help text; `78d95d5` Firebase code/schema; `f2331a4` production Firebase configuration; `7ac92d8` recurring editor; `bf63494` removed filler text; `e10c60b` editable/deletable notes; `70092c3` hide duplicate note preview; `578a3f3` Instructions work-in-progress banner.
- Recurring schedule deployment and placement below backups were visually verified live. Author edit/delete permissions and recurrence conflicts were verified through tests, without modifying real service data for testing.
- Test fixture's simulated database-outage console message is expected in a passing cleanup test.
- Local previews/screenshots are in the chat's sibling `outputs/` directory. They are historical previews, not the source of current data.

## Working preferences

- Carry website changes through checks, commit and push to main within the user's authorized scope. State accurately whether work is pushed, deployed, or only locally prepared.
- Preserve concise interface copy; the user repeatedly removed explanatory filler. Do not reintroduce those messages.
- Use read-only live queries for current roster/schedule requests. Make targeted changes only to the requested records; never reset live user edits.
- Use the existing guidance plus this file in future chats attached to the repository. Update them when behavior, setup or verification status changes.


## Historical shifts (November 1, 2026)

- Signed-in active volunteers have View past shifts on Schedule, with Monday–Sunday browsing, a date picker, and a read-only view of notes/checklists/photos and backup history. Signing out clears history. Older schedule/photo API reads require sign-in; normal yesterday/today/upcoming schedule remains public.
- Recurring changes apply to today/future only. D1 schedule_versions captures names, IDs and recurring assignments on volunteer insertion, assignment/name/active changes or deletion. Triggers save each complete plan in the same transaction as the change. This works across days without visits or scheduled jobs. Date lookups use the latest version before the end of the service date in America/Chicago, including DST. Today/future use the current plan.
- Existing dates before the first version have unknown original assignments, explicitly labeled; do not backfill guessed historical names from today's roster. Existing notes and backup records are preserved.
- History is read only. Yesterday remains editable through the normal schedule; older note save/delete requests are rejected. No historical corrections endpoint was added. Retention/automatic deletion remains disabled.
- Migration 0006_schedule_history.sql was applied directly to production D1 on November 1, 2026. Do not reapply it or prior seed migrations. It seeds only the first plan version from the live roster; it never reseeds volunteers.
- Verification: 40 tests pass, including week navigation/sign-out clearing, recurring changes and deactivation preserving previous dates, unknown assignments, access restrictions, and Chicago DST boundaries. Static build and Cloudflare function compilation passed. Local browser preview was unreachable from the embedded browser; signed-in History visual verification remains unconfirmed.
