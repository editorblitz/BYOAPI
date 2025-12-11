"""
NGI Daily Prices Pro - Flask Backend
Converted from React app with vanilla JS frontend
"""

from flask import Flask, render_template, request, jsonify, session
from datetime import datetime, timedelta
import math
import os
import requests

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'ngi-daily-prices-secret-key-change-in-production')

# NGI API Configuration
NGI_API_BASE = os.environ.get('NGI_API_BASE', 'https://api.ngidata.com')
NGI_DAILY_PRICES_ENDPOINT = f'{NGI_API_BASE}/dailyprices'

# ============================================================================
# NGI API HELPER
# ============================================================================

def fetch_ngi_data(start_date: str, end_date: str, location: str):
    """
    Fetch real data from NGI API.
    Uses credentials stored in session.
    """
    if not session.get('authenticated'):
        raise Exception('Not authenticated')

    email = session.get('email')
    api_key = session.get('api_key')

    if not email or not api_key:
        raise Exception('Missing credentials')

    # Make request to NGI API
    try:
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'location': location,
            'email': email,
            'api_key': api_key
        }

        response = requests.get(NGI_DAILY_PRICES_ENDPOINT, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()

        # Normalize the response format
        # Expecting: { "success": true, "data": [ { price records } ] }
        if isinstance(data, dict) and 'data' in data:
            return data['data']
        elif isinstance(data, list):
            return data
        else:
            raise Exception('Unexpected API response format')

    except requests.exceptions.RequestException as e:
        raise Exception(f'NGI API request failed: {str(e)}')


# ============================================================================
# MOCK DATA GENERATION (Fallback for testing)
# ============================================================================

def get_dates_in_range(start_date: str, end_date: str) -> list:
    """Generate all dates between start and end (inclusive)."""
    dates = []
    try:
        current = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        while current <= end:
            dates.append(current.strftime('%Y-%m-%d'))
            current += timedelta(days=1)
    except ValueError:
        pass
    return dates


def generate_mock_data(start_date: str, end_date: str, location: str) -> list:
    """
    Generate realistic mock price data for a location.
    Uses deterministic seeding based on location for consistency.
    """
    dates = get_dates_in_range(start_date, end_date)

    # Create deterministic seed from location string
    seed = sum(ord(c) for c in location)
    base_price = 2.0 + (seed % 50) / 10  # Price between $2.00 and $7.00

    records = []
    for date_str in dates:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        time_val = dt.timestamp()

        # Add seasonality (sine wave) and volatility
        seasonality = math.sin(time_val / (60 * 60 * 24 * 30)) * 0.5
        volatility = math.sin(time_val * seed / 1000000) * 0.2
        avg = max(0.5, base_price + seasonality + volatility)

        records.append({
            'pointcode': f'MOCK-{location}',
            'issue_date': date_str,
            'trade_date': date_str,
            'region_name': 'Demo Region',
            'location_name': location,
            'low': round(avg - 0.05, 4),
            'high': round(avg + 0.05, 4),
            'average': round(avg, 4),
            'volume': int(abs(math.sin(time_val)) * 50000) + 10000,
            'deals': int(abs(math.cos(time_val)) * 100) + 10
        })

    return records


# ============================================================================
# DATA PROCESSING - Match React logic exactly
# ============================================================================

def process_standard_data(data: list) -> dict:
    """Process data for Standard View (Single Location, Chronological)."""
    dates = [r['trade_date'] for r in data]

    series = [
        {
            'name': 'Average',
            'type': 'line',
            'data': [r['average'] for r in data],
            'itemStyle': {'color': '#2563eb'},
            'lineStyle': {'width': 3},
            'symbol': 'none',
            'showSymbol': False
        },
        {
            'name': 'High',
            'type': 'line',
            'data': [r['high'] for r in data],
            'itemStyle': {'color': '#22c55e'},
            'lineStyle': {'width': 1, 'type': 'dashed'},
            'symbol': 'none',
            'showSymbol': False
        },
        {
            'name': 'Low',
            'type': 'line',
            'data': [r['low'] for r in data],
            'itemStyle': {'color': '#f59e0b'},
            'lineStyle': {'width': 1, 'type': 'dashed'},
            'symbol': 'none',
            'showSymbol': False
        }
    ]

    table_columns = ['Date', 'Average', 'High', 'Low', 'Volume', 'Deals']
    table_rows = [
        {
            'date': r['trade_date'],
            'avg': r['average'],
            'high': r['high'],
            'low': r['low'],
            'vol': r['volume'],
            'deals': r['deals']
        }
        for r in data
    ]

    return {
        'dates': dates,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows
    }


def process_seasonality_data(curr_data: list, prev_data: list, curr_year: int,
                              historical_data: list = None) -> dict:
    """
    Process data for Seasonality View (Year vs Year).
    Normalizes dates to MM-DD for overlay comparison.
    """
    prev_year = curr_year - 1
    curr_year_str = str(curr_year)
    prev_year_str = str(prev_year)

    # Helper to get MM-DD from YYYY-MM-DD
    def get_mmdd(date_str):
        return date_str[5:] if date_str and len(date_str) >= 10 else None

    # Build date map with all MM-DD keys
    date_map = {}

    for r in curr_data:
        key = get_mmdd(r['trade_date'])
        if key and key not in date_map:
            date_map[key] = {'dateKey': key}

    for r in prev_data:
        key = get_mmdd(r['trade_date'])
        if key and key not in date_map:
            date_map[key] = {'dateKey': key}

    # Calculate 5-year range if historical data provided
    range_calculator = {}
    has_range = historical_data and len(historical_data) > 0

    if has_range:
        for r in historical_data:
            if r.get('average') is None:
                continue
            key = get_mmdd(r['trade_date'])
            if key:
                if key not in range_calculator:
                    range_calculator[key] = []
                range_calculator[key].append(r['average'])

        # Ensure all historical keys are in date_map
        for key in range_calculator.keys():
            if key not in date_map:
                date_map[key] = {'dateKey': key}

    # Sort dates (MM-DD sorts correctly as strings)
    sorted_keys = sorted(date_map.keys())

    # Build data arrays
    dates = sorted_keys
    curr_values = []
    prev_values = []
    range_min = []
    range_max = []

    # Create lookup maps for faster access
    curr_lookup = {get_mmdd(r['trade_date']): r['average'] for r in curr_data if r.get('trade_date')}
    prev_lookup = {get_mmdd(r['trade_date']): r['average'] for r in prev_data if r.get('trade_date')}

    for key in sorted_keys:
        curr_val = curr_lookup.get(key)
        prev_val = prev_lookup.get(key)

        curr_values.append(curr_val)
        prev_values.append(prev_val)

        if has_range and key in range_calculator:
            prices = range_calculator[key]
            range_min.append(min(prices) if prices else None)
            range_max.append(max(prices) if prices else None)
        else:
            range_min.append(None)
            range_max.append(None)

    # Build series
    series = []

    # Add 5-year range band if available
    if has_range:
        # Max line (top of band)
        series.append({
            'name': '5-Year Max',
            'type': 'line',
            'data': range_max,
            'lineStyle': {'width': 0},
            'itemStyle': {'opacity': 0},
            'symbol': 'none',
            'areaStyle': {'color': '#e5e7eb', 'opacity': 0.5},
            'silent': True,
            'z': 0
        })
        # Min line (bottom of band - masks lower area)
        series.append({
            'name': '5-Year Min',
            'type': 'line',
            'data': range_min,
            'lineStyle': {'width': 0},
            'itemStyle': {'opacity': 0},
            'symbol': 'none',
            'areaStyle': {'color': '#ffffff', 'opacity': 1},
            'silent': True,
            'z': 1
        })

    # Current year line (bold blue)
    series.append({
        'name': curr_year_str,
        'type': 'line',
        'data': curr_values,
        'itemStyle': {'color': '#2563eb'},
        'lineStyle': {'width': 3, 'type': 'solid'},
        'symbol': 'none',
        'showSymbol': False,
        'z': 10
    })

    # Previous year line (dashed gray)
    series.append({
        'name': prev_year_str,
        'type': 'line',
        'data': prev_values,
        'itemStyle': {'color': '#9ca3af'},
        'lineStyle': {'width': 2, 'type': 'dashed'},
        'symbol': 'none',
        'showSymbol': False,
        'z': 10
    })

    # Build table
    table_columns = ['Date (MM-DD)', f'{curr_year_str} Price', f'{prev_year_str} Price', 'Diff ($)', 'Diff (%)']
    table_rows = []

    for i, key in enumerate(sorted_keys):
        curr_val = curr_values[i]
        prev_val = prev_values[i]

        diff = None
        pct = None
        if curr_val is not None and prev_val is not None and prev_val != 0:
            diff = round(curr_val - prev_val, 4)
            pct = round((diff / prev_val) * 100, 2)

        table_rows.append({
            'date': key,
            'curr': curr_val,
            'prev': prev_val,
            'diff': diff,
            'pct': pct
        })

    return {
        'dates': dates,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows
    }


def process_comparison_data(datasets: list) -> dict:
    """
    Process data for Compare View (Multi-Location).
    Merges multiple datasets by date.
    """
    date_map = {}
    labels = []

    colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']

    for ds in datasets:
        label = ds['label']
        labels.append(label)

        for r in ds['data']:
            date_str = r['trade_date']
            if date_str not in date_map:
                date_map[date_str] = {}
            date_map[date_str][label] = r['average']

    # Sort dates
    sorted_dates = sorted(date_map.keys())

    # Build series for each location
    series = []
    for idx, label in enumerate(labels):
        series.append({
            'name': label,
            'type': 'line',
            'data': [date_map[d].get(label) for d in sorted_dates],
            'itemStyle': {'color': colors[idx % len(colors)]},
            'lineStyle': {'width': 2},
            'symbol': 'none',
            'showSymbol': False,
            'connectNulls': True
        })

    # Build table
    table_columns = ['Date'] + labels
    table_rows = []

    for date_str in sorted_dates:
        row = {'date': date_str}
        for label in labels:
            row[label] = date_map[date_str].get(label)
        table_rows.append(row)

    return {
        'dates': sorted_dates,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows
    }


# ============================================================================
# ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login and store credentials in session."""
    try:
        data = request.get_json()
        email = data.get('email', '')
        api_key = data.get('apiKey', '')

        if not email or not api_key:
            return jsonify({'success': False, 'error': 'Email and API Key are required'}), 400

        # Store credentials in session for NGI API requests
        # In production, consider encrypting these with Fernet
        session['email'] = email
        session['api_key'] = api_key
        session['authenticated'] = True

        return jsonify({'success': True, 'message': f'Welcome, {email}'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    """Handle user logout."""
    session.clear()
    return jsonify({'success': True})


@app.route('/api/analyze', methods=['GET'])
def analyze():
    """
    Main analysis endpoint.
    Generates mock data and processes it based on the mode.

    Query Parameters:
    - mode: 'standard' | 'seasonality' | 'compare'
    - startDate: YYYY-MM-DD (for standard/compare)
    - endDate: YYYY-MM-DD (for standard/compare)
    - location: location code (for standard/seasonality)
    - locations[]: multiple location codes (for compare)
    - year: analysis year (for seasonality)
    - showRange: 'true'/'false' (for seasonality 5-year range)
    """
    # Check authentication
    if not session.get('authenticated'):
        return jsonify({'error': 'Not authenticated'}), 401

    mode = request.args.get('mode', 'standard')

    try:
        if mode == 'standard':
            start_date = request.args.get('startDate')
            end_date = request.args.get('endDate')
            location = request.args.get('location', 'SLAHH')

            if not start_date or not end_date:
                return jsonify({'error': 'startDate and endDate are required'}), 400

            # Use real NGI API
            try:
                data = fetch_ngi_data(start_date, end_date, location)
            except Exception as api_error:
                # Log the error and return it to user
                return jsonify({'error': f'Failed to fetch data from NGI API: {str(api_error)}'}), 500

            result = process_standard_data(data)
            return jsonify(result)

        elif mode == 'seasonality':
            year = int(request.args.get('year', datetime.now().year))
            location = request.args.get('location', 'SLAHH')
            show_range = request.args.get('showRange', 'false').lower() == 'true'

            try:
                # Fetch current year data
                curr_start = f'{year}-01-01'
                curr_end = f'{year}-12-31'
                curr_data = fetch_ngi_data(curr_start, curr_end, location)

                # Fetch previous year data
                prev_year = year - 1
                prev_start = f'{prev_year}-01-01'
                prev_end = f'{prev_year}-12-31'
                prev_data = fetch_ngi_data(prev_start, prev_end, location)

                # Fetch 5-year historical data if requested
                historical_data = []
                if show_range:
                    hist_start = f'{year - 5}-01-01'
                    hist_end = f'{year - 1}-12-31'
                    historical_data = fetch_ngi_data(hist_start, hist_end, location)

            except Exception as api_error:
                return jsonify({'error': f'Failed to fetch data from NGI API: {str(api_error)}'}), 500

            result = process_seasonality_data(curr_data, prev_data, year, historical_data)
            return jsonify(result)

        elif mode == 'compare':
            start_date = request.args.get('startDate')
            end_date = request.args.get('endDate')
            locations = request.args.getlist('locations[]')
            location_names = request.args.getlist('locationNames[]')

            if not start_date or not end_date:
                return jsonify({'error': 'startDate and endDate are required'}), 400

            if not locations:
                return jsonify({'error': 'At least one location is required'}), 400

            try:
                # Fetch data for each location
                datasets = []
                for i, loc in enumerate(locations):
                    data = fetch_ngi_data(start_date, end_date, loc)
                    # Use location name as label if provided, otherwise fall back to code
                    label = location_names[i] if i < len(location_names) else loc
                    datasets.append({'label': label, 'data': data})

            except Exception as api_error:
                return jsonify({'error': f'Failed to fetch data from NGI API: {str(api_error)}'}), 500

            result = process_comparison_data(datasets)
            return jsonify(result)

        else:
            return jsonify({'error': f'Unknown mode: {mode}'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
