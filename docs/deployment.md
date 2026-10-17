# Static deployment

Build and verify with Node.js 24 or later:

```sh
npm ci
npm run verify
npm audit --audit-level=high
```

Publish only `dist/` on an HTTPS static host. No server, environment variables, credentials or database are required. HTTPS is required outside localhost for browser APIs such as UUID creation. `npm run dev` and `npm run preview` are local tools, not production servers.

## Host configuration

- Serve `index.html` at the site root. Navigation is in-memory, so no URL rewrite scheme is required.
- Serve JavaScript/CSS with their correct content types. Do not return HTML for missing asset URLs.
- Revalidate `index.html` on each visit (`Cache-Control: no-cache`). Fingerprinted `/assets/` files can use `Cache-Control: public, max-age=31536000, immutable`.
- Keep a stable origin. Browser data belongs to the exact scheme, host and port; changing them does not transfer the planner.
- Configure the response headers below at the host. Vite preview uses the same policy for release checks, but these headers are not embedded into `dist/`.

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

The app has no external fonts, scripts, analytics or API calls. Do not add third-party sources to this policy without reviewing their data access and runtime requirements.

## Release smoke test

1. Open a fresh profile: Dashboard should show an empty score, not sample data.
2. In Plan, write an intention, start/stop, submit a workform, then Mark done. The hour should become green once. Reload and check the same workform and score.
3. Capture a task, schedule it, and find it on Calendar. Complete/reopen it and verify shared project/goal links and notes.
4. Tick two routine completions on the same day. Check the target and previous-week navigation.
5. Export a backup and verify it can be imported after confirmation in a separate test profile. Never test destructive replacement against the only copy of real data.
6. Check light/dark modes and a narrow viewport. Verify the hosted response headers and that the console contains no application or security-policy errors.

## Operating limits

This release is a single-user, browser-local tool. It has no sign-in, cross-machine sync, conflict resolution, server backup or shared leaderboard. Local storage and exported files are not encrypted by the app. Export regularly; clearing browser data removes the planner. Browser quota/write failures preserve in-memory work and expose recovery actions.

Rollback by serving the previous verified `dist/` artifact at the same origin. Export a backup before changing versions. This audit preserves the version 1 data format and validates old backups, but future storage migrations must be reviewed independently.
