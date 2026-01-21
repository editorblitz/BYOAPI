"""
Daily Prices data routes.
Provides API endpoints and page for daily price data visualization.
"""

from datetime import datetime, timedelta

from flask import Blueprint, render_template, request, jsonify

from auth import require_api_creds, ngi_request

daily_prices_bp = Blueprint('daily_prices', __name__)


@daily_prices_bp.route('/daily-prices')
@require_api_creds
def daily_prices_page():
    """Render the daily prices chart page."""
    return render_template('daily_prices.html')


@daily_prices_bp.route('/api/daily-prices')
@require_api_creds
def api_daily_prices():
    """Main API endpoint for the Daily Prices tool."""
    mode = request.args.get('mode', 'standard').lower()

    try:
        if mode == 'standard':
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            location = request.args.get('location', 'SLAHH')

            if not start_date or not end_date:
                raise ValueError('start_date and end_date are required for standard mode')

            records = fetch_daily_prices(location, start_date, end_date)
            payload = process_standard_view(records)

        elif mode == 'seasonality':
            location = request.args.get('location', 'SLAHH')
            year = request.args.get('year')
            show_range = request.args.get('showRange', 'false').lower() == 'true'

            if not year:
                year = datetime.utcnow().year
            else:
                year = int(year)

            current_records = fetch_daily_prices(location, f'{year}-01-01', f'{year}-12-31')
            previous_records = fetch_daily_prices(location, f'{year - 1}-01-01', f'{year - 1}-12-31')
            historical_records = {}

            if show_range:
                historical_records = fetch_multi_year_history(
                    location,
                    year,
                    previous_year_records=previous_records
                )

            payload = process_seasonality_view(
                current_records,
                previous_records,
                year,
                historical_records
            )

        elif mode == 'compare':
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            locations = request.args.getlist('locations[]') or request.args.getlist('locations')
            location_names = request.args.getlist('locationNames[]') or request.args.getlist('locationNames')

            if not start_date or not end_date:
                raise ValueError('start_date and end_date are required for compare mode')
            if not locations:
                raise ValueError('At least one location is required for compare mode')

            datasets = []
            for idx, pointcode in enumerate(locations):
                label = location_names[idx] if idx < len(location_names) and location_names[idx] else pointcode
                records = fetch_daily_prices(pointcode, start_date, end_date)
                datasets.append({'label': label, 'records': records})

            payload = process_comparison_view(datasets)

        elif mode == 'spreads':
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            location1 = request.args.get('location1')
            location2 = request.args.get('location2')

            if not start_date or not end_date:
                raise ValueError('start_date and end_date are required for spreads mode')
            if not location1 or not location2:
                raise ValueError('Both location1 and location2 are required for spreads mode')

            # Fetch data for both locations
            records1 = fetch_daily_prices(location1, start_date, end_date)
            records2 = fetch_daily_prices(location2, start_date, end_date)

            payload = process_spreads_view(records1, records2, location1, location2)

        else:
            return jsonify({'error': f'Unknown mode: {mode}'}), 400

        return jsonify(payload)

    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


def fetch_daily_prices(location: str, start_date: str, end_date: str):
    """Fetch and normalize NGI daily price data for a location."""
    params = {
        'location': location,
        'start_date': start_date,
        'end_date': end_date
    }

    raw = ngi_request('dailyHistoricalData.json', params=params)
    return process_columnar_data(raw)


def fetch_multi_year_history(location: str, analysis_year: int, previous_year_records=None):
    """Fetch per-year history (previous five seasons) for seasonality bands."""
    history = {}
    previous_year = analysis_year - 1

    if previous_year_records:
        history[previous_year] = list(previous_year_records)
    else:
        records = fetch_daily_prices(location, f'{previous_year}-01-01', f'{previous_year}-12-31')
        if records:
            history[previous_year] = records

    for year in range(previous_year - 1, analysis_year - 6, -1):
        if year < 1900:
            break
        records = fetch_daily_prices(location, f'{year}-01-01', f'{year}-12-31')
        if records:
            history[year] = records

    return history


