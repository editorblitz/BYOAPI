"""
Quick Charts data routes.
Generates publication-ready charts with exact NGI web specifications.
Charts are 750x400px and export as WebP format at 828x447px.
"""

from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

quick_charts_bp = Blueprint('quick_charts', __name__)


@quick_charts_bp.route('/quick-charts')
@require_api_creds
def quick_charts_page():
    """Render the Quick Charts page."""
    return render_template('quick_charts.html')


@quick_charts_bp.route('/api/quick-charts')
@require_api_creds
def api_quick_charts():
    """
    API endpoint for Quick Charts.
    Supports two chart types:
    - 'midday': Single location midday alert chart (1 year lookback)
    - 'daily': Multiple locations daily prices chart (1 year lookback)

    Query params:
        - type: Chart type ('midday' or 'daily', default: 'midday')
        - location: Location pointcode (required for type='midday')
        - locations: Comma-separated location pointcodes (required for type='daily')
    """
    try:
        chart_type = request.args.get('type', 'midday')

        # Calculate 1 year lookback
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=364)

        if chart_type == 'midday':
            # Midday Alert - single location
            location = request.args.get('location')

            if not location:
                return jsonify({'error': 'location parameter is required for midday chart'}), 400

            # Fetch midday price data from NGI API
            params = {
                'location': location,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }

            raw = ngi_request('middayHistoricalData.json', params=params)

            # Process the columnar data
            records = process_midday_data(raw)

            # Return formatted data
            payload = {
                'dates': [row['trade_date'] for row in records],
                'averages': [row['average'] for row in records],
                'location_name': records[0]['location_name'] if records else 'Unknown Location'
            }

            return jsonify(payload)

        elif chart_type == 'daily':
            # Daily Prices - multiple locations
            locations_str = request.args.get('locations')

            if not locations_str:
                return jsonify({'error': 'locations parameter is required for daily chart'}), 400

            locations = [loc.strip() for loc in locations_str.split(',')]

            # Fetch data for each location
            series_data = []
            for location in locations:
                params = {
                    'location': location,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }

                raw = ngi_request('dailyHistoricalData.json', params=params)

                # Process the columnar data
                records = process_daily_data(raw)

                if records:
                    series_data.append({
                        'location_name': records[0]['location_name'],
                        'dates': [row['trade_date'] for row in records],
                        'averages': [row['average'] for row in records]
                    })

            # Return formatted data
            payload = {
                'series': series_data
            }

            return jsonify(payload)

        else:
            return jsonify({'error': f'Invalid chart type: {chart_type}'}), 400

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


def process_midday_data(raw_data):
    """
    Process NGI midday columnar data into an array of record objects.

    Args:
        raw_data: NGI API response in columnar format

    Returns:
        Array of records sorted by trade_date
    """
    if not raw_data or not isinstance(raw_data, dict):
        return []

    if 'averages' not in raw_data or 'trade_dates' not in raw_data:
        return []

    data_length = len(raw_data.get('averages', {}))
    records = []

    for i in range(data_length):
        idx = str(i)

        # Parse average price
        avg = raw_data.get('averages', {}).get(idx)
        try:
            avg = float(avg) if avg is not None else None
        except (ValueError, TypeError):
            avg = None

        record = {
            'trade_date': raw_data.get('trade_dates', {}).get(idx, ''),
            'location_name': raw_data.get('location_names', {}).get(idx, 'Unknown'),
            'pointcode': raw_data.get('pointcodes', {}).get(idx, ''),
            'average': avg
        }

        records.append(record)

    # Sort by trade_date
    records.sort(key=lambda x: x.get('trade_date', ''))

    return records


def process_daily_data(raw_data):
    """
    Process NGI daily prices columnar data into an array of record objects.

    Args:
        raw_data: NGI API response in columnar format

    Returns:
        Array of records sorted by trade_date
    """
    if not raw_data or not isinstance(raw_data, dict):
        return []

    if 'averages' not in raw_data or 'trade_dates' not in raw_data:
        return []

    data_length = len(raw_data.get('averages', {}))
    records = []

    for i in range(data_length):
        idx = str(i)

        # Parse average price
        avg = raw_data.get('averages', {}).get(idx)
        try:
            avg = float(avg) if avg is not None else None
        except (ValueError, TypeError):
            avg = None

        record = {
            'trade_date': raw_data.get('trade_dates', {}).get(idx, ''),
            'location_name': raw_data.get('location_names', {}).get(idx, 'Unknown'),
            'pointcode': raw_data.get('pointcodes', {}).get(idx, ''),
            'average': avg
        }

        records.append(record)

    # Sort by trade_date
    records.sort(key=lambda x: x.get('trade_date', ''))

    return records
