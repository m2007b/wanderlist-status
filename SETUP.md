# Publish Wanderlist Service Status

Prepared domain: **status.wanderlist.net**
Prepared repository: **m2007b/wanderlist-status** (separate from the application).
This folder is prepared locally. It is not a deployed website yet.

## What is ready

- Four public, read-only checks: website, blog, trip-data templates, and AI connection discovery.
- HTTP 200 plus expected response-content validation, so HTML errors do not pass API checks.
- A five-minute monitoring schedule. GitHub can delay scheduled jobs; this is not a five-minute detection guarantee.
- Hourly summary and response-time refreshes; six-hour graph and website rebuild schedules.
- Incident creation and recovery tracking from Upptime. Short incidents are retained.
- Wanderlist branding, white-circle favicon, accessible focus styles, and mobile styling.
- A freshness banner that flags missing results and checks older than 20 minutes instead of claiming the service is healthy.
- No imported sample uptime history and no private application keys.

The database checks cover public reads, not writes, uploads, or all tables. The AI Connections
check covers OAuth discovery, not a complete connection or AI generation. Login, AI generation,
payments, flight providers, email delivery, and push delivery are not independently monitored yet.
Keep UptimeRobot enabled during setup and until independent scheduled checks are confirmed.

## 1. Create the separate public repository

Use https://github.com/upptime/upptime/generate to create **wanderlist-status** under **m2007b**.
Choose **Public** and **Include all branches**. Public-repository GitHub-hosted Actions and Pages
are the intended free hosting path. Do not upload the Wanderlist application repository.

Upload this folder's configuration, assets, scripts, package files, `.gitignore`, and this guide.
Include the dotfiles. Remove the template's example files from `api/`, `history/`, and `graphs/`;
this prepared folder already has those removed. Preserve the template workflows and LICENSE.
Keep **master** as the default branch: Upptime's status page reads history from `master`.

Source: https://upptime.js.org/docs/get-started/

## 2. Enable automation and publishing

1. Enable Actions on the repository.
2. Give its workflows read/write repository permissions in Settings → Actions → General.
3. Configure the GitHub App token or repository-scoped `GH_PAT` described in the official
   Upptime guide. Upptime's Setup CI updates workflow files, which the default `GITHUB_TOKEN`
   cannot do. Use a token scoped to this status repository; never commit or paste it in chat.
   The documented repository permissions are Actions, Contents, Issues, and Workflows read/write.
4. Run **Setup CI** from the Actions tab. Confirm it succeeds and produces **gh-pages**.
5. In Settings → Pages, choose **Deploy from a branch**, **gh-pages**, **/(root)**.
6. Set the custom domain to **status.wanderlist.net** and save it **before adding DNS**.

The `.upptimerc.yml` file is the source of truth. Upptime regenerates the workflow schedules
and secret allowlist during setup; do not maintain separate edits to generated workflows.
Re-run Setup CI after changing the configuration.

## 3. Add the IONOS DNS record

Public nameservers were checked during setup and use IONOS's `ui-dns` servers. Vercel hosts
the main app; the new subdomain can point independently to GitHub Pages.

After GitHub has accepted the custom domain, add this record in IONOS:

| Type | Host/name | Target/value |
| --- | --- | --- |
| CNAME | status | m2007b.github.io |

Use the default TTL. The target is a hostname without `https://` or a repository path.
If an existing `status` record appears, inspect it before replacing it. The initial lookup
found no `status.wanderlist.net` CNAME. Do not change `@`, `www`, mail, or other DNS records.
Return to GitHub Pages and enable **Enforce HTTPS** when its certificate is ready.

Source: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## 4. Verify before linking from the main website

1. Visit https://status.wanderlist.net and check desktop and mobile layouts.
2. Confirm the four service rows and the genuine new measurement history appear.
3. Confirm Uptime CI runs on its schedule and can create/update issues and commit results.
4. Confirm graphs and summary are generated; allow time for the initial runs.
5. Add **Service Status** linking to that URL in Wanderlist's footer once the page is live.

This initial setup does not configure email or SMS alerts. GitHub issue notifications depend
on repository watching and GitHub notification settings. Configure an independent notification
channel in Upptime before relying on it for alerts. Account for GitHub's scheduled-workflow
inactivity policy and inspect Actions if checks stop running.

## Local validation

```powershell
npm ci --ignore-scripts
npm run check
npm run check:live
```

The live check performs GET requests only and does not create trips, call AI generation,
send email, or alter application data. Its output is a one-time check, not recorded uptime history.
