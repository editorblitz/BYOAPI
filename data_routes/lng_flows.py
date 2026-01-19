"""
LNG Flows data routes.
Provides API endpoints and page for LNG flow data visualization.
"""

from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

lng_flows_bp = Blueprint('lng_flows', __name__)

# Terminal mapping - maps display names to API location codes
TERMINAL_MAPPING = {
    'Corpus Christi': ['corpus_christi'],
    'Freeport': ['freeport_costal_bend', 'freeport_stratton_ridge', 'freeport_tetco_big_pipeline'],
    'Golden Pass': ['terminal_sendout'],
    'Calcasieu Pass': ['venture_global_calcasieu_pass'],
    'Cameron': ['cameron_cgt', 'cameron_cip'],
    'Plaquemines': ['gxp_lp_del'],
    'Sabine Pass': ['sabine_pass_creole', 'sabine_pass_km_la', 'sabine_pass_ngpl', 'sabine_pass_transco'],
    'Elba Island': ['elba_island_elba_express'],
    'Cove Point': ['cove_point'],
    'Altamira FLNG': ['altamira_flng_del']
}

# Mexican terminals (to exclude for "US Terminals Only")
MEXICAN_TERMINALS = ['altamira_flng_del']


@lng_flows_bp.route('/lng-flows')
@require_api_creds
def lng_flows_page():
    """Render the LNG flows chart page."""
    return render_template('lng_flows.html')


@lng_flows_bp.route('/api/lng-flows')
@require_api_creds
def api_lng_flows():
    """
    API endpoint for LNG flows data.
    Query params:
        - issue_date: Single issue date (YYYY-MM-DD) - for fetching one day at a time

    Returns the raw location data for the date so it can be filtered client-side.
    """
    try:
        issue_date = request.args.get('issue_date')

        if not issue_date:
            return jsonify({
                'success': False,
                'error': 'issue_date parameter is required'
            }), 400

        # Fetch data for this single date - returns all terminal/location data
        try:
            data = ngi_request('lngFlowDatafeed.json', params={'issue_date': issue_date})
        except Exception as ngi_error:
            # Log the actual NGI API error for debugging
            return jsonify({
                'success': False,
                'error': f'NGI API error: {str(ngi_error)}'
            }), 500

        # Return the raw location data for client-side processing
        # Extract the 'data' key if it exists, otherwise return as-is
        location_data = data.get('data', data) if isinstance(data, dict) else {}

        return jsonify({
            'success': True,
            'date': issue_date,
            'locations': location_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500