def process_columnar_data(raw_data):
    """
    Process NGI columnar data into an array of record objects.

    NGI API returns data in columnar format:
    {
        'averages': {'0': 2.50, '1': 2.55, ...},
        'highs': {'0': 2.60, '1': 2.65, ...},
        'lows': {'0': 2.40, '1': 2.45, ...},
        'trade_dates': {'0': '2024-01-01', '1': '2024-01-02', ...},
        'issue_dates': {'0': '2024-01-02', '1': '2024-01-03', ...},
        'pointcodes': {'0': 'SLAHH', ...},
        'location_names': {'0': 'Henry Hub', ...},
        'region_names': {'0': 'South Louisiana', ...},
        'volumes': {'0': 1000, ...},
        'deals': {'0': 50, ...},
        'flow_start_dates': {'0': '2024-01-02', ...},
        'flow_end_dates': {'0': '2024-01-02', ...}
    }

    Returns:
        Array of record objects sorted by trade_date
    """
    if not raw_data or not isinstance(raw_data, dict):
        return []

    if 'averages' not in raw_data:
        return []

    data_length = len(raw_data.get('averages', {}))
    records = []

    for i in range(data_length):
        idx = str(i)

        # Parse numeric values
        avg = raw_data.get('averages', {}).get(idx)
        high = raw_data.get('highs', {}).get(idx)
        low = raw_data.get('lows', {}).get(idx)
        volume = raw_data.get('volumes', {}).get(idx)
        deals = raw_data.get('deals', {}).get(idx)

        # Convert to proper types
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

        try:
            volume = int(volume) if volume is not None else None
        except (ValueError, TypeError):
            volume = None

        try:
            deals = int(deals) if deals is not None else None
        except (ValueError, TypeError):
            deals = None

        record = {
            'pointcode': raw_data.get('pointcodes', {}).get(idx, ''),
            'issue_date': raw_data.get('issue_dates', {}).get(idx, ''),
            'trade_date': raw_data.get('trade_dates', {}).get(idx, ''),
            'region_name': raw_data.get('region_names', {}).get(idx, ''),
            'location_name': raw_data.get('location_names', {}).get(idx, ''),
            'low': low,
            'high': high,
            'average': avg,
            'volume': volume,
            'deals': deals,
            'flow_start_date': raw_data.get('flow_start_dates', {}).get(idx, ''),
            'flow_end_date': raw_data.get('flow_end_dates', {}).get(idx, '')
        }

        records.append(record)

    # Sort by trade_date
    records.sort(key=lambda x: x.get('trade_date', ''))

    return records


