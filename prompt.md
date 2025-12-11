You are building a secure Python Flask app to run on Replit.

High-level concept:
- This app is a “chart lab” for Natural Gas Intelligence (NGI) data. The data is available via the NGI API documented at: https://api.ngidata.com/static/apispec.json
- Users already have NGI API credentials (email + API key or token). We do NOT manage NGI accounts; they just bring their existing credentials.
- Users log into this app with their NGI credentials. The app uses those credentials to call api.ngidata.com on the user’s behalf and display charts.
- Security is the top priority. No API keys or tokens should ever be exposed in the browser or checked into source.

Authentication model (BYO API key):
- Create a login route at /auth that takes:
  - NGI email (username)
  - NGI API key (or NGI password/token)
  - A “Remember me” checkbox
- On POST /auth:
  - Validate the credentials by calling a minimal NGI endpoint. Use the OpenAPI spec at https://api.ngidata.com/static/apispec.json to find an appropriate endpoint (status/ping or similar).
  - If credentials are valid:
    - Compute a per-session expiry:
      - 8 hours if “Remember me” is not checked
      - 7 days if “Remember me” is checked
    - Store the credentials securely in the session:
      - Use server-side sessions via Flask-Session:
        - SESSION_TYPE = 'filesystem'
        - SESSION_FILE_DIR = './.flask_session'
        - SESSION_COOKIE_SECURE = True
        - SESSION_COOKIE_HTTPONLY = True
        - SESSION_COOKIE_SAMESITE = 'Lax'
      - Use cryptography.fernet.Fernet with an ENCRYPTION_KEY from environment variables to encrypt the NGI email and API key before storing them in the session:
        - session['ngi_email_enc'] = encrypted email
        - session['ngi_key_enc'] = encrypted api key
        - session['expires_at'] = ISO timestamp of expiration
    - Redirect the user to /dashboard.
  - If credentials are invalid:
    - Show an error and do not store anything.

- Implement a before_request handler that:
  - Checks session['expires_at'] on each request.
  - If the current time is past expires_at:
    - Clear the session and redirect the user back to /auth.

- Implement a decorator, e.g. @require_api_creds, that:
  - Checks that the encrypted NGI credentials exist in the session.
  - If not, redirects to /auth.

- For NGI requests:
  - Create a helper function (e.g. ngi_request(path, method='GET', params=None, json=None)) that:
    - Decrypts the NGI email and API key from the session using Fernet.
    - Builds the appropriate authentication for the NGI API (as documented in https://api.ngidata.com/static/apispec.json).
    - Calls https://api.ngidata.com/<path> with the right headers/params using the Python requests library.
    - Returns parsed JSON, or raises an error on failure.
  - This helper must never expose decrypted credentials to logs, templates, or the browser.

- Add CSRF protection for POST routes (at least /auth). You can use Flask-WTF or a simple custom token stored in the session and included in a hidden form field.
- Add basic rate limiting on /auth to prevent brute force:
  - Use flask-limiter if possible, or implement a simple in-memory per-IP attempt counter plus a small delay between failed attempts.

App structure:
- Use the following rough structure (you can create blueprints):

  .
  ├─ app.py
  ├─ auth.py              # login/logout, session helpers, before_request checks
  ├─ data_routes/
  │  ├─ daily_prices.py   # /api/daily-prices
  │  ├─ spreads.py        # /api/spreads
  │  ├─ strips.py         # /api/strips
  │  ├─ lng_flows.py      # /api/lng-flows
  │  └─ netbacks.py       # /api/netbacks
  ├─ templates/
  │  ├─ base.html
  │  ├─ auth.html         # login form
  │  ├─ dashboard.html    # main hub with navigation
  │  ├─ daily_prices.html
  │  ├─ spreads.html
  │  ├─ strips.html
  │  ├─ lng_flows.html
  │  └─ netbacks.html
  ├─ static/
  │  ├─ css/
  │  │  └─ styles.css
  │  └─ js/
  │     ├─ daily_prices.js
  │     ├─ spreads.js
  │     ├─ strips.js
  │     ├─ lng_flows.js
  │     └─ netbacks.js
  └─ requirements.txt

- Main routes:
  - GET /:
    - If user has a valid session, redirect to /dashboard
    - Else redirect to /auth
  - GET, POST /auth:
    - As described in the authentication model.
  - GET /logout:
    - Clear the session and redirect to /auth
  - GET /dashboard:
    - Requires valid session.
    - Shows links/cards for the various tools: daily prices, spreads, strips, LNG flows, netbacks.

- API routes (all require valid session and use the NGI helper):
  - GET /api/daily-prices
  - GET /api/spreads
  - GET /api/strips
  - GET /api/lng-flows
  - GET /api/netbacks

  Each API route:
  - Accepts relevant query parameters (date range, locations, etc.).
  - Calls the appropriate NGI endpoint via the helper function.
  - Normalizes NGI JSON data into a chart-friendly format (e.g. an array of objects with date and values for each series).
  - Returns JSON to the browser.

Frontend requirements:
- Use the single JS charting library ECharts across all pages.
- Each HTML template for a tool (daily_prices, spreads, strips, lng_flows, netbacks) should:
  - Extend base.html.
  - Provide a small form for user inputs (date range, locations/hubs, etc.).
  - Include a <div id="chart"> for the chart.
  - Load a corresponding JS file that:
    - Prevents default form submission.
    - Calls the internal /api/... endpoint via fetch.
    - Updates the chart based on the returned JSON.
    - Handles basic loading and error states.

Config and environment:
- Use environment variables for:
  - FLASK_SECRET_KEY
  - ENCRYPTION_KEY (Fernet key)
  - NGI_API_BASE (default 'https://api.ngidata.com')
- When creating code, assume the app will run on Replit with these variables set in the Replit Secrets environment.
- Run Flask with debug=False for any non-trivial deployment.

Please start by:
1. Setting up app.py and auth.py with:
   - Flask-Session
   - Fernet-based encryption
   - /auth and /logout
   - before_request expiry enforcement
   - an NGI helper function stub
2. Then create a minimal /dashboard and one example API route (e.g. /api/lng-flows) plus a matching HTML + JS page, using dummy or simplified parsing of the NGI API JSON.
3. Keep all logic for NGI data access in the backend and never expose NGI credentials on the frontend.
