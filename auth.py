"""
Authentication module for BYO API Dashboard.
Handles login/logout, session management, credential encryption, and NGI API requests.
"""

import os
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, g
from cryptography.fernet import Fernet, InvalidToken
import requests

# Blueprint for auth routes
auth_bp = Blueprint('auth', __name__)

# NGI API configuration
NGI_API_BASE = os.environ.get('NGI_API_BASE', 'https://api.ngidata.com')

# Encryption cipher (initialized in init_encryption)
_cipher = None


def init_encryption(app):
    """Initialize the Fernet cipher with the encryption key from environment."""
    global _cipher
    encryption_key = os.environ.get('ENCRYPTION_KEY')
    if not encryption_key:
        raise ValueError("ENCRYPTION_KEY environment variable is required")
    _cipher = Fernet(encryption_key.encode())


def get_cipher():
    """Get the initialized cipher."""
    if _cipher is None:
        raise RuntimeError("Encryption not initialized. Call init_encryption() first.")
    return _cipher


def encrypt_value(value: str) -> str:
    """Encrypt a string value and return base64-encoded ciphertext."""
    return get_cipher().encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a base64-encoded ciphertext and return the original string."""
    try:
        return get_cipher().decrypt(encrypted_value.encode()).decode()
    except InvalidToken:
        return None


def check_session_expiry():
    """
    Check if the current session has expired.
    Returns True if session is valid, False if expired or invalid.
    """
    expires_at = session.get('expires_at')
    if not expires_at:
        return False

    try:
        expiry_time = datetime.fromisoformat(expires_at)
        return datetime.utcnow() < expiry_time
    except (ValueError, TypeError):
        return False


def require_api_creds(f):
    """
    Decorator that ensures the user has valid encrypted NGI credentials in session.
    Redirects to /auth if credentials are missing or session is expired.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('ngi_email_enc') or not session.get('ngi_key_enc'):
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('auth.login'))

        if not check_session_expiry():
            session.clear()
            flash('Your session has expired. Please log in again.', 'warning')
            return redirect(url_for('auth.login'))

        return f(*args, **kwargs)
    return decorated_function


def get_decrypted_credentials():
    """
    Get decrypted NGI credentials from the session.
    Returns (email, api_key) tuple or (None, None) if unavailable.
    """
    email_enc = session.get('ngi_email_enc')
    key_enc = session.get('ngi_key_enc')

    if not email_enc or not key_enc:
        return None, None

    email = decrypt_value(email_enc)
    api_key = decrypt_value(key_enc)

    return email, api_key


def ngi_request(path: str, method: str = 'GET', params: dict = None, json_data: dict = None):
    """
    Make an authenticated request to the NGI API.

    Args:
        path: API endpoint path (without base URL)
        method: HTTP method (GET, POST, etc.)
        params: Query parameters
        json_data: JSON body for POST requests

    Returns:
        Parsed JSON response

    Raises:
        Exception on API errors
    """
    email, api_key = get_decrypted_credentials()
    if not email or not api_key:
        raise Exception("No valid credentials in session")

    # Get access token from session or refresh it
    access_token = session.get('ngi_access_token')
    token_expires = session.get('ngi_token_expires')

    # Check if we need to get a new token
    if not access_token or not token_expires or datetime.utcnow() >= datetime.fromisoformat(token_expires):
        access_token = _get_ngi_token(email, api_key)
        if not access_token:
            raise Exception("Failed to authenticate with NGI API")

    # Make the actual API request
    url = f"{NGI_API_BASE}/{path.lstrip('/')}"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    }

    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, params=params, json=json_data, timeout=30)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        raise Exception(f"NGI API request failed: {str(e)}")


def _get_ngi_token(email: str, api_key: str) -> str:
    """
    Get an access token from the NGI API using email and API key.
    Stores the token in session for reuse.
    Returns the access token or None on failure.
    """
    try:
        response = requests.post(
            f"{NGI_API_BASE}/auth",
            json={
                'email': email,
                'password': api_key
            },
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')

            if access_token:
                # Store token with expiration (assume 24 hours, adjust based on actual API behavior)
                session['ngi_access_token'] = access_token
                session['ngi_token_expires'] = (datetime.utcnow() + timedelta(hours=23)).isoformat()
                return access_token

        return None

    except requests.RequestException:
        return None


def verify_ngi_credentials(email: str, api_key: str) -> bool:
    """
    Verify NGI credentials by attempting to get an access token.
    Returns True if credentials are valid, False otherwise.
    """
    token = _get_ngi_token(email, api_key)
    return token is not None


# ============= AUTH ROUTES =============

@auth_bp.route('/auth', methods=['GET', 'POST'])
def login():
    """Handle login page display and form submission."""
    # If already logged in with valid session, redirect to dashboard
    if session.get('ngi_email_enc') and check_session_expiry():
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        api_key = request.form.get('api_key', '').strip()
        remember_me = request.form.get('remember_me') == 'on'

        # Validate inputs
        if not email or not api_key:
            flash('Please provide both email and API key.', 'error')
            return render_template('auth.html')

        # Verify credentials with NGI API
        if not verify_ngi_credentials(email, api_key):
            flash('Invalid credentials. Please check your email and API key.', 'error')
            return render_template('auth.html')

        # Credentials valid - set up session
        session.clear()

        # Calculate expiration
        if remember_me:
            expires_at = datetime.utcnow() + timedelta(days=7)
        else:
            expires_at = datetime.utcnow() + timedelta(hours=8)

        # Store encrypted credentials
        session['ngi_email_enc'] = encrypt_value(email)
        session['ngi_key_enc'] = encrypt_value(api_key)
        session['expires_at'] = expires_at.isoformat()
        session['remember_me'] = remember_me
        session['user_email'] = email  # Store email unencrypted for display purposes only

        flash('Successfully logged in!', 'success')
        return redirect(url_for('dashboard'))

    return render_template('auth.html')


@auth_bp.route('/logout')
def logout():
    """Clear session and redirect to login."""
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))


# ============= BEFORE REQUEST HANDLER =============

def register_before_request(app):
    """Register the before_request handler with the Flask app."""

    @app.before_request
    def check_session_validity():
        """Check session expiry on each request."""
        # Skip for static files and auth routes
        if request.endpoint and (
            request.endpoint.startswith('static') or
            request.endpoint in ('auth.login', 'auth.logout', 'index')
        ):
            return

        # If session has credentials but is expired, clear it
        if session.get('ngi_email_enc') and not check_session_expiry():
            session.clear()
            flash('Your session has expired. Please log in again.', 'warning')
            return redirect(url_for('auth.login'))