def normalize_daily_prices_data(raw_data):
    """
    Normalize NGI daily prices data into a chart-friendly format.

    The NGI API returns data in columnar format:
    {
        'averages': {0: 2.50, 1: 2.55, ...},
        'trade_dates': {0: '2024-01-01', 1: '2024-01-02', ...},
        'location_names': {0: 'Henry Hub', 1: 'Henry Hub', ...},
        'pointcodes': {0: 'SLAHH', 1: 'SLAHH', ...}
    }

    Returns:
        {
            'dates': ['2024-01-01', '2024-01-02', ...],
            'series': [
                {'name': 'Henry Hub', 'data': [2.50, 2.55, ...]},
                {'name': 'SoCal', 'data': [3.00, 2.95, ...]}
            ]
        }
    """
    if not raw_data:
        return {'dates': [], 'series': []}

    # Handle NGI columnar format
    if isinstance(raw_data, dict) and 'averages' in raw_data:
        # Convert columnar data to array of records
        data_length = len(raw_data.get('averages', {}))
        records = []

        for i in range(data_length):
            avg = raw_data.get('averages', {}).get(str(i))
            if avg is not None:
                avg = float(avg)

            records.append({
                'trade_date': raw_data.get('trade_dates', {}).get(str(i), ''),
                'location_name': raw_data.get('location_names', {}).get(str(i), 'Unknown'),
                'pointcode': raw_data.get('pointcodes', {}).get(str(i), ''),
                'average': avg
            })

        # Sort by trade date
        records.sort(key=lambda x: x['trade_date'])

        # Group by location
        locations = {}
        all_dates = []

        for record in records:
            date = record['trade_date']
            location = record['location_name'] or record['pointcode'] or 'Unknown'
            price = record['average']

            if date not in all_dates:
                all_dates.append(date)

            if location not in locations:
                locations[location] = {}

            locations[location][date] = price

        # Build series
        series = []
        for location, values in locations.items():
            series.append({
                'name': location,
                'data': [values.get(d) for d in all_dates]
            })

        return {
            'dates': all_dates,
            'series': series
        }

    # Handle array format (for compatibility)
    elif isinstance(raw_data, list):
        # Group by location
        locations = {}
        dates = set()

        for record in raw_data:
            date = record.get('date') or record.get('issue_date') or record.get('trade_date')
            location = record.get('location') or record.get('location_name') or record.get('hub') or record.get('point_name') or 'Unknown'
            price = record.get('price') or record.get('average') or record.get('midpoint') or record.get('value')

            if date:
                dates.add(date)
                if location not in locations:
                    locations[location] = {}
                locations[location][date] = price

        sorted_dates = sorted(list(dates))

        series = []
        for location, values in locations.items():
            series.append({
                'name': location,
                'data': [values.get(d) for d in sorted_dates]
            })

        return {
            'dates': sorted_dates,
            'series': series
        }

    return {'dates': [], 'series': []}


def process_standard_view(records):
    """Build chart/table payload for standard (single location) view."""
    if not records:
        return {'dates': [], 'series': [], 'table_columns': [], 'table_rows': [], 'raw_records': []}

    dates = [row.get('trade_date') for row in records]
    averages = [row.get('average') for row in records]

    series = [
        {
            'name': 'Average',
            'type': 'line',
            'data': averages,
            'color': '#2563eb',
            'itemStyle': {'color': '#2563eb'},
            'lineStyle': {'width': 2.5, 'color': '#2563eb'},
            'symbol': 'none',
            'showSymbol': False
        }
    ]

    table_rows = [
        {
            'index': idx + 1,
            'pointcode': row.get('pointcode'),
            'issue_date': row.get('issue_date'),
            'trade_date': row.get('trade_date'),
            'region_name': row.get('region_name'),
            'location_name': row.get('location_name'),
            'low': row.get('low'),
            'high': row.get('high'),
            'average': row.get('average'),
            'volume': row.get('volume'),
            'deals': row.get('deals'),
            'flow_start_date': row.get('flow_start_date'),
            'flow_end_date': row.get('flow_end_date')
        }
        for idx, row in enumerate(records)
    ]

    return {
        'dates': dates,
        'series': series,
        'table_columns': [
            'Index', 'Point Code', 'Issue Date', 'Trade Date', 'Region Name',
            'Location Name', 'Low', 'High', 'Average', 'Volume', 'Deals',
            'Flow Start Date', 'Flow End Date'
        ],
        'table_rows': table_rows,
        'raw_records': records
    }


