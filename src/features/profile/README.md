# Profile Feature - Strict Safe Absolute

This folder is intentionally isolated from the rest of the application.

## Goals

- Add a complete profile feature without editing any pre-existing frontend file.
- Add companion backend profile APIs without editing any pre-existing backend module.
- Keep integration optional and manual.

## What is included

- `api/profile.api.ts`: API client for the new backend profile module.
- `types/profile.ts`: local types for the standalone profile feature.
- `components/`: independent UI building blocks.
- `pages/ProfileStandalonePage.vue`: complete page for viewing and editing a profile.
- `profile.routes.ts`: route definition that can be mounted later if desired.

## Important limitation

Because this feature was created under **strict safe absolute** rules, it is **not mounted**
into the current app automatically. Doing so would require editing existing router or layout
files, which is intentionally avoided here.

## Manual integration later

If you later decide to connect this feature into the app, you only need to:

1. import `profileStandaloneRoutes` into your router
2. add a navigation entry in an existing menu or page

Those integration steps were intentionally not performed in this pass.
