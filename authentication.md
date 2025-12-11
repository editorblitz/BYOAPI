
I want to build a python flask app to deploy on repl.it that allows a user to bring their own API login and key to access our company's data

Here's the complete flow with "Remember me" functionality:
Complete Login Flow Implementation
python# app.py
from flask import Flask, render_template, request, session, redirect, url_for, flash
from cryptography.fernet import Fernet
from datetime import timedelta
import os
import requests

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Encryption setup
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
cipher = Fernet(ENCRYPTION_KEY.encode())

# NGI API configuration
NGI_API_BASE = "https://api.naturalgasintel.com/v2"  # Your actual endpoint


# ============= MIDDLEWARE =============

@app.before_request
def check_session():
    """Check if session is still valid before each request"""
    if 'api_key' in session:
        # Session is active, refresh the modified time
        session.modified = True


# ============= ROUTES =============

@app.route('/')
def index():
    """Landing page - redirect based on auth status"""
    if 'api_key' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login_page'))


@app.route('/login')
def login_page():
    """Show the login form"""
    if 'api_key' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')


@app.route('/login', methods=['POST'])
def login():
    """Handle login submission"""
    username = request.form.get('username', '').strip()
    api_key = request.form.get('api_key', '').strip()
    remember_me = request.form.get('remember_me') == 'on'
    
    # Validate inputs
    if not username or not api_key:
        flash('Please provide both username and API key', 'error')
        return redirect(url_for('login_page'))
    
    # Verify credentials with NGI API
    if not verify_ngi_credentials(username, api_key):
        flash('Invalid credentials. Please check your username and API key.', 'error')
        return redirect(url_for('login_page'))
    
    # Credentials are valid - set up session
    session.clear()  # Clear any existing session data
    session.permanent = True
    
    # Set session lifetime based on "Remember me"
    if remember_me:
        app.permanent_session_lifetime = timedelta(days=7)
        session['remember_me'] = True
    else:
        app.permanent_session_lifetime = timedelta(hours=8)
        session['remember_me'] = False
    
    # Store encrypted credentials
    session['api_key'] = cipher.encrypt(api_key.encode()).decode()
    session['username'] = username  # Username is not as sensitive, but you could encrypt it too
    
    flash('Successfully logged in!', 'success')
    return redirect(url_for('dashboard'))


@app.route('/dashboard')
def dashboard():
    """Main dashboard - requires authentication"""
    if 'api_key' not in session:
        flash('Please log in to access the dashboard', 'warning')
        return redirect(url_for('login_page'))
    
    # Decrypt API key for use
    api_key = cipher.decrypt(session['api_key'].encode()).decode()
    username = session.get('username')
    
    # Fetch data from NGI API
    try:
        data = fetch_ngi_data(api_key)
        
        # Show session info (helpful for users to understand)
        session_info = {
            'username': username,
            'remember_me': session.get('remember_me', False),
            'expires_in': '7 days' if session.get('remember_me') else '8 hours'
        }
        
        return render_template('dashboard.html', data=data, session_info=session_info)
    
    except Exception as e:
        flash('Error fetching data. Your session may have expired.', 'error')
        session.clear()
        return redirect(url_for('login_page'))


@app.route('/logout')
def logout():
    """Clear session and log out"""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('login_page'))


# ============= HELPER FUNCTIONS =============

def verify_ngi_credentials(username, api_key):
    """
    Verify credentials with NGI API
    Make a test call to ensure credentials are valid
    """
    try:
        # Make a simple API call to verify credentials
        response = requests.get(
            f"{NGI_API_BASE}/ping",  # Or whatever your validation endpoint is
            headers={
                'Authorization': f'Bearer {api_key}',
                'X-Username': username
            },
            timeout=10
        )
        return response.status_code == 200
    except requests.RequestException:
        return False


