"""
Netbacks data routes.
Provides API endpoints and page for netback calculations visualization.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

netbacks_bp = Blueprint('netbacks', __name__)


@netbacks_bp.route('/netbacks')
@require_api_creds
def netbacks_page():
    """Render the netbacks chart page."""
    return render_template('netbacks.html')


@netbacks_bp.route('/api/netbacks')
@require_api_creds
def api_netbacks():
    """
    API endpoint for netbacks data.
    Query params:
        - start_date: Start date (YYYY-MM-DD)
        - end_date: End date (YYYY-MM-DD)
        - origin: Origin point/hub
        - destination: Destination market
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        origin = request.args.get('origin')
        destination = request.args.get('destination')

        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        if origin:
            params['origin'] = origin
        if destination:
            params['destination'] = destination

        # Call NGI API - adjust endpoint path based on actual API spec
        data = ngi_request('netbacksDatafeed.json', params=params)

        # Normalize data for chart consumption
        chart_data = normalize_netbacks_data(data)

        return jsonify({
            'success': True,
            'data': chart_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def normalize_netbacks_data(raw_data):
    """
    Normalize NGI netbacks data into a chart-friendly format.

    Returns:
        {
            'dates': ['2024-01-01', '2024-01-02', ...],
            'series': [
                {'name': 'US-Europe Netback', 'data': [5.50, 5.45, ...]},
                {'name': 'US-Asia Netback', 'data': [7.00, 6.95, ...]}
            ]
        }
    """
    if not raw_data:
        return {'dates': [], 'series': []}

    if isinstance(raw_data, list):
        # Group by route/destination
        routes = {}
        dates = set()

        for record in raw_data:
            date = record.get('date') or record.get('issue_date') or record.get('trade_date')
            route = record.get('route') or record.get('destination') or f"{record.get('origin', 'US')}-{record.get('dest', 'Market')}"
            value = record.get('netback') or record.get('value') or record.get('price') or 0

            dates.add(date)
            if route not in routes:
                routes[route] = {}
            routes[route][date] = value

        sorted_dates = sorted(list(dates))

        series = []
        for route, values in routes.items():
            series.append({
                'name': route,
                'data': [values.get(d, None) for d in sorted_dates]
            })

        return {
            'dates': sorted_dates,
            'series': series
        }

    return {'dates': [], 'series': []}
