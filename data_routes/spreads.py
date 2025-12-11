"""
Spreads data routes.
Provides API endpoints and page for price spread data visualization.

DEPRECATED: This standalone spreads module is deprecated.
Spreads functionality has been integrated into the Daily Prices module
as a fourth mode. This file is kept for backwards compatibility but
will be removed in a future release.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

spreads_bp = Blueprint('spreads', __name__)


@spreads_bp.route('/spreads')
@require_api_creds
def spreads_page():
    """Render the spreads chart page."""
    return render_template('spreads.html')


@spreads_bp.route('/api/spreads')
@require_api_creds
def api_spreads():
    """
    API endpoint for spreads data.
    Query params:
        - start_date: Start date (YYYY-MM-DD)
        - end_date: End date (YYYY-MM-DD)
        - location1: First location pointcode (e.g., SLAHH)
        - location2: Second location pointcode (e.g., CALSCG)
    """
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        location1 = request.args.get('location1')
        location2 = request.args.get('location2')

        if not location1 or not location2:
            return jsonify({
                'success': False,
                'error': 'Both location1 and location2 are required'
            }), 400

        # Fetch data for location 1
        params1 = {'location': location1}
        if start_date:
            params1['start_date'] = start_date
        if end_date:
            params1['end_date'] = end_date

        data1 = ngi_request('dailyHistoricalData.json', params=params1)

        # Fetch data for location 2
        params2 = {'location': location2}
        if start_date:
            params2['start_date'] = start_date
        if end_date:
            params2['end_date'] = end_date

        data2 = ngi_request('dailyHistoricalData.json', params=params2)

        # Calculate spread
        chart_data = calculate_spread(data1, data2, location1, location2)

        return jsonify({
            'success': True,
            'data': chart_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def calculate_spread(data1, data2, location1_code, location2_code):
    """
    Calculate the spread (difference) between two location price datasets.

    Spread = Location1 Average - Location2 Average

    Args:
        data1: NGI columnar data for location 1
        data2: NGI columnar data for location 2
        location1_code: Pointcode for location 1
        location2_code: Pointcode for location 2

    Returns:
        {
            'dates': ['2024-01-01', '2024-01-02', ...],
            'series': [
                {'name': 'Spread', 'data': [0.50, 0.45, ...]}
            ]
        }
    """
    if not data1 or not data2:
        return {'dates': [], 'series': []}

    # Process location 1 data
    prices1 = {}
    if 'averages' in data1 and 'trade_dates' in data1:
        data_length = len(data1.get('averages', {}))
        for i in range(data_length):
            idx = str(i)
            trade_date = data1.get('trade_dates', {}).get(idx)
            avg = data1.get('averages', {}).get(idx)
            if trade_date and avg is not None:
                try:
                    prices1[trade_date] = float(avg)
                except (ValueError, TypeError):
                    pass

    # Process location 2 data
    prices2 = {}
    if 'averages' in data2 and 'trade_dates' in data2:
        data_length = len(data2.get('averages', {}))
        for i in range(data_length):
            idx = str(i)
            trade_date = data2.get('trade_dates', {}).get(idx)
            avg = data2.get('averages', {}).get(idx)
            if trade_date and avg is not None:
                try:
                    prices2[trade_date] = float(avg)
                except (ValueError, TypeError):
                    pass

    # Find common dates and calculate spread
    common_dates = sorted(set(prices1.keys()) & set(prices2.keys()))
    spreads = []

    for date in common_dates:
        spread = prices1[date] - prices2[date]
        spreads.append(spread)

    return {
        'dates': common_dates,
        'series': [
            {
                'name': f'{location1_code} - {location2_code}',
                'data': spreads
            }
        ]
    }
