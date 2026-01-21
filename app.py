"""
BYO API Dashboard - Main Flask Application
A secure charting app for NGI data using "Bring Your Own API" authentication.
"""

import os
from datetime import timedelta

from flask import Flask, redirect, url_for, render_template, session
from flask_session import Session
from flask_wtf.csrf import CSRFProtect
from dotenv import load_dotenv

from extensions import limiter

# Load environment variables from .env file (for local development)
load_dotenv()

# Import auth module
from auth import auth_bp, init_encryption, register_before_request, require_api_creds

# Create Flask app
app = Flask(__name__)

# ============= CONFIGURATION =============

# Secret key for session signing
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', os.urandom(32).hex())

# Session configuration - server-side filesystem storage
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './.flask_session'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Max lifetime
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# Initialize extensions
Session(app)
csrf = CSRFProtect(app)
limiter.init_app(app)

# Initialize encryption
init_encryption(app)

# Register before_request handler
register_before_request(app)

# Register auth blueprint
app.register_blueprint(auth_bp)

# ============= DATA ROUTE BLUEPRINTS =============

# Import and register data route blueprints
from data_routes.lng_flows import lng_flows_bp
from data_routes.daily_prices import daily_prices_bp
# from data_routes.spreads import spreads_bp  # DEPRECATED - Spreads now integrated into Daily Prices
from data_routes.forward_prices import forward_prices_bp
from data_routes.netbacks import netbacks_bp
from data_routes.quick_charts import quick_charts_bp
from data_routes.spread_dashboard import spread_dashboard_bp
from data_routes.forward_spread_dashboard import forward_spread_dashboard_bp
from data_routes.forward_curve_spread_dashboard import forward_curve_spread_dashboard_bp
from data_routes.forward_table import forward_table_bp
from data_routes.forward_heatmap import forward_heatmap_bp
from data_routes.strip_calculator import strip_calculator_bp

app.register_blueprint(lng_flows_bp)
app.register_blueprint(daily_prices_bp)
# app.register_blueprint(spreads_bp)  # DEPRECATED - Spreads now integrated into Daily Prices
app.register_blueprint(forward_prices_bp)
app.register_blueprint(netbacks_bp)
app.register_blueprint(quick_charts_bp)
app.register_blueprint(spread_dashboard_bp)
app.register_blueprint(forward_spread_dashboard_bp)
app.register_blueprint(forward_curve_spread_dashboard_bp)
app.register_blueprint(forward_table_bp)
app.register_blueprint(forward_heatmap_bp)
app.register_blueprint(strip_calculator_bp)

# ============= MAIN ROUTES =============

@app.route('/')
def index():
    """Landing page - redirect based on auth status."""
    if session.get('ngi_email_enc'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('auth.login'))


