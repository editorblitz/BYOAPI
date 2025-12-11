# Repository Guidelines

Contributors extend NGI Chart Lab by respecting the Flask app's security posture and keeping API-facing modules consistent. Treat user credentials and sample data as production-grade assets even when running locally.

## Project Structure & Module Organization
- `app.py` wires Flask routes, session handling, and template selection; keep new routes minimal and push request logic into helpers.
- `auth.py` owns Fernet encryption, NGI session caching, and the `ngi_request` helper; reuse it for any external call.
- `data_routes/` holds the JSON endpoints (`daily_prices.py`, `spreads.py`, etc.); mirror the existing naming when you add another tool.
- `templates/` and `static/` contain the HTML shells and ECharts resources; align new assets under matching subfolders.
- `examples/` and `daily-price-idea/` store reference notebooks and prototypes that illustrate expected payload shapes.

## Build, Test, and Development Commands
- `pipenv install` sets up the virtual environment defined by `Pipfile` / `Pipfile.lock`.
- `pipenv run python app.py` launches the dev server at http://localhost:5000 with CSRF, rate limiting, and filesystem sessions enabled.
- `pipenv shell` enters the environment so you can run ad-hoc commands like `python scripts/seed.py` if you add tooling.
- `pipenv check` scans dependencies for known vulnerabilities; run it before proposing deployments.

## Coding Style & Naming Conventions
Use Python 3.11+, 4-space indentation, and PEP 8 naming (`snake_case` functions, `PascalCase` classes). Route files follow `data_routes/<feature>.py` and expose Blueprint handlers named after the NGI endpoint (e.g., `get_daily_prices`). Keep secrets in `.env`, load with `python-dotenv`, and never print decrypted credentials.

## Testing Guidelines
No automated suite ships yet, so create `tests/test_<module>.py` files with `pytest` when adding logic-heavy helpers. Mock NGI responses and assert encryption boundaries instead of hitting live APIs. Run with `pipenv run pytest` once the dependency is added, and rerun `pipenv run python app.py` for manual UI smoke tests after backend changes.

## Commit & Pull Request Guidelines
This snapshot lacks Git history, so default to imperative subject lines (`Add LNG spread route`) with concise bodies explaining risk areas. Pull requests should include: summary of behavior changes, screenshots or JSON samples for UI/API updates, configuration impacts (`.env` keys, rate limits), and a checklist of manual or automated tests executed.

## Security & Configuration Tips
Duplicate `.env.example` into `.env`, set fresh `FLASK_SECRET_KEY` and `ENCRYPTION_KEY`, and store them outside version control. Verify new API helpers call `ngi_request` so encryption and rate limiting remain centralized. Treat `static/` assets as untrusted input and sanitize any user-provided labels before rendering.