def process_seasonality_view(current_records, previous_records, year, historical_records=None):
    """Build payload for seasonality mode with optional five-year band."""
    historical_records = historical_records or {}
    prev_year = year - 1

    date_keys = list(_MMDD_CALENDAR)

    current_lookup = _build_flow_day_lookup(current_records)
    previous_lookup = _build_flow_day_lookup(previous_records)

    current_values = [current_lookup.get(k) for k in date_keys]
    previous_values = [previous_lookup.get(k) for k in date_keys]

    historical_lookups = {}
    if isinstance(historical_records, dict):
        for hist_year, records in historical_records.items():
            if not records:
                continue
            lookup = _build_flow_day_lookup(records)
            if lookup:
                historical_lookups[hist_year] = lookup
    elif isinstance(historical_records, list):
        lookup = _build_flow_day_lookup(historical_records)
        if lookup:
            historical_lookups['aggregate'] = lookup

    range_min, range_max = _calculate_range_bounds(historical_lookups, date_keys)

    series = []
    has_range = any(v is not None for v in range_min) or any(v is not None for v in range_max)
    if has_range:
        # Calculate the range difference for stacked area chart
        range_diff = []
        for i in range(len(range_min)):
            if range_min[i] is not None and range_max[i] is not None:
                range_diff.append(range_max[i] - range_min[i])
            else:
                range_diff.append(None)

        # Bottom of the range (invisible base for stacking)
        series.append({
            'name': '',
            'type': 'line',
            'data': range_min,
            'lineStyle': {'opacity': 0},
            'areaStyle': {'opacity': 0},
            'stack': 'range',
            'symbol': 'none',
            'silent': True,
            'legendHoverLink': False,
            'z': 0
        })
        # Top of the range (visible band)
        series.append({
            'name': '5-Year Range',
            'type': 'line',
            'data': range_diff,
            'lineStyle': {'opacity': 0},
            'areaStyle': {'color': 'rgba(70, 130, 180, 0.3)', 'opacity': 1},
            'itemStyle': {'color': 'rgba(70, 130, 180, 0.6)'},
            'stack': 'range',
            'symbol': 'none',
            'z': 1
        })

    series.append({
        'name': str(year),
        'type': 'line',
        'data': current_values,
        'color': '#2563eb',
        'itemStyle': {'color': '#2563eb'},
        'lineStyle': {'width': 3, 'color': '#2563eb'},
        'symbol': 'none',
        'showSymbol': False,
        'z': 10
    })
    series.append({
        'name': str(prev_year),
        'type': 'line',
        'data': previous_values,
        'color': '#9ca3af',
        'itemStyle': {'color': '#9ca3af'},
        'lineStyle': {'width': 2, 'type': 'dashed', 'color': '#9ca3af'},
        'symbol': 'none',
        'showSymbol': False,
        'z': 10
    })

    table_rows = []
    for idx, date_key in enumerate(date_keys):
        curr_val = current_values[idx]
        prev_val = previous_values[idx]
        high_val = range_max[idx] if range_max else None
        low_val = range_min[idx] if range_min else None

        table_rows.append({
            'date': date_key,
            'curr': curr_val,
            'prev': prev_val,
            'high': high_val,
            'low': low_val
        })

    return {
        'dates': date_keys,
        'series': series,
        'table_columns': [
            'Date (MM-DD)',
            f'{year} Price',
            f'{prev_year} Price',
            '5-Year High',
            '5-Year Low'
        ],
        'table_rows': table_rows,
        'raw_records': []
    }





def process_comparison_view(datasets):
    """Build payload for compare mode (multi-location)."""
    if not datasets:
        return {'dates': [], 'series': [], 'table_columns': [], 'table_rows': []}

    date_map = {}
    labels = []

    for ds in datasets:
        label = ds.get('label') or 'Location'
        labels.append(label)
        for row in ds.get('records', []):
            trade_date = row.get('trade_date')
            if not trade_date:
                continue
            date_map.setdefault(trade_date, {})[label] = row.get('average')

    sorted_dates = sorted(date_map.keys())

    palette = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']
    series = []
    for idx, label in enumerate(labels):
        color = palette[idx % len(palette)]
        series.append({
            'name': label,
            'type': 'line',
            'data': [date_map[date].get(label) for date in sorted_dates],
            'color': color,
            'itemStyle': {'color': color},
            'lineStyle': {'width': 2, 'color': color},
            'symbol': 'none',
            'showSymbol': False,
            'connectNulls': True
        })

    table_rows = []
    for date in sorted_dates:
        row = {'date': date}
        for label in labels:
            row[label] = date_map[date].get(label)
        table_rows.append(row)

    return {
        'dates': sorted_dates,
        'series': series,
        'table_columns': ['Date'] + labels,
        'table_rows': table_rows,
        'raw_records': []
    }


