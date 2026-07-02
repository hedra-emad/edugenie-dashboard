# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **`edugenie-dashboard`** app — the Angular 20 instructor/admin/superadmin dashboard. It is one of three apps in the EduGenie monorepo; the root `../CLAUDE.md` covers the backend, cross-app SSO/auth flows, and how the two frontends share the deployed API. Read that for anything spanning apps (refresh-token rotation, handoff codes, admin invites, roles). This file covers what is specific to the dashboard's own code.

## Commands

Run from this directory (`edugenie-dashboard/`).

- `npm start` (= `ng serve`) — dev server on **:4200** (default configuration is `development`)
- `npm run build` — production build to `dist/` (default configuration is **production**, which swaps in `environment.prod.ts`)
- `npm run watch` — incremental dev build
- `npm test` (= `ng test`) — Karma + Jasmine (Chrome). Specs are `*.spec.ts` colocated in `src/`.
- Run a single spec: `ng test --include='**/courses.spec.ts'` (glob against spec paths)
- No lint script and no e2e framework are wired up. Formatting is Prettier (config in `package.json`: 100 col, single quotes, Angular HTML parser).

## Build tooling — @ngx-env/builder

The builder is **`@ngx-env/builder`**, not the stock `@angular-devkit`. This means a `.env` file at the app root is loaded and `NG_APP_*` / `process.env` values can be inlined at build time. Despite that, runtime config still lives in `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) and is **baked in at build time** — changing the deployed API URL requires a rebuild. `commonjs` interop is explicitly allowed for `pusher-js` (`angular.json` `allowedCommonJsDependencies`).

> The `enviroment.ts` / `enviroment.prod.ts` files at the app **root** (misspelled, outside `src/`) and `refactor.js` / `*.txt` logs are stray scratch files, not part of the build. The real environment files are `src/environments/environment*.ts`.

## Angular conventions

- **Standalone components throughout — there are no NgModules.** App wiring lives in `src/app/app.config.ts` (`ApplicationConfig` with `provide*` functions) and routes in `src/app/app.routes.ts`. Every route uses lazy `loadComponent`.
- Zone-based change detection is still in use (`provideZoneChangeDetection({ eventCoalescing: true })`, `zone.js` polyfill) — **not** zoneless.
- Auth state is exposed **both** as an RxJS `BehaviorSubject` (`currentUser$`) and an Angular `signal` (`currentUserSignal`) — keep the two in sync when touching `AuthService.setCurrentUser` / `clearCurrentUser`.
- UI libs: Angular Material + CDK (dialogs, overlays), `ngx-toastr` (toasts, configured globally in `app.config.ts`), `ng2-charts`/chart.js (analytics), `ngx-image-cropper` (avatar), `jwt-decode`.
- Styling is **Tailwind** whose theme colors/radii/shadows are all mapped to CSS custom properties (`var(--color-*)` etc. in `tailwind.config.js`), so the palette is themed from CSS variables, not hardcoded Tailwind values. Global styles: `src/styles.css` + `src/custom-theme.scss` (Material theme).

## App bootstrap & the two HTTP interceptors

`app.config.ts` registers an **`APP_INITIALIZER`** (`initializeAuth`) that awaits `AuthService.initializeAuth()` before the app renders — it GETs `/users/profile` with the existing cookie to rehydrate the session on refresh, then connects Pusher. Guards depend on this having run (see below).

HTTP requests pass through two functional interceptors, **in order**:
1. **`apiInterceptor`** — prefixes relative URLs with `environment.apiUrl` and sets `withCredentials: true` (so the httpOnly JWT cookie rides along) **only for our own API**; absolute `http(s)` URLs (e.g. Cloudinary) pass through untouched with no credentials.
2. **`authErrorInterceptor`** — on a **401** for a non-auth request, calls `AuthService.refreshSession()` (silent refresh of the 15-min access token) and retries **once**; only if the refresh itself fails does it clear the user and redirect to `/login?sessionExpired=true`. A **403** (deactivated account) clears + redirects immediately. Requests to paths in `AUTH_PATHS` (`/auth/login`, `/auth/refresh`, `/auth/redeem-code`, `/auth/verify-exchange-token`, `/users/change-password`) are exempt so a failed login/refresh/password-check doesn't recurse or bounce the user.

`AuthService.refreshSession()` and `initializeAuth()` are **in-flight-deduped** via `shareReplay` — many concurrent 401s share one `/auth/refresh` call, which matters because the backend rotates the refresh token on every call (see root CLAUDE.md). `isAccountActive()` defensively rejects users whose status looks deactivated/deleted before ever setting them as current.

## Routing & layouts

Three route surfaces in `app.routes.ts`:
- **Unauthenticated / no layout:** `/login` (a *redirect* component that pushes users to the student app — even authenticated ones, so it has no `guestGuard`), `/admin-login` (the real staff login, `guestGuard`), `forgot-password`, `reset-password`, `verify-email`, `auth-callback`, `auth/redeem` (SSO handoff entry — **no guards**), `accept-invite` (admin invite — **no guards**, new admins have no session yet).
- **Instructor area** — wrapped in `LayoutComponent` (`shared/components/layout/`): `/my-courses`, `/analytics`, `/course-builder[/:courseId]`, `/settings`, `/notifications`. Guarded by `authGuard` + `roleGuard`.
- **Admin/superadmin area** — wrapped in `AdminLayoutComponent` (`layouts/admin-layout/`) under `/admin/*`: course-approvals, course details, users, categories, analytics, plus superadmin-only pages (`command-center`, `admins`, `payouts`, `platform-config`, `audit-logs`).

**Guards** (`core/guards/`) are the source of role enforcement:
- `roleGuard` reads `route.data['roles']` and **waits for `AuthService.waitForAuthInit()`** before checking — so it never races the `APP_INITIALIZER`. On a role mismatch it routes to the user's home (`getHomeRouteForRole`); students resolve to the sentinel `'EXTERNAL_STUDENT_APP'` and are **redirected off-domain** to the student web app (they don't belong in the dashboard).
- `pendingOperationsGuard` is a `canDeactivate` guard used on course-builder pages; components implement `HasPendingOperations` (`hasPendingOperations()` / `getPendingOperationMessage()`) and the guard shows a `window.confirm` before allowing navigation away from in-progress uploads/saves. Build the guard with `createPendingOperationsGuard<T>()`.

## Core services (`src/app/core/services/`)

Thin HTTP wrappers around the API: `auth.service`, `courses`, `lessons`, `sections`, `quizzes`, `categories`, `attachments`, `notifications`, `pusher.service`. Domain models live in `core/models/` (+ `core/models/dto/`) and enums in `core/enums/`.

- **`CloudinaryService`** does **signed** uploads: it first POSTs to the backend `/cloudinary/sign` to get a signature, then uploads directly to Cloudinary (absolute URL → skips the API interceptor's credentials). Upload progress is surfaced as `VideoUploadEvent` via `HttpEventType`.
- **Notifications / Pusher:** `NotificationsService.connectPusher(userId)` is called from both the `APP_INITIALIZER` and `AuthService.setCurrentUser`; it guards against duplicate connections by tracking the connected user id.

### Course-builder draft system (the app's most involved subsystem)

The course builder (`features/course-builder/`) lets instructors compose a course across multiple pages before anything is persisted server-side, with autosave and file handling. Four cooperating services drive it:
- **`DraftStateService`** — the store. Keeps `DraftItem`s (type `course | section | lesson | card`) in a `Map` mirrored to **`localStorage`** (`edugenie_draft_state`). Draft ids are prefixed `draft_` (`isDraftId()`). **Files themselves cannot be persisted to localStorage** — only their metadata is; the actual `File` objects live in an in-memory `Map` and are lost on reload.
- **`FormDraftIntegrationService`** — binds an Angular `FormGroup` to a draft with debounced autosave (`FormDraftConfig` describes which fields and file fields to track).
- **`FileDraftService`** — file-field handling for drafts.
- **`CloudinaryDraftCleanupService`** (note the doubled `.ts.ts` filename) — deletes orphaned Cloudinary assets when a draft is abandoned/replaced.

When touching this area, remember drafts can outlive a session in localStorage but their file blobs cannot, and that navigation is gated by `pendingOperationsGuard`.

## Feature structure

`src/app/features/<area>/` groups each area; a feature typically has `pages/` (routed), `components/`, `services/`, and `models/`. Areas: `auth`, `instructor` (+ `instructor-analytics`), `course-builder`, `admin` (categories, course-approvals, course-details, users), `superadmin`, `settings`, `errors`. Cross-feature building blocks live in `src/app/shared/components/` (layouts, dialogs, auth UI primitives, pagination, filter bar, empty/loading states).