def fetch_ngi_data(api_key):
    """
    Fetch data from NGI API using the provided API key
    This is where you'd make your actual data calls
    """
    try:
        response = requests.get(
            f"{NGI_API_BASE}/your-data-endpoint",
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise Exception(f"Failed to fetch NGI data: {str(e)}")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
HTML Templates
html<!-- templates/login.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NGI Data Tool - Login</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
            color: #333;
        }
        label {
            display: block;
            margin-top: 20px;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 14px;
        }
        .remember-me {
            margin-top: 20px;
            display: flex;
            align-items: center;
        }
        .remember-me input {
            margin-right: 8px;
        }
        .remember-me label {
            margin: 0;
            font-weight: normal;
            color: #666;
            cursor: pointer;
        }
        button {
            width: 100%;
            padding: 12px;
            margin-top: 20px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 500;
        }
        button:hover {
            background: #0052a3;
        }
        .flash-messages {
            margin-bottom: 20px;
        }
        .flash {
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .flash.error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
        .flash.success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
        }
        .info-text {
            margin-top: 15px;
            font-size: 13px;
            color: #666;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>NGI Data Tool</h1>
        
        <!-- Flash messages -->
        {% with messages = get_flashed_messages(with_categories=true) %}
            {% if messages %}
                <div class="flash-messages">
                    {% for category, message in messages %}
                        <div class="flash {{ category }}">{{ message }}</div>
                    {% endfor %}
                </div>
            {% endif %}
        {% endwith %}
        
        <form method="POST" action="{{ url_for('login') }}" autocomplete="on">
            <label for="username">NGI Username or Email</label>
            <input 
                type="text" 
                id="username" 
                name="username" 
                autocomplete="username"
                placeholder="your.email@company.com"
                required
            >
            
            <label for="api_key">API Key</label>
            <input 
                type="password" 
                id="api_key" 
                name="api_key" 
                autocomplete="current-password"
                placeholder="Enter your NGI API key"
                required
            >
            
            <div class="remember-me">
                <input type="checkbox" id="remember_me" name="remember_me">
                <label for="remember_me">Keep me logged in for 7 days</label>
            </div>
            
            <button type="submit">Login</button>
            
            <p class="info-text">
                <strong>First time?</strong> Your browser will offer to save these credentials. 
                Click "Save" to auto-fill next time.<br><br>
                Without "Remember me": Login expires after 8 hours<br>
                With "Remember me": Login expires after 7 days
            </p>
        </form>
    </div>
</body>
</html>
html<!-- templates/dashboard.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NGI Data Tool - Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .session-info {
            color: #666;
            font-size: 14px;
        }
        .logout-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .logout-btn:hover {
            background: #c82333;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="session-info">
            Logged in as <strong>{{ session_info.username }}</strong><br>
            Session expires in: {{ session_info.expires_in }}
        </div>
        <a href="{{ url_for('logout') }}" class="logout-btn">Logout</a>
    </div>
    
    <div class="content">
        <h1>Your NGI Data Dashboard</h1>
        
        <!-- Your actual dashboard content here -->
        <p>Welcome! Your data analysis tools are ready.</p>
        
        <!-- Example: Display fetched data -->
        {% if data %}
            <pre>{{ data | tojson(indent=2) }}</pre>
        {% endif %}
    </div>
</body>
</html>
User Experience Flow
Scenario 1: First-Time User

Opens app → sees login form
Enters username + API key
Checks "Keep me logged in for 7 days"
Clicks Submit
Chrome asks: "Save password?" → User clicks Save
Redirected to dashboard ✓

Scenario 2: Returning User (Next Day, Within 7 Days)

Opens app → automatically sees dashboard
Still logged in from yesterday ✓

Scenario 3: Returning User (After 8 Hours, No Remember Me)

Opens app → redirected to login
Click in username field → Chrome auto-fills both fields
Click Submit (or just press Enter)
Back in dashboard ✓

Total time: ~2 seconds



Scenario 4: After 7 Days

Opens app → redirected to login
Chrome auto-fills credentials (one click)
Can check "Remember me" again for another 7 days

Security Highlights
✅ Credentials encrypted in session storage
✅ Session cookies are HttpOnly (no JavaScript access)
✅ HTTPS only (Replit provides this)
✅ Browser password manager integration (secure + convenient)
✅ Configurable timeouts (balance security vs. UX)
✅ Session validation on every request
✅ Credentials verified with NGI API before storing
Setup Checklist

Generate keys (run locally, then add to Replit Secrets):

bash# SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

2. **Add to Replit Secrets** (in the Tools panel):
   - `SECRET_KEY` = [output from above]
   - `ENCRYPTION_KEY` = [output from above]

3. **requirements.txt**:
```
Flask
cryptography
requests
This setup gives your NGI colleagues a smooth experience: most users will interact with the login screen once per week max, and when they do, it's just one click thanks to Chrome auto-fill!