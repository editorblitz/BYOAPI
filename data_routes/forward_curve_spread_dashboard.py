"""
Forward Curve Spread Dashboard data routes.
Provides API endpoints and page for forward curve spread visualization.
Shows spreads across contract months (curve view) rather than over time.
"""

from datetime import datetime
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, require_api_creds_json, ngi_request

forward_curve_spread_dashboard_bp = Blueprint('forward_curve_spread_dashboard', __name__)


@forward_curve_spread_dashboard_bp.route('/forward-curve-spread-dashboard')
@require_api_creds
def forward_curve_spread_dashboard_page():
    """Render the forward curve spreads dashboard page."""
    return render_template('forward_curve_spread_dashboard.html')


@forward_curve_spread_dashboard_bp.route('/api/forward-curve-spread-data')
@require_api_creds_json
def api_forward_curve_spread_data():
    """
    Fetch forward curve spread data between two locations.
    Returns spreads across contract months for a specific issue date.

    Query params:
    - location1: First location code (e.g., 'SLAHH')
    - location2: Second location code (e.g., 'WTXWAHA')
    - issue_date: Optional issue date (YYYY-MM-DD). Defaults to latest.
    - months_forward: Number of months to include (default: 12)

    Returns:
    - Spread data across contract months
    """
    try:
        location1 = request.args.get('location1', 'NEAALGCG')
        location2 = request.args.get('location2', 'MCWCCITY')
        issue_date = request.args.get('issue_date')
        months_forward = int(request.args.get('months_forward', 12))

        # Fetch forward curves for both locations
        params = {}
        if issue_date:
            params['issue_date'] = issue_date

        curve_data = ngi_request('forwardDatafeed.json', params=params)

        # Extract data for both locations
        location1_data = curve_data.get('data', {}).get(location1, {})
        location2_data = curve_data.get('data', {}).get(location2, {})

        if not location1_data or not location2_data:
            return jsonify({'error': 'One or both locations not found in forward data'}), 404

        # Get metadata
        trade_date = curve_data.get('meta', {}).get('trade_date')
        actual_issue_date = curve_data.get('meta', {}).get('issue_date')

        # Get location names
        loc1_name = location1_data.get('Location', location1)
        loc2_name = location2_data.get('Location', location2)

        # Get contracts and prices
        contracts1 = location1_data.get('Contracts', [])
        prices1 = location1_data.get('Fixed Prices', [])
        contracts2 = location2_data.get('Contracts', [])
        prices2 = location2_data.get('Fixed Prices', [])

        # Find common contracts and limit by months_forward
        common_contracts = []
        spreads = []

        # Build price lookup for location2
        price2_lookup = dict(zip(contracts2, prices2))

        # Calculate spreads for common contracts
        for i, contract in enumerate(contracts1[:months_forward]):
            if contract in price2_lookup and i < len(prices1):
                price1 = prices1[i]
                price2 = price2_lookup[contract]

                if price1 is not None and price2 is not None:
                    common_contracts.append(contract)
                    spreads.append(price1 - price2)

        # Format contracts for display
        formatted_contracts = [format_contract_month(c) for c in common_contracts]

        return jsonify({
            'contracts': formatted_contracts,
            'raw_contracts': common_contracts,
            'spreads': spreads,
            'location1_name': loc1_name,
            'location2_name': loc2_name,
            'trade_date': trade_date,
            'issue_date': actual_issue_date
        })

    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500


def format_contract_month(contract_date):
    """Convert '2024-02-01' -> 'Feb 24'"""
    if not contract_date:
        return 'N/A'
    try:
        year, month, _ = contract_date.split('-')
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        # Use short year format for compactness
        return f"{month_names[int(month) - 1]} {year[2:]}"
    except (ValueError, IndexError):
        return contract_date
