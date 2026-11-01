# Wanderlist Service Status

Independent availability monitoring for Wanderlist, powered by [Upptime](https://upptime.js.org).

Planned address: https://status.wanderlist.net

This repository is prepared for deployment. Scheduled monitoring and its public website
are not live until GitHub Actions, Pages, and the domain are configured.
See [SETUP.md](SETUP.md) for the remaining publishing steps.

## Monitored endpoints

- Website: public website availability.
- Blog: published-post API and its database read.
- Trip Data: public trip-template API and its database read.
- AI Connections: OAuth connection metadata availability.

These checks do not certify login, AI generation, payments, or notification delivery.

## Latest status

<!--start: status pages-->
Monitoring history will appear here after the first successful automated run.
<!--end: status pages-->

## Validation

Run npm ci --ignore-scripts, then npm run check. Use npm run check:live for a one-time
read-only endpoint check. No application secrets are required.

## License

The Upptime template is MIT licensed; see [LICENSE](LICENSE).
