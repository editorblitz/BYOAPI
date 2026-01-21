# NGI Data Tools

A secure Python Flask application for visualizing Natural Gas Intelligence (NGI) data using a "Bring Your Own API" authentication model.

## Description

NGI Data Tools is a web-based charting application that allows users to visualize NGI data using their own API credentials. The app never stores or manages NGI accounts—users bring their existing NGI email and API key, and the app securely proxies requests to the NGI API on their behalf.

**Security is the top priority**: All credentials are encrypted using Fernet encryption and stored in server-side sessions. No API keys or tokens are ever exposed to the browser or logged.

## Features

- **Secure Authentication**: Fernet-encrypted credentials stored in server-side filesystem sessions
- **Session Management**: 8-hour sessions (or 7 days with "Remember me" option)
- **CSRF Protection**: Built-in CSRF token validation on all POST requests
- **Rate Limiting**: Brute-force protection on login endpoint (5 attempts/minute)
- **5 Interactive Chart Tools**:
  - **Daily Prices**: Historical price data across multiple locations
  - **Spreads**: Price spread analysis between locations
  - **Strips**: Forward strip pricing curves
  - **LNG Flows**: LNG import/export flow tracking
  - **Netbacks**: Netback value calculations and visualization
- **Modern UI**: Clean, responsive interface using ECharts for interactive charts

## Project Structure

```
BYO dashboard/
├── app.py                      # Main Flask app with routes and config
├── auth.py                     # Authentication, encryption, NGI API helper
├── requirements.txt            # Python dependencies
├── Pipfile                     # Pipenv dependencies
├── .env.example                # Environment variables template
├── CLAUDE.md                   # Development guide for Claude Code
├── data_routes/
│   ├── __init__.py
│   ├── daily_prices.py         # /api/daily-prices endpoint
│   ├── spreads.py              # /api/spreads endpoint
│   ├── strips.py               # /api/strips endpoint
│   ├── lng_flows.py            # /api/lng-flows endpoint
│   └── netbacks.py             # /api/netbacks endpoint
├── templates/
│   ├── base.html               # Base template with navbar
│   ├── auth.html               # Login page
│   ├── dashboard.html          # Tool hub with cards
│   ├── error.html              # Error page
│   └── *.html                  # Individual tool pages
└── static/
    ├── css/styles.css          # Application styling
    └── js/*.js                 # ECharts implementations
```

## Setup Instructions

### Prerequisites

- Python 3.8+ (tested on 3.11)
- pipenv (install with `pip install pipenv`)
- An active NGI data subscription with API access

### Installation with pipenv

1. **Clone or navigate to the project directory**

2. **Install dependencies using pipenv**:
   ```bash
   pipenv install
   ```

   This will create a virtual environment and install all dependencies from the Pipfile.

3. **Generate encryption keys**:
   ```bash
   # Generate Flask secret key
   pipenv run python -c "import secrets; print('FLASK_SECRET_KEY=' + secrets.token_hex(32))"

   # Generate Fernet encryption key
   pipenv run python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
   ```

4. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` and add your generated keys**:
   ```
   FLASK_SECRET_KEY=your-generated-secret-key-here
   ENCRYPTION_KEY=your-generated-fernet-key-here
   NGI_API_BASE=https://api.ngidata.com
   FLASK_ENV=development
   ```

### Running the Application

**Start the Flask development server**:
```bash
pipenv run python app.py
```

The application will be available at http://localhost:5000

### Alternative: Using pipenv shell

You can also activate the virtual environment and run commands directly:

```bash
# Activate the virtual environment
pipenv shell

# Run the app
python app.py

# When done, exit the shell
exit
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FLASK_SECRET_KEY` | Secret key for Flask session signing | Generated with `secrets.token_hex(32)` |
| `ENCRYPTION_KEY` | Fernet key for encrypting NGI credentials | Generated with `Fernet.generate_key()` |
| `NGI_API_BASE` | Base URL for NGI API | `https://api.ngidata.com` |
| `FLASK_ENV` | Flask environment mode | `development` or `production` |

## Usage

1. **Login**: Navigate to http://localhost:5000 and enter your NGI email and API key
2. **Dashboard**: After successful login, you'll see the tool hub with 5 available tools
3. **Select a Tool**: Click on any tool card to access the charting interface
4. **Load Data**: Fill in the form parameters (dates, locations, etc.) and click "Load Chart"
5. **Interact**: Use ECharts features to zoom, pan, and explore the data

## Development with pipenv

### Install a new package:
```bash
pipenv install package-name
```

### Install a development dependency:
```bash
pipenv install --dev package-name
```

### Update all dependencies:
```bash
pipenv update
```

### Check for security vulnerabilities:
```bash
pipenv check
```

### Generate requirements.txt (for deployment):
```bash
pipenv requirements > requirements.txt
```

## Deployment to Replit

1. Create a new Python Repl
2. Upload all project files
3. In Replit Secrets, add:
   - `FLASK_SECRET_KEY`
   - `ENCRYPTION_KEY`
   - `NGI_API_BASE`
   - Set `FLASK_ENV=production`
4. Run the app with `python app.py`
5. Replit will automatically provide HTTPS

## Security Features

- **Credential Encryption**: All NGI credentials are encrypted with Fernet before storage
- **Server-side Sessions**: Sessions stored on filesystem, not in client cookies
- **HttpOnly Cookies**: Session cookies inaccessible to JavaScript
- **HTTPS Only**: Cookies only transmitted over secure connections
- **CSRF Protection**: All POST requests require valid CSRF tokens
- **Rate Limiting**: Login endpoint limited to 5 attempts per minute
- **Session Expiration**: Automatic expiration with before_request validation
- **No Client-side Secrets**: NGI credentials never exposed to browser

## API Integration

The app integrates with the NGI Data Services API. See the [NGI API specification](https://api.ngidata.com/static/apispec.json) for available endpoints.

The `ngi_request()` helper function in `auth.py` handles:
- Credential decryption
- Access token management
- Authenticated requests to NGI endpoints
- Error handling

## Troubleshooting

**"ENCRYPTION_KEY environment variable is required"**
- Make sure you've created a `.env` file with the encryption key

**"Invalid credentials"**
- Verify your NGI email and API key are correct
- Check that you have an active NGI data subscription

**Rate limit errors**
- Wait 1 minute before attempting to log in again

**Session expired messages**
- Your session has exceeded 8 hours (or 7 days with "Remember me")
- Simply log in again with your credentials

## Contributing

When working on this codebase, refer to `CLAUDE.md` for architecture details and development guidelines.

## License

This project is designed for NGI data clients. Contact ngidata@naturalgasintel.com for NGI API access.
