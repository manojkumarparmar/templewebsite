# Temple Laundry Schedule

A one-page, mobile-friendly website for the Sri Radha Kalachandji Temple laundry volunteers.
Everyone can see who is on each morning and evening shift for this week and next week, with
today highlighted, the permanent backups, and any planned absences. The page also has a
service instructions section and, for today, Mark as done, notes, photos and questions.

There is no build step. The whole site is `index.html`.

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

The page works out this week and next week from the current date, so the plan repeats on its own.

## Mark as done, notes, photos and questions

Volunteers can mark today's morning or evening shift as done, post a note or a question with an
optional photo, and mark a question as answered. Photos are shrunk to 800 pixels before saving.

These are saved in the browser on the device being used, not on a server. Other volunteers cannot
see them yet, and clearing the browser data removes them. Notes older than 14 days are dropped.
Sharing them between everyone needs a small shared database (see Later phases).

## Publishing on Cloudflare Pages

1. In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, and connect this repository.
2. Leave the build command empty and set the output directory to `/`.
3. Deploy. Share the resulting `*.pages.dev` link with the WhatsApp group.

Every push to `main` redeploys the site.

## Later phases

Sharing Done marks, notes, photos and questions between all volunteers, submitting planned
absences and offering to cover shifts need a small shared database. They are not built yet.
