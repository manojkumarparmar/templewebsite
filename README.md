# Temple Laundry Schedule

A one-page, mobile-friendly website for the Sri Radha Kalachandji Temple laundry volunteers.
Everyone can see who is on each morning and evening shift for yesterday, today, and the next six days, with
today highlighted, the permanent backups, and any planned absences. The page also has a
service instructions section and load checklists, notes, and photos within each scheduled shift.

A sticky tab bar keeps Schedule and Instructions available while scrolling. Schedule opens by
default and shows the eight-day schedule and backups. Each shift contains load updates, notes, and photos. Service instructions have
their own tab.

The page is `index.html`. A small build copies it into `dist`; Pages Functions handle the
shared API. Server files, tests, and database migrations are excluded from static hosting.

## Updating the schedule

Open `index.html` and edit the block marked `EDIT THIS SECTION TO UPDATE THE SCHEDULE`:

- `BACKUPS`: names of the permanent backups (currently placeholders).
- `WEEKLY_PLAN`: the recurring plan, Monday first. An empty list means the shift needs a volunteer
  (Friday evening is open at the moment).
- `ABSENCES`: planned absences. Add one line per absence with `person`, `from`, `to`
  (dates as `YYYY-MM-DD`), and optionally `shifts` (`am`, `pm` or `both`), `cover` and `note`.
  The page shows the person as away and who is covering, or "Needs cover" if nobody is.

- `INSTRUCTIONS`: the service instructions, one entry per topic. `body` is a list of short
  paragraphs; leave it empty to show "Instructions coming soon."

The page shows a rolling eight-day schedule starting yesterday, based on the current date.
Each date uses the recurring weekly plan, so the schedule updates on its own.

## Load updates and notes

Yesterday and today have an **Add Notes** button beside each shift. Future shifts do not. The form tracks Kitchen, Pujari,
and Deity loads with independent Washed, Dried, and Folded checkboxes, optional notes, and
multiple photos. Check only the tasks completed in this update; unchecked means not reported.
A checklist-only, notes-only, or photos-only update can be submitted. Saved updates appear
inside the shift with the volunteer name, time, load checklist summary, notes, and photos.

Updates are saved in Cloudflare D1 and shared with every visitor. Photos are resized to
800 pixels and saved in a private R2 bucket, served through the website API. Each update
accepts up to four photos, at most 1 MB each. If saving fails, the form keeps the draft and
attachments. The schedule refreshes every 30 seconds and when returning to the page; open
forms keep their drafts. Service dates use America/Chicago. Experimental device-only data
is ignored. Only the remembered volunteer name remains in browser storage.

## Backup requests

Today and future shifts offer **Need backup**, collecting the unavailable person's name and
optional notes. The shift is highlighted until someone uses **Opt for backup** and submits
their name. The backup volunteer then replaces the scheduled name, with a backup label and
the original assignment retained in the explanation. A confirmed backup can use **Need backup**
again; the form starts with their name and reopens the shift for another volunteer. Prior
backup assignments are retained in D1. Requests and offers are shared with everyone.
Conditional version checks prevent two volunteers from claiming the same request.

## Shared storage and publishing

Cloudflare Pages project: `templeservices` (production branch `main`).

- Build command: `node scripts/build.mjs`
- Build output: `dist`
- D1 binding `DB`: `templeservices-db`
- R2 binding `PHOTOS`: `templeservices-photos` (Standard, public bucket access disabled)
- Database schema: `migrations/0001_shared_storage.sql`
- Bindings are defined in `wrangler.toml` and applied on deployment.

The database and its tables were created in the Cloudflare dashboard. For a fresh database,
apply the schema using the D1 console or `npx wrangler d1 migrations apply DB --remote`.
Every push to `main` redeploys the website and Pages Functions.

Run checks with Node.js 24 or later:

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
npx wrangler pages functions build functions --outdir .wrangler/verify
```

For local shared-storage development, build first, then run `npx wrangler pages dev dist`.
Apply the schema locally using `npx wrangler d1 migrations apply DB --local`.
Opening `index.html` directly previews the layout but cannot use the shared API.

## Access

The website currently has no sign-in. Anyone who can open the site can read updates and
photos and submit notes or backup changes. The R2 bucket itself stays private; only photos
attached to saved updates can be retrieved through the API. Server validation checks field
sizes, dates, photo limits, and the origin of browser submissions. Volunteer sign-in can be
added separately if access should be restricted.
