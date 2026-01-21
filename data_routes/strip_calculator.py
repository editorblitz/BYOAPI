"""
Strip Calculator data routes.
Calculates seasonal strip prices from forward curve data.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, require_api_creds_json, ngi_request

strip_calculator_bp = Blueprint('strip_calculator', __name__)


@strip_calculator_bp.route('/strip-calculator')
@require_api_creds
def strip_calculator_page():
    """Render the strip calculator page."""
    return render_template('strip_calculator.html')


@strip_calculator_bp.route('/api/forward-location')
@require_api_creds_json
def api_forward_location():
    """
    API endpoint to get forward curve data for a specific location on a specific date.
    Used by the strip calculator to fetch data for each business day.

    Query params:
        issue_date: YYYY-MM-DD format
        location: Location name (e.g., "Henry Hub")

    Returns:
        {
            success: true,
            trade_date: "2024-01-15",
            location: "Henry Hub",
            contracts: ["2024-02-01", "2024-03-01", ...],
            fixed_prices: [2.50, 2.55, ...],
            basis_prices: [-0.10, -0.12, ...]
        }
    """
    issue_date = request.args.get('issue_date')
    location_name = request.args.get('location')

    if not issue_date:
        return jsonify({'success': False, 'error': 'issue_date is required'}), 400

    if not location_name:
        return jsonify({'success': False, 'error': 'location is required'}), 400

    try:
        # Fetch forward curve data for all locations on this date
        params = {'issue_date': issue_date}
        data = ngi_request('forwardDatafeed.json', params=params)

        if not data or 'data' not in data:
            return jsonify({'success': False, 'error': 'No data available for this date'}), 404

        # Find the requested location
        location_data = None
        for key, loc_data in data.get('data', {}).items():
            if loc_data.get('Location') == location_name:
                location_data = loc_data
                break

        if not location_data:
            return jsonify({'success': False, 'error': f'Location "{location_name}" not found'}), 404

        return jsonify({
            'success': True,
            'trade_date': data.get('meta', {}).get('trade_date', ''),
            'issue_date': issue_date,
            'location': location_name,
            'contracts': location_data.get('Contracts', []),
            'fixed_prices': location_data.get('Fixed Prices', []),
            'basis_prices': location_data.get('Basis Prices', [])
        })

    except Exception as e:
        error_msg = str(e)
        if '404' in error_msg or 'not found' in error_msg.lower():
            return jsonify({'success': False, 'error': 'No data available for this date (weekend/holiday)'}), 404
        return jsonify({'success': False, 'error': error_msg}), 500
