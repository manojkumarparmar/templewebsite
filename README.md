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

## Volunteers and access

The Volunteers tab lists active volunteers, recurring assignments, availability notes, and
multiple roles. Administrators also see sign-in emails and inactive records. Changes to
recurring assignments update the schedule; volunteers with the backup role populate the
Permanent backups section.

- Allowed roles: super-admin, admin, headpujari, coordinator, volunteer, backup, other.
- Only admin and super-admin can edit the directory.
- Admins can manage other admins and lower roles, but cannot edit the super-admin.
- Admins cannot remove their own admin role, deactivate themselves, or remove themselves.
- Super-admin can edit all records including their own details, but cannot remove their
  account, deactivate themselves, or drop the super-admin role.
- The super-admin role cannot be assigned to another record through the website. Database
  triggers also protect the super-admin status and prevent deletion.
- Removing a volunteer deactivates their record, preserving history. Admins can reactivate it.
- Public visitors can read the schedule and directory. Submissions require an approved,
  active volunteer account. Submitted notes record the authenticated user's name and ID.

The directory is seeded from the original recurring schedule, plus Nanda Kumar Das as the
protected super-admin. The production super-admin email is set directly in D1, not published
in source. Other volunteers need their email added by an administrator before signing in.

## Sign-in setup (free services)

The sign-in code supports Google Identity Services directly and email codes using Resend's
free plan. D1 and R2 remain the data stores; no paid identity service or SMS is required.

Google client configuration is stored as a public value in `wrangler.toml`. The Google
Cloud project is `temple-services-513414`, app name Temple Services. Only the production
website origin is authorized. The client secret generated by Google is not used or stored
in this repository.

Configuration:

- `GOOGLE_CLIENT_ID` (public text in `wrangler.toml`): Google OAuth web client ID. Authorize the JavaScript origin
  `https://templeservices.pages.dev`. No Google client secret is needed for this flow.
- `RESEND_API_KEY` (secret in Pages settings): email-sending API key from a free Resend account.
- `EMAIL_FROM` (text in `wrangler.toml`): pending a separate Temple Services sender on a verified domain. Do not use Apex-branded addresses.

Only configured sign-in methods appear. When neither method is configured, the website
remains read-only and the sign-in dialog asks users to contact the coordinator. Setting up
a Google Cloud OAuth client and verifying an email-sending domain requires the owner's
accounts. Keep the Resend account on its free plan; it has sending limits shared across
applications. Use a dedicated sending-only key restricted to the approved sender domain,
saved as a Cloudflare secret rather than in source. The owner requires volunteer-facing
communications to have no Apex branding. The existing Google consent support email must
also be changed from the Apex account before this requirement is fully satisfied.

Sessions use random server-stored tokens, hashed in D1, in Secure/HttpOnly/SameSite cookies.
Google tokens are checked for signature, audience, issuer, expiration, verified email, and
nonce. Email codes are hashed, expire in ten minutes, allow five attempts, and can be used
once. Sending codes is limited per address and IP. A verified Google account and an email
code for the same directory email resolve to the same volunteer record.

Apply `0002_volunteers_auth.sql` once on an existing database after `0001`. This migration
was applied in production through the D1 console. Do not reapply it to an initialized DB.

Retention cleanup remains deferred. No automatic deletion has been enabled.
