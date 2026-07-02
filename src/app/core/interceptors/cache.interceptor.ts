import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { filter, finalize, shareReplay, tap } from 'rxjs/operators';

/**
 * Read-through cache + in-flight de-duplication for API GETs.
 *
 * This changes NOTHING about what the app requests or how components consume
 * responses — it only affects the *network*:
 *
 *  1. In-flight coalescing: if the same GET is already pending, later callers
 *     share the one request instead of firing a duplicate. (Zero staleness —
 *     it is literally the same in-flight response.)
 *  2. Short-TTL read cache: a successful GET is reused for up to CACHE_TTL_MS,
 *     so navigating away and back doesn't re-hit a (possibly cold) serverless
 *     endpoint. Any mutating request (POST/PUT/PATCH/DELETE) clears the whole
 *     cache, so the user's own writes are always reflected immediately.
 *
 * Freshness-critical endpoints are never cached (see NO_CACHE). Set
 * CACHE_TTL_MS to 0 to disable the time cache and keep only coalescing.
 */

// How long a cached GET stays fresh. Short by design — enough to make quick
// back-navigation instant without serving visibly stale data.
const CACHE_TTL_MS = 15_000;

// Endpoints that must always go to the network (auth/session/live state and
// one-shot signatures). Matched as substrings against the request URL.
const NO_CACHE: readonly string[] = [
  '/auth/',
  '/users/profile',
  '/notifications',
  '/cloudinary/sign',
];

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

// Module-level maps: one shared cache for the app's lifetime.
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

function isCacheable(url: string): boolean {
  // Only our own relative API URLs (absolute Cloudinary/etc. calls pass through
  // untouched, before the api.interceptor prefixes them).
  if (url.startsWith('http')) return false;
  return !NO_CACHE.some((path) => url.includes(path));
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Any mutation invalidates the read cache so subsequent GETs are fresh.
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) cache.clear();
      }),
    );
  }

  if (!isCacheable(req.url)) {
    return next(req);
  }

  const key = req.urlWithParams;

  // 1) Serve a still-fresh cached response without touching the network.
  const cached = cache.get(key);
  if (cached && cached.expiresAt > performance.now()) {
    return of(cached.response.clone());
  }

  // 2) Share an already in-flight identical GET.
  const pending = inFlight.get(key);
  if (pending) return pending;

  // 3) Real network call — cache the success, then release the in-flight slot.
  //    Emit only the final HttpResponse so every (shared) subscriber sees the
  //    same single event; HttpClient.get() unwraps the body from it as usual.
  const request$ = next(req).pipe(
    filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse),
    tap((response) => {
      if (CACHE_TTL_MS > 0 && response.status >= 200 && response.status < 300) {
        cache.set(key, { response: response.clone(), expiresAt: performance.now() + CACHE_TTL_MS });
      }
    }),
    finalize(() => inFlight.delete(key)),
    // refCount:true keeps normal cancellation — if every subscriber unsubscribes,
    // the underlying request aborts just like a plain HttpClient GET would.
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  inFlight.set(key, request$ as Observable<HttpEvent<unknown>>);
  return request$;
};
