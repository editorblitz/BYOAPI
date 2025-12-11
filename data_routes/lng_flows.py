"""
LNG Flows data routes.
Provides API endpoints and page for LNG flow data visualization.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

lng_flows_bp = Blueprint('lng_flows', __name__)


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
        - start_date: Start date (YYYY-MM-DD)
        - end_date: End date (YYYY-MM-DD)
        - terminal: Terminal filter (optional)
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        terminal = request.args.get('terminal')

        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        if terminal:
            params['terminal'] = terminal

        # Call NGI API - adjust endpoint path based on actual API spec
        data = ngi_request('lngFlowsDatafeed.json', params=params)

        # Normalize data for chart consumption
        chart_data = normalize_lng_flows_data(data)

        return jsonify({
            'success': True,
            'data': chart_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def normalize_lng_flows_data(raw_data):
    """
    Normalize NGI LNG flows data into a chart-friendly format.

    Returns:
        {
            'dates': ['2024-01-01', '2024-01-02', ...],
            'series': [
                {'name': 'Terminal A', 'data': [100, 105, ...]},
                {'name': 'Terminal B', 'data': [200, 195, ...]}
            ]
        }
    """
    if not raw_data:
        return {'dates': [], 'series': []}

    # Handle the raw data structure from NGI API
    # Adjust this based on actual API response format
    if isinstance(raw_data, list):
        # Group by terminal/location
        terminals = {}
        dates = set()

        for record in raw_data:
            date = record.get('date') or record.get('issue_date')
            terminal = record.get('terminal') or record.get('location') or 'Unknown'
            value = record.get('flow') or record.get('value') or record.get('volume') or 0

            dates.add(date)
            if terminal not in terminals:
                terminals[terminal] = {}
            terminals[terminal][date] = value

        sorted_dates = sorted(list(dates))

        series = []
        for terminal, values in terminals.items():
            series.append({
                'name': terminal,
                'data': [values.get(d, 0) for d in sorted_dates]
            })

        return {
            'dates': sorted_dates,
            'series': series
        }

    return {'dates': [], 'series': []}
