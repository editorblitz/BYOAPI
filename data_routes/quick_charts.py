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


@quick_charts_bp.route('/daily-spot-charts-multi')
@require_api_creds
def daily_spot_charts_multi_page():
    """Render the Daily Spot Charts - Multi page."""
    return render_template('daily_spot_charts_multi.html')


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


@quick_charts_bp.route('/daily-spot-spread-chart')
@require_api_creds
def daily_spot_spread_chart_page():
    """Render the Daily Spot Spread Chart page (single-line spread between two locations)."""
    return render_template('daily_spot_spread_chart.html')


@quick_charts_bp.route('/daily-highlow-charts')
@require_api_creds
def daily_highlow_charts_page():
    """Render the Daily High/Low Charts page."""
    return render_template('daily_highlow_charts.html')


@quick_charts_bp.route('/forward-curve-charts')
@require_api_creds
def forward_curve_charts_page():
    """Render the Forward Curve Charts page."""
    return render_template('forward_curve_charts.html')


@quick_charts_bp.route('/spot-forward-charts')
@require_api_creds
def spot_forward_charts_page():
    """Render the Spot + Forward Charts page."""
    return render_template('spot_forward_charts.html')


@quick_charts_bp.route('/forward-charts-multi')
@require_api_creds
def forward_charts_multi_page():
    """Render the Forward Curves - Multi Location page."""
    return render_template('forward_charts_multi.html')


@quick_charts_bp.route('/candlestick-chart')
@require_api_creds
def candlestick_chart_page():
    """Render the Candlestick Chart Generator page."""
    return render_template('candlestick_chart.html')


@quick_charts_bp.route('/custom-data-chart')
@require_api_creds
def custom_data_chart_page():
    """Render the NGI Line Chart page (paste/upload your own data; no NGI API calls)."""
    return render_template('custom_data_chart.html', line_chart_config={
        'page_name': 'NGI Line Chart',
        'show_ngi_tip': True,
        'logo_url': '/static/images/ngi_logo.png',
        'logo_width': 70,
        'logo_height': 35,
        'chart_height': 400,    # display is 750px wide; height sets the aspect ratio
        'export_width': 1656,
        'export_height': 894,
        'storage_key': 'customDataChart.lastInput',
    })


@quick_charts_bp.route('/entropic-line-chart')
@require_api_creds
def entropic_line_chart_page():
    """Render the Entropic Line Chart page (same tool as the NGI Line Chart, Entropic branding)."""
    return render_template('custom_data_chart.html', line_chart_config={
        'page_name': 'Entropic Line Chart',
        'show_ngi_tip': False,
        'logo_url': '/static/images/entropiclogo.png',
        'logo_width': 100,  # entropiclogo.png is 2410x1036; 100x43 keeps its aspect ratio
        'logo_height': 43,
        'logo_right': 25,   # flush with the right end of the title divider line
        'logo_center': True,  # vertically center the logo between the top edge and the divider
        'chart_height': 427,  # 750x427 = 1.757, the Entropic house aspect ratio
        'export_width': 1500,
        'export_height': 854,
        'default_source': "NGI's Entropic Analytics",
        'storage_key': 'entropicLineChart.lastInput',
        'aspect_options': [
            {'label': 'Entropic — exports 1500×854', 'chart_height': 427, 'export_width': 1500, 'export_height': 854},
            {'label': 'Classic — exports 1656×894', 'chart_height': 400, 'export_width': 1656, 'export_height': 894},
        ],
    })


@quick_charts_bp.route('/entropic-bar-line-chart')
@require_api_creds
def entropic_bar_line_chart_page():
    """Render the Entropic Bar/Line Chart page (stacked bars + line on a second axis)."""
    return render_template('entropic_bar_line_chart.html', line_chart_config={
        'page_name': 'Entropic Bar/Line Chart',
        'show_ngi_tip': False,
        'logo_url': '/static/images/entropiclogo.png',
        'logo_width': 100,
        'logo_height': 43,
        'logo_right': 25,
        'logo_center': True,
        'chart_height': 427,
        'export_width': 1500,
        'export_height': 854,
        'default_source': "NGI's Entropic Analytics",
        'storage_key': 'entropicBarLineChart.lastInput',
        'aspect_options': [
            {'label': 'Entropic — exports 1500×854', 'chart_height': 427, 'export_width': 1500, 'export_height': 854},
            {'label': 'Classic — exports 1656×894', 'chart_height': 400, 'export_width': 1656, 'export_height': 894},
        ],
    })


@quick_charts_bp.route('/custom-data-chart/editor')
@require_api_creds
def custom_data_chart_editor_page():
    """Render the pop-out Data Editor grid for the Custom Data Chart."""
    return render_template('custom_data_chart_editor.html')


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

        elif chart_type == 'daily-spread':
            # Daily Spread - difference between two locations on common dates
            location1 = request.args.get('location1')
            location2 = request.args.get('location2')

            if not location1 or not location2:
                return jsonify({'error': 'location1 and location2 parameters are required for daily-spread chart'}), 400

            params1 = {
                'location': location1,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
            params2 = {
                'location': location2,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }

            raw1 = ngi_request('dailyHistoricalData.json', params=params1)
            raw2 = ngi_request('dailyHistoricalData.json', params=params2)

            records1 = process_daily_data(raw1)
            records2 = process_daily_data(raw2)

            prices1 = {r['trade_date']: r['average'] for r in records1 if r.get('average') is not None}
            prices2 = {r['trade_date']: r['average'] for r in records2 if r.get('average') is not None}

            common_dates = sorted(set(prices1.keys()) & set(prices2.keys()))
            spreads = [prices1[d] - prices2[d] for d in common_dates]

            location1_name = records1[0]['location_name'] if records1 else location1
            location2_name = records2[0]['location_name'] if records2 else location2

            payload = {
                'dates': common_dates,
                'averages': spreads,
                'location1_name': location1_name,
                'location2_name': location2_name
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
