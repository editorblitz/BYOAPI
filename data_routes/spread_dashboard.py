"""
Spread Dashboard routes.
Displays a grid of spread charts with quick timeframe controls.
"""

from flask import Blueprint, render_template
from auth import require_api_creds

spread_dashboard_bp = Blueprint('spread_dashboard', __name__)


@spread_dashboard_bp.route('/spread-dashboard')
@require_api_creds
def spread_dashboard_page():
    """Render the Spread Dashboard page."""
    return render_template('spread_dashboard.html')