def _build_calendar_keys():
    keys = []
    for month in range(1, 13):
        if month in (1, 3, 5, 7, 8, 10, 12):
            days = 31
        elif month in (4, 6, 9, 11):
            days = 30
        else:
            days = 28
        for day in range(1, days + 1):
            keys.append(f'{month:02d}-{day:02d}')
    return keys


_MMDD_CALENDAR = _build_calendar_keys()


def _calculate_range_bounds(historical_lookups, date_keys):
    if not historical_lookups:
        length = len(date_keys)
        return [None] * length, [None] * length

    range_min = []
    range_max = []

    for key in date_keys:
        values = []
        for lookup in historical_lookups.values():
            value = lookup.get(key)
            if value is not None:
                values.append(value)

        if values:
            range_min.append(min(values))
            range_max.append(max(values))
        else:
            range_min.append(None)
            range_max.append(None)

    return range_min, range_max


def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        return None


def _iterate_flow_mmdd(start_str, end_str):
    start = _parse_date(start_str)
    end = _parse_date(end_str)

    if not start and not end:
        return []
    if not start:
        start = end
    if not end:
        end = start
    if end < start:
        end = start

    current = start
    keys = []
    while current <= end:
        if current.month == 2 and current.day == 29:
            current += timedelta(days=1)
            continue
        keys.append(current.strftime('%m-%d'))
        current += timedelta(days=1)
    return keys


def _build_flow_day_lookup(records):
    lookup = {}
    if not records:
        return lookup

    for row in reversed(records):
        price = row.get('average')
        if price is None:
            continue
        start = row.get('flow_start_date') or row.get('trade_date')
        end = row.get('flow_end_date') or row.get('trade_date')
        for mmdd in _iterate_flow_mmdd(start, end):
            if mmdd not in lookup:
                lookup[mmdd] = price
    return lookup


def _build_flow_day_bucket(records):
    bucket = {}
    if not records:
        return bucket

    for row in records:
        price = row.get('average')
        if price is None:
            continue
        start = row.get('flow_start_date') or row.get('trade_date')
        end = row.get('flow_end_date') or row.get('trade_date')
        for mmdd in _iterate_flow_mmdd(start, end):
            bucket.setdefault(mmdd, []).append(price)
    return bucket


def process_spreads_view(records1, records2, location1_code, location2_code):
    """
    Build payload for spreads mode (difference between two locations).

    Spread = Location1 Average - Location2 Average
    """
    if not records1 or not records2:
        return {'dates': [], 'series': [], 'table_columns': [], 'table_rows': []}

    # Build price lookups by trade_date
    prices1 = {row.get('trade_date'): row.get('average') for row in records1 if row.get('average') is not None}
    prices2 = {row.get('trade_date'): row.get('average') for row in records2 if row.get('average') is not None}

    # Find common dates and calculate spreads
    common_dates = sorted(set(prices1.keys()) & set(prices2.keys()))
    spreads = []

    for date in common_dates:
        spread = prices1[date] - prices2[date]
        spreads.append(spread)

    # Build series for chart
    series = [{
        'name': f'{location1_code} - {location2_code}',
        'type': 'line',
        'data': spreads,
        'color': '#2563eb',
        'itemStyle': {'color': '#2563eb'},
        'lineStyle': {'width': 3, 'color': '#2563eb'},
        'symbol': 'none',
        'showSymbol': False
    }]

    # Build table rows
    table_rows = []
    for idx, date in enumerate(common_dates):
        spread = spreads[idx]
        table_rows.append({
            'date': date,
            'location1': prices1[date],
            'location2': prices2[date],
            'spread': spread
        })

    return {
        'dates': common_dates,
        'series': series,
        'table_columns': ['Date', f'{location1_code}', f'{location2_code}', 'Spread'],
        'table_rows': table_rows,
        'raw_records': []
    }
