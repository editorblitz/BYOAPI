# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **secure Python Flask application** designed to run on Replit. It's a "chart lab" for Natural Gas Intelligence (NGI) data that implements a **"Bring Your Own API"** authentication model.

**Key principle:** Users bring their own NGI API credentials (email + API key) and log in. The app never manages NGI accounts—it just proxies authenticated requests to the NGI API (https://api.ngidata.com) on the user's behalf.

## Architecture

### Authentication & Security Model

1. **Session Management:**
   - Uses Flask-Session with filesystem storage (`./.flask_session`)
   - Server-side sessions only; credentials never sent to client
   - Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`

2. **Credential Encryption:**
   - NGI credentials (email + API key) are encrypted with `cryptography.fernet.Fernet` before storing in session
   - Decryption happens only on the backend when needed for NGI API calls
   - Credentials are never exposed in logs, templates, or to the browser

3. **Session Expiration:**
   - **8 hours** if "Remember me" is unchecked
   - **7 days** if "Remember me" is checked
   - A `before_request` handler validates `session['expires_at']` on each request and clears the session if expired

4. **Credential Validation:**
   - On login, credentials are tested immediately by calling an NGI endpoint (per the OpenAPI spec at https://api.ngidata.com/static/apispec.json)
   - Only valid credentials are stored in the session

### Code Structure

```
.
├── app.py                      # Flask app initialization, routes (/, /auth, /logout, /dashboard)
├── auth.py                     # Authentication logic (login/logout, session helpers, encryption/decryption, before_request checks)
├── data_routes/                # API blueprint modules
│  ├── daily_prices.py         # GET /api/daily-prices
│  ├── spreads.py              # GET /api/spreads
│  ├── strips.py               # GET /api/strips
│  ├── lng_flows.py            # GET /api/lng-flows
│  └── netbacks.py             # GET /api/netbacks
├── templates/
│  ├── base.html               # Base template with navigation
│  ├── auth.html               # Login form (email + API key + "Remember me")
│  ├── dashboard.html          # Main hub with links to tools
│  ├── daily_prices.html       # Tool page (chart + form)
│  ├── spreads.html
│  ├── strips.html
│  ├── lng_flows.html
│  └── netbacks.html
├── static/
│  ├── css/
│  │  └── styles.css
│  └── js/
│     ├── daily_prices.js
│     ├── spreads.js
│     ├── strips.js
│     ├── lng_flows.js
│     └── netbacks.js
├── requirements.txt
└── .env (local only)
```

### Data Flow

1. User logs in at `/auth` with NGI email + API key
2. Backend validates credentials with NGI API
3. Backend encrypts credentials and stores in `session['ngi_email_enc']` and `session['ngi_key_enc']`
4. User accesses `/dashboard` or tool pages
5. Frontend pages include forms for user inputs (date ranges, locations, etc.)
6. Frontend calls internal `/api/*` routes via fetch
7. Backend routes use the `ngi_request()` helper to:
   - Decrypt credentials from session
   - Call NGI API on behalf of the user
   - Normalize NGI JSON into chart-friendly format
8. Frontend receives JSON and renders charts with **ECharts**

## Environment Variables

Set these in Replit Secrets (or a local `.env` file):

- `FLASK_SECRET_KEY`: Used for Flask session signing (generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
- `ENCRYPTION_KEY`: Fernet key for credential encryption (generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
- `NGI_API_BASE`: Base URL for NGI API (default: `https://api.ngidata.com`)
- `FLASK_ENV`: Set to `production` for deployment (debug=False)

## Common Development Tasks

### Run the Flask app locally

```bash
python app.py
```

The app runs on `http://localhost:5000` by default.

### Generate required keys

```bash
# Flask secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Add a new data endpoint

1. Create a new module in `data_routes/` (e.g., `data_routes/my_tool.py`)
2. Define a route that:
   - Uses the `@require_api_creds` decorator (from `auth.py`)
   - Accepts query parameters for user inputs
   - Calls `ngi_request()` to fetch NGI data
   - Normalizes the response and returns JSON
3. Register the blueprint in `app.py`
4. Create an HTML template in `templates/my_tool.html` with a form and `<div id="chart">`
5. Create a JS file in `static/js/my_tool.js` that:
   - Prevents default form submission
   - Calls `/api/my-tool` via fetch
   - Updates the ECharts chart with returned data

### Test NGI API integration

Use the NGI API spec at https://api.ngidata.com/static/apispec.json to identify endpoints. Common endpoints include:
- `/auth` - Token authentication (used for credential validation)
- `/bidweekDatafeed.json` - Bid-week data
- Other endpoint paths are defined in the OpenAPI spec

## Key Implementation Details

### NGI Request Helper

The `ngi_request()` helper (in `auth.py`) handles:
- Decrypting credentials from session
- Building appropriate auth headers/params per NGI spec
- Making requests to `https://api.ngidata.com/<path>`
- Raising errors on failure (never returns decrypted credentials)

### Before-Request Session Validation

The `before_request` handler in `auth.py` checks `session['expires_at']` before each request. If expired, the session is cleared and the user is redirected to `/auth`.

### CSRF Protection

POST routes (especially `/auth`) should use Flask-WTF's CSRF token or a simple custom token stored in the session.

### Rate Limiting

The `/auth` route should have rate limiting to prevent brute force attacks. Options:
- `flask-limiter` library (recommended)
- Simple in-memory per-IP attempt counter with a delay between failed attempts

## Frontend

All pages use **ECharts** for charting. Each tool's HTML template:
- Extends `base.html`
- Provides a form for user inputs
- Includes a `<div id="chart">`
- Loads a corresponding JS file

The JS file:
- Prevents default form submission
- Calls the internal `/api/...` endpoint
- Parses the returned JSON
- Renders the chart using ECharts
- Handles loading and error states

## Reference Files

These files contain critical information for developing this app:

### prompt.md
**Complete specification for the entire project.** Refer to this for:
- Detailed authentication model requirements
- Complete list of routes and endpoints
- Data normalization expectations for each endpoint
- Frontend template and JS file structure
- Environment configuration details
- Full code structure and file organization

**Location:** `prompt.md`

### API.json
**NGI API OpenAPI specification.** Use this to:
- Identify available NGI endpoints
- Understand request/response schemas
- Find the appropriate endpoint for credential validation (typically `/auth`)
- Determine required query parameters and response formats for each data endpoint
- Reference examples in the `paths` section

**Location:** `API.json`

### authentication.md
**Reference implementation of the authentication flow.** Contains:
- Example Flask code structure
- Session and encryption implementation patterns
- HTML template examples for login and dashboard
- User experience flow scenarios
- Security highlights and setup checklist

## Replit Deployment

The app is designed to run on Replit. When deploying:
1. Set all environment variables in Replit Secrets
2. Ensure `FLASK_ENV=production` and `debug=False`
3. The Flask app runs on the default Replit port (typically via `python app.py`)
4. Replit provides HTTPS, so `SESSION_COOKIE_SECURE=True` is safe
