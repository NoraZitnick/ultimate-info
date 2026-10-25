# Bay Area HS Ultimate

A static website for Bay Area high school ultimate frisbee players: a map of every team, team
lookup pages, how the seasons work, and how club teams (BUYA & OAK) work.

Open `index.html` in a browser — no build step or server required.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Team Map | `index.html` | Leaflet map; dot color = league (BADA / BUYA / OAK), letter = division. Filter by Girls / Open / Mixed, league, or search. |
| Team Lookup | `team.html` | Without `?id=`: searchable directory. With `?id=<team-id>`: team page with location, schedule, vibe, contact. Division chips link to the Seasons page. |
| Seasons | `seasons.html` | Fall developmental, spring single-gender and summer club seasons, with events and dates (`#fall`, `#spring`, `#summer`, `#winter`). |
| Club Teams | `clubs.html` | How club works, BUYA and OAK programs, their teams, schedules, and tryout links. |

## Code structure

```
css/styles.css   all styles (design tokens at the top)
js/data.js       LEAGUES, GENDERS, DIVISIONS, TEAMS — the only place team info lives
js/common.js     Site helpers: header/footer, escaping, filtering, badges
js/map.js        map page
js/team.js       team lookup page
js/clubs.js      renders club team cards from data
```

## Code practices

1. **One source of truth.** Every team fact lives in `js/data.js`. Pages render from it, so updating a
   team (or adding one) is a single edit.
2. **Separation of concerns.** HTML for structure, CSS for presentation, JS for behavior. No inline
   event handlers; inline `style` is only used for data-like values (timeline positions).
3. **Safe rendering.** Any text injected with `innerHTML` goes through `Site.escapeHtml`.
4. **Accessible by default.** Semantic landmarks, a skip link, `aria-pressed` on toggle buttons,
   `aria-current` on the active nav link, visible focus rings, labels on inputs, alt text on markers,
   and `prefers-reduced-motion` support.
5. **Mobile-first, responsive CSS** driven by custom properties (colors, radii, spacing) defined once
   in `:root`.
6. **Small, named functions** with a single job; `const` by default; strict mode in each IIFE so
   page scripts don't leak globals.
7. **No build, few dependencies.** Plain HTML/CSS/JS plus Leaflet (pinned version from cdnjs) and
   Google Fonts. Works straight from the file system.
8. **Honest data.** Sources and a "last checked" date are shown in the footer; dates are given as
   approximate windows with the most recent known dates in parentheses.

## Updating info

- Add or edit a team: add an object to `TEAMS` in `js/data.js` (see the `Team` typedef).
- New season dates: update `DIVISIONS[*].when` in `js/data.js` and the event lists in `seasons.html` / `clubs.html`.
- Sources: [BADA youth leagues](https://bayareadisc.org/youth-leagues) (incl. its public team contact list),
  [Bay Ultimate Youth](https://www.bayultimateyouth.org/), [Oakland Ultimate](https://www.oakultimate.com/home).
