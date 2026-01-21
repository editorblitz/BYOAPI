# Deployment Readiness Review

## High Priority

1. **Flask debug mode enabled by default** (`app.py:240-243`)
   - `FLASK_ENV` defaults to `development`, so Replit starts with `debug=True` and exposes Werkzeug's interactive debugger (arbitrary code execution) whenever an exception occurs.
   - **Fix:** Default `debug=False` unless an explicit `FLASK_DEBUG=1` (or similar) is set; never rely on `FLASK_ENV` defaults in production.

2. **API blueprints use HTML-only auth decorator** (`data_routes/daily_prices.py:22-25`, `lng_flows.py:37-40`, `netbacks.py:25-33`, `forward_prices.py:14-23`, etc.)
   - `/api/*` routes still use `@require_api_creds`, which redirects to `/auth` on expired sessions. Frontend `fetch` calls expect JSON and fail with parse errors.
   - **Fix:** Import `require_api_creds_json` in each blueprint and decorate all JSON endpoints with it so the client receives a 401 + `{ "auth_required": true }` payload.

3. **Frontend scripts ignore `auth_required`** (`static/js/daily_prices.js:652-707`, `static/js/netbacks.js:262-319`)
   - Only `strip_calculator.js` handles session expiry correctly (`static/js/strip_calculator.js:494-521`). Other tools try to parse login HTML as JSON and leave the UI in a broken state.
   - **Fix:** Mirror the strip calculator logic in every fetch handler: on 401 or `data.auth_required`, log a message and `window.location = '/auth'`.

## Medium Priority

4. **Sensitive NGI payloads printed to stdout** (`data_routes/netbacks.py:97-118`, `504-583`, `722-810`; `data_routes/forward_prices.py:228-233`, `414-418`, `559-560`)
   - Debug prints dump full payloads, contracts, and per-day values. Replit logs will explode in size and may leak NGI data.
   - **Fix:** Remove or gate `print()` statements behind a DEBUG flag and switch to structured logging if needed.

5. **Netbacks time-series loop lacks guardrails** (`data_routes/netbacks.py:128-210`, `953-964`)
   - Users can request arbitrary date ranges; the backend iterates every day, hitting multiple NGI endpoints with no limit or pause. This can exhaust NGI rate limits and hang the single Replit worker.
   - **Fix:** Validate ranges (e.g., max 120 days), reject inverted dates, and throttle long loops.

6. **Invalid query parameters raise 500s** (`data_routes/quick_charts.py:33-74` and similar)
   - `datetime.strptime()` and other parsing operations raise `ValueError` that falls into a generic 500. Users see "Server error" for bad input.
   - **Fix:** Validate formats before parsing and return 400s with actionable messages.

7. **NGI helper assumes JSON** (`auth.py:165-177`)
   - `response.json()` is called without guarding against HTML/empty responses, so a maintenance page raises `ValueError` and becomes a 500.
   - **Fix:** Catch `ValueError` around `response.json()` and return a clean "Invalid NGI response" error; do the same when parsing the auth token response.

## Low Priority

8. **Session decorator ignores decryption failures** (`auth.py:71-107`)
   - If `ENCRYPTION_KEY` changes (typical during redeploy), old sessions still contain encrypted blobs that cannot be decrypted. The decorator passes, but every NGI call later fails with "No valid credentials".
   - **Fix:** Try decrypting inside `require_api_creds[_json]`; if decryption fails, clear the session and redirect/return auth-required JSON immediately.

---

**Next Steps**
1. Lock down debug mode and fix the backend/frontend auth flow so session expiry is handled gracefully on Replit.
2. Remove verbose prints, validate input ranges, and harden `ngi_request` to keep the single-process deployment stable.
3. After applying fixes, run `pipenv run python app.py` for a smoke test and `pipenv check` for dependency security before deploying to Replit.
