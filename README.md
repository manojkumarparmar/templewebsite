# Temple Laundry Schedule

A one-page, mobile-friendly website for the Sri Radha Kalachandji Temple laundry volunteers.
Everyone can see who is on each morning and evening shift for yesterday, today, and the next six days, with
today highlighted, the permanent backups, and any planned absences. The page also has a
service instructions section and load checklists, notes, and photos within each scheduled shift.

A sticky tab bar keeps Schedule and Instructions available while scrolling. Schedule opens by
default and shows the eight-day schedule and backups. Each shift contains load updates, notes, and photos. Service instructions have
their own tab.

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

The page shows a rolling eight-day schedule starting yesterday, based on the current date.
Each date uses the recurring weekly plan, so the schedule updates on its own.

## Load updates and notes

Yesterday and today have an **Add Notes** button beside each shift. Future shifts do not. The form tracks Kitchen, Pujari,
and Deity loads with independent Washed, Dried, and Folded checkboxes, optional notes, and
multiple photos. Check only the tasks completed in this update; unchecked means not reported.
A checklist-only, notes-only, or photos-only update can be submitted. Saved updates appear
inside the shift with the volunteer name, time, load checklist summary, notes, and photos.

Updates are saved in the browser on this device. Other volunteers cannot see them yet, and
clearing browser data removes them. Photos are resized to 800 pixels. If saving fails, the
form keeps the draft and attachments. Previous notes remain visible on their scheduled day.

## Backup requests

Today and future shifts offer **Need backup**, collecting the unavailable person's name and
optional notes. The shift is highlighted until someone uses **Opt for backup** and submits
their name. The backup volunteer then replaces the scheduled name, with a backup label and
the original assignment retained in the explanation. A confirmed backup can use **Need backup**
again; the form starts with their name and reopens the shift for another volunteer. Prior
backup assignments are retained in device storage. Requests and offers are saved on this
device only; they are not shared with other volunteers yet.

## Publishing on Cloudflare Pages

1. In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, and connect this repository.
2. Leave the build command empty and set the output directory to `/`.
3. Deploy. Share the resulting `*.pages.dev` link with the WhatsApp group.

Every push to `main` redeploys the site.

## Later phases

Sharing load updates, notes, and photos between all volunteers, submitting planned
absences and offering to cover shifts need a small shared database. They are not built yet.
