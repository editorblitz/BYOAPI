"""
Strips data routes.
Provides API endpoints and page for forward strip pricing visualization.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

strips_bp = Blueprint('strips', __name__)


@strips_bp.route('/strips')
@require_api_creds
def strips_page():
    """Render the strips chart page."""
    return render_template('strips.html')


@strips_bp.route('/api/strips')
@require_api_creds
def api_strips():
    """
    API endpoint for strips data.
    Query params:
        - issue_date: Issue date (YYYY-MM-DD)
        - location: Location/hub filter
        - months_forward: Number of months forward to include
    """
    try:
        issue_date = request.args.get('issue_date')
        location = request.args.get('location')
        months_forward = request.args.get('months_forward')

        params = {}
        if issue_date:
            params['issue_date'] = issue_date
        if location:
            params['location'] = location
        if months_forward:
            params['months_forward'] = months_forward

        # Call NGI API - adjust endpoint path based on actual API spec
        data = ngi_request('forwardDatafeed.json', params=params)

        # Normalize data for chart consumption
        chart_data = normalize_strips_data(data)

        return jsonify({
            'success': True,
            'data': chart_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def normalize_strips_data(raw_data):
    """
    Normalize NGI strips data into a chart-friendly format.

    Returns:
        {
            'months': ['Jan 2024', 'Feb 2024', ...],
            'series': [
                {'name': 'Henry Hub', 'data': [2.50, 2.55, ...]},
                {'name': 'SoCal', 'data': [3.00, 2.95, ...]}
            ]
        }
    """
    if not raw_data:
        return {'months': [], 'series': []}

    if isinstance(raw_data, list):
        # Group by location
        locations = {}
        months = set()

        for record in raw_data:
            month = record.get('contract_month') or record.get('month') or record.get('period')
            location = record.get('location') or record.get('hub') or record.get('point_name') or 'Unknown'
            price = record.get('price') or record.get('settle') or record.get('value') or 0

            months.add(month)
            if location not in locations:
                locations[location] = {}
            locations[location][month] = price

        sorted_months = sorted(list(months))

        series = []
        for location, values in locations.items():
            series.append({
                'name': location,
                'data': [values.get(m, None) for m in sorted_months]
            })

        return {
            'months': sorted_months,
            'series': series
        }

    return {'months': [], 'series': []}
