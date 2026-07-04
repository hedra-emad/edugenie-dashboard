---
description: Pre-production GO/NO-GO gate for edugenie-dashboard (tests, build, budgets, Lighthouse, API load, leftovers, config)
allowed-tools: Bash, Read, Grep, Glob
disable-model-invocation: true
---

# Pre-production performance & quality check

Run the full pre-production gate for the **edugenie-dashboard** Angular 20 app and end with a **GO / NO-GO** verdict.

## Project facts (detected — do not re-guess)
- Package manager: **npm**
- Builder: `@ngx-env/builder:application` → production build output at **`dist/edugenie-dashboard/browser/`**
- Test runner: **Karma + Jasmine** (`ng test`)
- SSR: **none** (client-side SPA)
- Prod API base: **`https://edugenie-api.vercel.app/api`**
- Linting: **`ng lint`** via angular-eslint (flat `eslint.config.js`). A pragmatic **warning baseline** is in effect — ~710 pre-existing violations are `warn` (non-blocking); the ruleset is otherwise `error`, so any NEW violation fails. Type-check (`tsc --noEmit`) runs alongside lint.

## Thresholds (Standard SPA profile)
| Metric | Warn | Fail |
|---|---|---|
| Initial bundle | > 500 KB | > 1 MB (enforced by angular.json budget) |
| Lighthouse performance score | < 90 | **< 85** |
| Largest Contentful Paint (LCP) | > 2.0 s | **> 2.5 s** |
| API p95 latency | > 250 ms | **> 300 ms** |
| API error rate | > 0.5% | **≥ 1%** |

## Preconditions
Verify the perf tools are present; if any are missing, **stop and tell the user to run** `npm install -D lighthouse autocannon source-map-explorer` rather than installing them:
```bash
for t in lighthouse autocannon source-map-explorer; do [ -d "node_modules/$t" ] && echo "ok $t" || echo "MISSING $t"; done
```

Run each step below, capture output, and classify it **PASS / WARN / FAIL** against the thresholds. Keep going after a failure so the final report is complete.

---

### 1. Tests — Karma/Jasmine (headless, single run)
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
FAIL if any spec fails or the runner errors (e.g. no Chrome). PASS if all green.

### 2. Lint + type-check
Run the real linter and a strict type-check:
```bash
npx ng lint                       # angular-eslint; exits non-zero only on errors
npx tsc --noEmit -p tsconfig.app.json
```
- **FAIL** if `ng lint` reports any **error** (exit code ≠ 0) or `tsc` reports any type error.
- **WARN** report the count of lint **warnings** (the pre-existing baseline, currently ~710) — these are non-blocking but should trend down. If the warning count has *increased* versus the last run, call it out.
Rules are baselined in `eslint.config.js`; ratchet a rule from `warn` → `error` once its violations hit zero.

### 3. Production build (bundle budgets enforce themselves)
```bash
npx ng build --configuration production
```
- PASS if the build succeeds with no budget error.
- FAIL on any error, **including the `initial` budget exceeding 1 MB** (the build exits non-zero on a budget error automatically).
- **On failure**, produce a source-mapped build and name the top offenders:
  ```bash
  npx ng build --configuration production --source-map
  npx source-map-explorer 'dist/edugenie-dashboard/browser/*.js' --no-border-checks || true
  ```
  Report the largest chunks/modules by size as the specific bundle offenders.

### 4. Runtime performance — Lighthouse against the served prod build
Serve the freshly built SPA on a local port, run Lighthouse (performance only, headless), then stop the server. Use step 3's build output.
```bash
# serve the production build (SPA fallback to index.html)
npx http-server dist/edugenie-dashboard/browser -p 4173 -s --silent & SRV=$!
sleep 3
npx lighthouse http://localhost:4173 \
  --only-categories=performance \
  --chrome-flags="--headless --no-sandbox" \
  --quiet --output=json --output-path=/tmp/preprod-lh.json
kill $SRV 2>/dev/null || true
```
Then read `/tmp/preprod-lh.json` and extract:
- Performance score = `categories.performance.score * 100`
- LCP = `audits["largest-contentful-paint"].numericValue` (ms)
- TBT = `audits["total-blocking-time"].numericValue` (ms)
- INP proxy = `audits["interactive"].numericValue` or `audits["experimental-interaction-to-next-paint"]` if present

Classify: FAIL if score < 85 **or** LCP > 2500 ms. WARN if score < 90 or LCP > 2000 ms. Report score, LCP, TBT, INP.
(If `http-server` isn't installed, `npx` will fetch it on demand; if the network blocks that, note it as a WARN and skip Lighthouse rather than failing the whole gate.)

### 5. API latency / load — autocannon against prod API
Load-test a public read endpoint on the prod backend. Default endpoint is `/categories`; change if a more representative read endpoint is preferred.
```bash
npx autocannon -d 20 -c 20 -j https://edugenie-api.vercel.app/api/categories > /tmp/preprod-load.json
```
Read `/tmp/preprod-load.json` and report:
- p50 = `latency.p50`, p95 = `latency.p97_5` (nearest available) / `latency.p99`, p99 = `latency.p99` (ms)
- error rate = `(non2xx + errors + timeouts) / requests.total`
Classify: FAIL if p95 > 300 ms **or** error rate ≥ 1%. WARN if p95 > 250 ms or error rate > 0.5%.
Note in the report that this hits the **live production backend** (results reflect Vercel cold-starts / rate limits).

### 6. Leftovers — scan the working diff
Grep only added lines in the diff against `main` for debug/dev residue:
```bash
git diff main -- 'src/**/*.ts' 'src/**/*.html' | grep -nE '^\+' | grep -nE 'console\.(log|debug|info)|debugger|\bTODO\b|\bFIXME\b|\bXXX\b' || echo "clean"
# commented-out code (added lines that are commented-out statements)
git diff main -- 'src/**/*.ts' | grep -nE '^\+\s*//.*[;{}()]' || echo "no commented-out code"
```
WARN (not FAIL) on any hit; list file:line for each. `debugger` statements are FAIL.

### 7. Config — no dev-only flags / local URLs in prod
```bash
grep -nE 'localhost|127\.0\.0\.1|http://' src/environments/environment.prod.ts || echo "no local/insecure URLs in prod env"
grep -nE 'production:\s*true' src/environments/environment.prod.ts || echo "MISSING production:true"
```
FAIL if `environment.prod.ts` contains a `localhost`/`127.0.0.1`/plain-`http://` URL or is missing `production: true`. Confirm step 3 built with `--configuration production` (which file-replaces to `environment.prod.ts`).

---

## Final verdict
Print a summary table of all 7 steps with PASS / WARN / FAIL and the measured value vs threshold, then:

- **GO** — only if every step is PASS or WARN (no FAIL).
- **NO-GO** — if any step is FAIL. List each blocker explicitly (e.g. "initial bundle 1.3 MB > 1 MB", "Lighthouse LCP 3.1 s > 2.5 s", "API p95 420 ms > 300 ms", "debugger statement at src/…"). Order blockers most-severe first.

Do not commit, push, or modify source files as part of this check.