@app.route('/dashboard')
@require_api_creds
def dashboard():
    """Main dashboard hub with links to all tools."""
    session_info = {
        'email': session.get('user_email', 'Unknown'),
        'remember_me': session.get('remember_me', False),
        'expires_in': '7 days' if session.get('remember_me') else '8 hours'
    }

    tools = [
        {
            'name': 'Spot Prices',
            'description': 'View and chart daily natural gas prices, compare locations, analyze spreads, and explore seasonal patterns',
            'url': url_for('daily_prices.daily_prices_page'),
            'icon': 'chart-line',
            'category': 'spot',
            'image': 'spot-prices.png'
        },
        {
            'name': 'Spot Spreads Dashboard',
            'description': 'Monitor multiple price spreads simultaneously with customizable timeframes and quick comparison tools',
            'url': url_for('spread_dashboard.spread_dashboard_page'),
            'icon': 'dashboard',
            'category': 'spot',
            'image': 'spot-spreads-dashboard.png'
        },
        {
            'name': 'Forward Prices',
            'description': 'View and analyze forward price curves, compare locations, and track contract evolution',
            'url': url_for('forward_prices.forward_prices_page'),
            'icon': 'layer-group',
            'category': 'forwards',
            'image': 'forward-prices.png'
        },
        {
            'name': 'Fixed Forward Spreads Dashboard',
            'description': 'Track fixed forward price spreads (prompt month) over time with customizable timeframes and location comparisons',
            'url': url_for('forward_spread_dashboard.forward_spread_dashboard_page'),
            'icon': 'dashboard',
            'category': 'forwards',
            'image': 'fixed-forward-spreads-dashboard.png'
        },
        {
            'name': 'Forward Curve Spreads Dashboard',
            'description': 'View forward curve spreads across contract months with adjustable forward horizon (6M, 12M, 24M, 36M)',
            'url': url_for('forward_curve_spread_dashboard.forward_curve_spread_dashboard_page'),
            'icon': 'dashboard',
            'category': 'forwards',
            'image': 'forward-curve-spreads-dashboard.png'
        },
        {
            'name': 'Forward Heatmap',
            'description': 'Compare forward curves between two dates with heatmap visualization of price changes',
            'url': url_for('forward_heatmap.forward_heatmap_page'),
            'icon': 'th',
            'category': 'forwards',
            'image': 'forward-heatmap.png'
        },
        {
            'name': 'Strip Calculator',
            'description': 'Calculate seasonal strip prices (Winter/Summer averages) from forward curves over a date range',
            'url': url_for('strip_calculator.strip_calculator_page'),
            'icon': 'calculator',
            'category': 'forwards',
            'image': 'strip-calculator.png'
        },
        {
            'name': 'Forward Table',
            'description': 'View all locations forward curves in a table format for a single trade date with copy functionality',
            'url': url_for('forward_table.forward_table_page'),
            'icon': 'table',
            'category': 'forwards',
            'image': 'forward-table.png'
        },
        {
            'name': 'LNG Flows',
            'description': 'Track LNG import and export flows',
            'url': url_for('lng_flows.lng_flows_page'),
            'icon': 'ship',
            'category': 'lng',
            'image': 'lng-flows.png'
        },
        {
            'name': 'LNG Netbacks',
            'description': 'Compare TTF and JPN/KOR netback prices vs Henry Hub with forward curves and time series analysis',
            'url': url_for('netbacks.netbacks_page'),
            'icon': 'calculator',
            'category': 'lng',
            'image': 'lng-netbacks.png'
        },
        {
            'name': 'Midday Charts',
            'description': 'Generate publication-ready midday alert charts for a single location',
            'url': url_for('quick_charts.midday_charts_page'),
            'icon': 'chart-line',
            'category': 'charts',
            'image': 'midday-charts.png'
        },
        {
            'name': 'Midday Charts - Multi',
            'description': 'Compare multiple locations on publication-ready midday alert charts',
            'url': url_for('quick_charts.midday_charts_multi_page'),
            'icon': 'chart-line',
            'category': 'charts',
            'image': 'midday-charts-multi.png'
        },
        {
            'name': 'Daily Spot Charts',
            'description': 'Generate publication-ready daily price charts for a single location',
            'url': url_for('quick_charts.daily_spot_charts_page'),
            'icon': 'chart-bar',
            'category': 'charts',
            'image': 'daily-spot-charts.png'
        },
        {
            'name': 'Daily Spot Charts - Multi',
            'description': 'Compare multiple locations on publication-ready daily price charts',
            'url': url_for('quick_charts.daily_price_charts_page'),
            'icon': 'chart-bar',
            'category': 'charts',
            'image': 'daily-spot-charts-multi.png'
        }
    ]

    return render_template('dashboard.html', session_info=session_info, tools=tools)


# ============= ERROR HANDLERS =============

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded errors."""
    return render_template('error.html',
                           error_code=429,
                           error_message="Too many requests. Please wait a moment and try again."), 429


@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors."""
    return render_template('error.html',
                           error_code=500,
                           error_message="An internal error occurred. Please try again later."), 500


# ============= MAIN =============

if __name__ == '__main__':
    # Run with debug=False in production
    debug_mode = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
