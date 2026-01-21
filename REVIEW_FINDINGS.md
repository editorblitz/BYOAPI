# Code Review Findings

Review date: 2026-01-21

## Fixed Issues

### ~~Rate Limiting on Login Was Ineffective~~ ✓ FIXED
The rate limiter decorator was on a vestigial route handler that never executed. Fixed by moving the limiter to a shared `extensions.py` module and applying it to the actual login route in `auth.py`.

---

## Outstanding Issues

### 1. API Endpoints Use Wrong Decorator (Medium Priority)

**Location:** Most files in `data_routes/`

**Problem:** API endpoints use `@require_api_creds` which returns HTML redirects. They should use `@require_api_creds_json` which returns JSON with `auth_required: true`.

**Affected files:**
- `data_routes/daily_prices.py` - line 23
- `data_routes/forward_prices.py`
- `data_routes/netbacks.py`
- `data_routes/quick_charts.py`
- `data_routes/lng_flows.py`
- `data_routes/spreads.py`
- `data_routes/forward_table.py`
- `data_routes/forward_heatmap.py`
- `data_routes/forward_spread_dashboard.py`
- `data_routes/forward_curve_spread_dashboard.py`
- `data_routes/spread_dashboard.py`

**Correct example:** `data_routes/strip_calculator.py` (line 7 imports both, line 20 uses `@require_api_creds_json`)

**Impact:** Not a security issue - data is still protected. But when sessions expire mid-use, users see cryptic JSON parsing errors instead of a clean redirect to login.

**Fix:**
1. Add `require_api_creds_json` to imports in each file
2. Change decorator on `/api/*` routes from `@require_api_creds` to `@require_api_creds_json`

---

### 2. Frontend Auth Handling Incomplete (Low Priority)

**Location:** Most JavaScript files in `static/js/`

**Problem:** JS files don't check for `auth_required` flag in API responses.

**Correct example from `strip_calculator.js`:**
```javascript
if (data.auth_required) {
    this.log('Session expired. Redirecting to login...', 'error');
    window.location.href = '/auth';
    return;
}
```

**Missing in:** `daily_prices.js`, `forward_prices.js`, `netbacks.js`, `spreads.js`, etc.

**Impact:** Related to issue #1 above. Even if backend returns proper JSON with `auth_required`, frontend won't handle it gracefully without this check.

---

### 3. Mixed CSS Approaches (Low Priority)

**Problem:** Inconsistent styling approach across pages.

- Some pages use only `styles.css`
- Others load Tailwind CDN on top (e.g., `spreads.html` line 6)
- Button text varies: "Load Chart", "Submit", "Generate Chart"
- Progress log styling differs between pages

**Recommendation:** Pick one approach and standardize across all templates.

---

### 4. Hardcoded Location Data in JavaScript (Low Priority)

**Location:** Each JS file contains its own copy of the locations database (e.g., `daily_prices.js` lines 13-200+)

**Problem:**
- Duplicated data across multiple files
- Changes require updating multiple files
- Increases bundle size

**Recommendation:** Serve locations from a single API endpoint or shared JS module.

---

### 5. No Request Timeout Handling for Slow API Responses (Low Priority)

**Location:** `auth.py` - `ngi_request()` function

**Current state:** Uses 30-second timeout (line 165), which is reasonable.

**Potential improvement:** Add user-facing feedback for slow requests, or consider shorter timeout with retry logic.

---

### 6. Environment Variable Validation at Startup (Low Priority)

**Location:** `auth.py` - `init_encryption()` function

**Current state:** Raises error if `ENCRYPTION_KEY` is missing, but only when first used.

**Recommendation:** Validate all required environment variables (`FLASK_SECRET_KEY`, `ENCRYPTION_KEY`) at app startup with clear error messages.

---

## Architecture Notes (No Action Required)

### What's Working Well

- **Security model:** Fernet encryption for credentials, server-side sessions, HttpOnly cookies
- **Blueprint structure:** Clean separation of concerns
- **Session management:** Proper expiration handling with `before_request` hook
- **Data normalization:** Good handling of NGI's columnar API response format
- **Token refresh:** NGI access tokens stored in session with expiration tracking

### Project Statistics

- 13 data visualization modules
- 21 HTML templates
- 17 JavaScript files
- Clean Flask blueprint architecture

---

## Quick Reference: Decorator Usage

| Route Type | Decorator | Returns on Auth Failure |
|------------|-----------|------------------------|
| Page routes (`/daily-prices`) | `@require_api_creds` | HTML redirect to `/auth` |
| API routes (`/api/daily-prices`) | `@require_api_creds_json` | `{"auth_required": true}` JSON |
