"""
Quick Charts data routes.
Generates publication-ready charts with exact NGI web specifications.
Charts are 750x400px and export as WebP format at 828x447px.
"""

from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, require_api_creds_json, ngi_request

quick_charts_bp = Blueprint('quick_charts', __name__)


@quick_charts_bp.route('/quick-charts')
@require_api_creds
def quick_charts_page():
    """Render the Quick Charts page (deprecated - redirects to Midday Charts)."""
    return render_template('quick_charts.html')


@quick_charts_bp.route('/midday-charts')
@require_api_creds
def midday_charts_page():
    """Render the Midday Charts page."""
    return render_template('midday_charts.html')


@quick_charts_bp.route('/daily-price-charts')
@require_api_creds
def daily_price_charts_page():
    """Render the Daily Spot Charts - Multi page."""
    return render_template('daily_price_charts.html')


@quick_charts_bp.route('/midday-charts-multi')
@require_api_creds
def midday_charts_multi_page():
    """Render the Midday Charts - Multi page."""
    return render_template('midday_charts_multi.html')


@quick_charts_bp.route('/daily-spot-charts')
@require_api_creds
def daily_spot_charts_page():
    """Render the Daily Spot Charts (single location) page."""
    return render_template('daily_spot_charts.html')


@quick_charts_bp.route('/daily-highlow-charts')
@require_api_creds
def daily_highlow_charts_page():
    """Render the Daily High/Low Charts page."""
    return render_template('daily_highlow_charts.html')


@quick_charts_bp.route('/api/quick-charts')
@require_api_creds_json
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
        - start_date: Optional start date (YYYY-MM-DD), defaults to 364 days ago
        - end_date: Optional end date (YYYY-MM-DD), defaults to today
    """
    try:
        chart_type = request.args.get('type', 'midday')

        # Use provided dates or default to 1 year lookback
        end_date_str = request.args.get('end_date')
        start_date_str = request.args.get('start_date')

        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = datetime.utcnow().date()

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
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

        elif chart_type == 'midday-multi':
            # Midday Alert - multiple locations (like daily but with midday data)
            locations_str = request.args.get('locations')

            if not locations_str:
                return jsonify({'error': 'locations parameter is required for midday-multi chart'}), 400

            locations = [loc.strip() for loc in locations_str.split(',')]

            # Fetch data for each location
            series_data = []
            for location in locations:
                params = {
                    'location': location,
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }

                raw = ngi_request('middayHistoricalData.json', params=params)

                # Process the columnar data
                records = process_midday_data(raw)

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

        elif chart_type == 'daily-highlow':
            # Daily High/Low - single location with high, low, average
            location = request.args.get('location')

            if not location:
                return jsonify({'error': 'location parameter is required for daily-highlow chart'}), 400

            params = {
                'location': location,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }

            raw = ngi_request('dailyHistoricalData.json', params=params)

            # Process the columnar data with highs and lows
            records = process_daily_data_with_highlow(raw)

            if not records:
                return jsonify({'error': 'No data found for the specified location and date range'}), 404

            # Return formatted data
            payload = {
                'dates': [row['trade_date'] for row in records],
                'highs': [row['high'] for row in records],
                'lows': [row['low'] for row in records],
                'averages': [row['average'] for row in records],
                'location_name': records[0]['location_name'] if records else 'Unknown Location'
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


def process_daily_data_with_highlow(raw_data):
    """
    Process NGI daily prices columnar data into records with high, low, and average.

    Args:
        raw_data: NGI API response in columnar format

    Returns:
        Array of records sorted by trade_date with high, low, average
    """
    if not raw_data or not isinstance(raw_data, dict):
        return []

    if 'averages' not in raw_data or 'trade_dates' not in raw_data:
        return []

    data_length = len(raw_data.get('averages', {}))
    records = []

    for i in range(data_length):
        idx = str(i)

        # Parse numeric values
        avg = raw_data.get('averages', {}).get(idx)
        high = raw_data.get('highs', {}).get(idx)
        low = raw_data.get('lows', {}).get(idx)

        try:
            avg = float(avg) if avg is not None else None
        except (ValueError, TypeError):
            avg = None

        try:
            high = float(high) if high is not None else None
        except (ValueError, TypeError):
            high = None

        try:
            low = float(low) if low is not None else None
        except (ValueError, TypeError):
            low = None

        record = {
            'trade_date': raw_data.get('trade_dates', {}).get(idx, ''),
            'location_name': raw_data.get('location_names', {}).get(idx, 'Unknown'),
            'pointcode': raw_data.get('pointcodes', {}).get(idx, ''),
            'high': high,
            'low': low,
            'average': avg
        }

        records.append(record)

    # Sort by trade_date
    records.sort(key=lambda x: x.get('trade_date', ''))

    return records
