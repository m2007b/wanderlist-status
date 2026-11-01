# Wanderlist status website

The custom frontend source is in `design-modern/`. It uses Wanderlist's original SVG logos,
locally included Poppins fonts, and original Lucide icon markup. License notices are retained.

Build the production page with Node.js:

```sh
node scripts/export-design-preview.mjs --production
```

This writes a self-contained `assets/index.html` with live data fetching. It does not embed
the local design preview's monitoring snapshot. Commit the source and generated asset together.

Upptime's existing Static Site CI is triggered by changes under `assets/`. Upptime copies
these assets after exporting its default site, so `assets/index.html` replaces the homepage.
The generated `gh-pages` branch retains the custom CNAME and existing incident/history routes.
Setup CI and subsequent scheduled builds copy this same homepage and preserve the design.
Do not edit the generated upstream workflows to install the frontend.

The homepage reads Upptime summary and per-service history files from `master`, and status
issues from the GitHub API. No application secrets are sent to the browser. If checks are
older than 20 minutes, the homepage reports delayed monitoring instead of claiming healthy
services. Refreshes happen every minute while the page is open; actual probes remain scheduled
through Upptime. Daily bars before monitoring started are grey.
