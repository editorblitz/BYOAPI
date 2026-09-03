"""
BYO API Dashboard - Main Flask Application
A secure charting app for NGI data using "Bring Your Own API" authentication.
"""

import mimetypes
import os
from datetime import timedelta

# Browsers require a JavaScript MIME type for ES module scripts; not every
# OS mime database maps .mjs (static/lib/datagrid.mjs), so register it here.
mimetypes.add_type('text/javascript', '.mjs')

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
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'  # HTTPS only in production
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection

# Re-read templates from disk when they change (Jinja otherwise caches them until restart
# when debug is off, so an edited template can lag behind freshly served static JS)
app.config['TEMPLATES_AUTO_RELOAD'] = True

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


# ============= TOOL REGISTRY =============

# Single source of truth for how tools are grouped: navbar dropdowns and
# dashboard sections/filters all render from this structure.
TOOL_GROUPS = [
    {'key': 'tools', 'label': 'Tools', 'sections': [
        {'key': 'spot', 'heading': 'Spot Prices'},
        {'key': 'forwards', 'heading': 'Forward Look'},
        {'key': 'lng', 'heading': 'LNG'},
    ]},
    {'key': 'charts', 'label': 'Chart Generators', 'sections': [
        {'key': 'auto', 'heading': 'Automated Charts'},
        {'key': 'custom', 'heading': 'Custom Charts'},
    ]},
]


def get_tools():
    """All dashboard tools, in display order. Requires a request context (url_for)."""
    return [
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
            'category': 'auto',
            'image': 'midday-charts.png'
        },
        {
            'name': 'Midday Charts - Multi',
            'description': 'Compare multiple locations on publication-ready midday alert charts',
            'url': url_for('quick_charts.midday_charts_multi_page'),
            'icon': 'chart-line',
            'category': 'auto',
            'image': 'midday-charts-multi.png'
        },
        {
            'name': 'Daily Spot Charts',
            'description': 'Generate publication-ready daily price charts for a single location',
            'url': url_for('quick_charts.daily_spot_charts_page'),
            'icon': 'chart-bar',
            'category': 'auto',
            'image': 'daily-spot-charts.png'
        },
        {
            'name': 'Daily High/Low Charts',
            'description': 'Generate daily price range charts showing high, low, and average with legend',
            'url': url_for('quick_charts.daily_highlow_charts_page'),
            'icon': 'chart-bar',
            'category': 'auto',
            'image': 'daily-highlow-charts.png'
        },
        {
            'name': 'Daily Spot Charts - Multi',
            'description': 'Compare multiple locations on publication-ready daily price charts',
            'url': url_for('quick_charts.daily_spot_charts_multi_page'),
            'icon': 'chart-bar',
            'category': 'auto',
            'image': 'daily-spot-charts-multi.png'
        },
        {
            'name': 'Daily Spot Spread Chart',
            'description': 'Generate a publication-ready chart of the daily price spread between two locations',
            'url': url_for('quick_charts.daily_spot_spread_chart_page'),
            'icon': 'chart-bar',
            'category': 'auto',
            'image': 'daily-spot-spread-chart.png'
        },
        {
            'name': 'Forward Curve - Multi Date Charts',
            'description': 'Generate publication-ready forward curve charts showing price evolution across trade dates',
            'url': url_for('quick_charts.forward_curve_charts_page'),
            'icon': 'chart-line',
            'category': 'auto',
            'image': 'forward-curve-multi-date-charts.png'
        },
        {
            'name': 'Spot + Forward Charts',
            'description': 'Combine daily spot prices with forward curve on a single chart showing historical and future prices',
            'url': url_for('quick_charts.spot_forward_charts_page'),
            'icon': 'chart-line',
            'category': 'auto',
            'image': 'spot-forward-charts.png'
        },
        {
            'name': 'Forward Curves - Multi Location',
            'description': 'Compare forward curves for multiple locations on a single trade date with publication-ready styling',
            'url': url_for('quick_charts.forward_charts_multi_page'),
            'icon': 'chart-line',
            'category': 'auto',
            'image': 'forward-charts-multi.png'
        },
        {
            'name': 'Candlestick Chart',
            'description': 'Publication-ready candlestick chart of Nymex prompt-month futures overlaid with Henry Hub (and optional Chicago Citygate) daily spot range',
            'url': url_for('quick_charts.candlestick_chart_page'),
            'icon': 'chart-bar',
            'category': 'auto',
            'image': 'candlestick-chart.png'
        },
        {
            'name': 'NGI Line Chart',
            'description': "Paste tabular data or upload a CSV (like from NGI's Daily Historical Data page)",
            'url': url_for('quick_charts.custom_data_chart_page'),
            'icon': 'chart-line',
            'category': 'custom',
            'image': 'custom-data-chart.png'
        },
        {
            'name': 'Entropic Line Chart',
            'description': 'Paste tabular data or upload a CSV',
            'url': url_for('quick_charts.entropic_line_chart_page'),
            'icon': 'chart-line',
            'category': 'custom',
            'image': 'entropic-line-chart.png'
        },
        {
            'name': 'Entropic Bar/Line Chart',
            'description': 'Stacked bars plus a line on a second axis, from pasted data or a CSV',
            'url': url_for('quick_charts.entropic_bar_line_chart_page'),
            'icon': 'chart-bar',
            'category': 'custom',
            'image': 'entropic-bar-line-chart.png'
        }
    ]


@app.context_processor
def inject_nav_groups():
    """Expose the grouped tool registry to all templates (navbar + dashboard)."""
    if not session.get('user_email'):
        return {'nav_groups': []}
    tools = get_tools()
    groups = []
    for group in TOOL_GROUPS:
        sections = [{
            'key': s['key'],
            'heading': s['heading'],
            'tools': [t for t in tools if t['category'] == s['key']],
        } for s in group['sections']]
        groups.append({'key': group['key'], 'label': group['label'], 'sections': sections})
    return {'nav_groups': groups}


@app.route('/dashboard')
@require_api_creds
def dashboard():
    """Main dashboard hub with links to all tools."""
    return render_template('dashboard.html')


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
    # SECURITY: Default to debug=False. Only enable with explicit FLASK_DEBUG=1
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
