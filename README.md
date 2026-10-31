# Temple Laundry Schedule

A one-page, mobile-friendly website for the Sri Radha Kalachandji Temple laundry volunteers.
Phase I is view-only: everyone can see who is on each morning and evening shift for this week
and next week, with today highlighted, the permanent backups, and any planned absences.

There is no build step. The whole site is `index.html`.

## Updating the schedule

Open `index.html` and edit the block marked `EDIT THIS SECTION TO UPDATE THE SCHEDULE`:

- `BACKUPS`: names of the permanent backups (currently placeholders).
- `WEEKLY_PLAN`: the recurring plan, Monday first. An empty list means the shift needs a volunteer
  (Friday evening is open at the moment).
- `ABSENCES`: planned absences. Add one line per absence with `person`, `from`, `to`
  (dates as `YYYY-MM-DD`), and optionally `shifts` (`am`, `pm` or `both`), `cover` and `note`.
  The page shows the person as away and who is covering, or "Needs cover" if nobody is.

The page works out this week and next week from the current date, so the plan repeats on its own.

## Publishing on Cloudflare Pages

1. In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, and connect this repository.
2. Leave the build command empty and set the output directory to `/`.
3. Deploy. Share the resulting `*.pages.dev` link with the WhatsApp group.

Every push to `main` redeploys the site.

## Later phases

Volunteers marking work done, submitting planned absences and offering to cover shifts need a
small shared database and are not part of phase I.
