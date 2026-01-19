"""
Forward Prices data routes.
Provides API endpoints and page for forward price curve visualization.
"""

from datetime import datetime
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

forward_prices_bp = Blueprint('forward_prices', __name__)


@forward_prices_bp.route('/forward-prices')
@require_api_creds
def forward_prices_page():
    """Render the forward prices chart page."""
    return render_template('forward_prices.html')


@forward_prices_bp.route('/api/forward-prices')
@require_api_creds
def api_forward_prices():
    """
    Main API endpoint for the Forward Prices tool.

    Supports three modes:
    - single_price: One location, multiple trade dates
    - multi_price: Multiple locations, one trade date
    - by_contract: One contract month over time, multiple locations
    """
    mode = request.args.get('mode', 'single_price').lower()
    price_type = request.args.get('price_type', 'fixed').lower()

    try:
        if mode == 'single_price':
            location = request.args.get('location', 'SLAHH')
            issue_dates = request.args.getlist('issue_dates[]') or request.args.getlist('issue_dates')

            if not issue_dates:
                raise ValueError('At least one issue date is required for single_price mode')

            payload = process_single_price_view(location, issue_dates, price_type)

        elif mode == 'multi_price':
            issue_date = request.args.get('issue_date')
            locations = request.args.getlist('locations[]') or request.args.getlist('locations')

            if not issue_date:
                raise ValueError('issue_date is required for multi_price mode')
            if not locations:
                raise ValueError('At least one location is required for multi_price mode')

            payload = process_multi_price_view(locations, issue_date, price_type)

        elif mode == 'by_contract':
            contract = request.args.get('contract')
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            locations = request.args.getlist('locations[]') or request.args.getlist('locations')

            if not contract:
                raise ValueError('contract is required for by_contract mode')
            if not start_date or not end_date:
                raise ValueError('start_date and end_date are required for by_contract mode')
            if not locations:
                raise ValueError('At least one location is required for by_contract mode')

            payload = process_by_contract_view(contract, locations, start_date, end_date, price_type)

        else:
            return jsonify({'error': f'Unknown mode: {mode}'}), 400

        return jsonify(payload)

    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@forward_prices_bp.route('/api/forward-locations')
@require_api_creds
def api_forward_locations():
    """Fetch available forward locations from NGI API."""
    try:
        data = ngi_request('forwardLocations')
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@forward_prices_bp.route('/api/forward-latest-date')
@require_api_creds
def api_forward_latest_date():
    """Fetch the latest available issue date from the NGI API.

    Note: Issue date is the day AFTER the trade date. If trade_date is Dec 11,
    the corresponding issue_date would be Dec 12.
    """
    try:
        from datetime import datetime, timedelta

        # Call without parameters to get latest available data
        data = fetch_forward_curve(None)

        # Extract the actual date from metadata
        trade_date = data.get('meta', {}).get('trade_date')
        issue_date = data.get('meta', {}).get('issue_date')

        # Prefer issue_date if available, otherwise convert trade_date to issue_date
        if issue_date:
            latest_issue_date = issue_date
        elif trade_date:
            # Issue date is the day after trade date
            trade_date_obj = datetime.strptime(trade_date, '%Y-%m-%d')
            issue_date_obj = trade_date_obj + timedelta(days=1)
            latest_issue_date = issue_date_obj.strftime('%Y-%m-%d')
        else:
            latest_issue_date = None

        if not latest_issue_date:
            # Fallback: try today and work backwards
            today = datetime.now()
            for days_back in range(0, 7):
                check_date = today - timedelta(days=days_back)
                check_date_str = check_date.strftime('%Y-%m-%d')
                try:
                    test_data = fetch_forward_curve(check_date_str)
                    test_trade_date = test_data.get('meta', {}).get('trade_date')
                    test_issue_date = test_data.get('meta', {}).get('issue_date')

                    if test_issue_date:
                        latest_issue_date = test_issue_date
                        break
                    elif test_trade_date:
                        test_trade_obj = datetime.strptime(test_trade_date, '%Y-%m-%d')
                        latest_issue_date = (test_trade_obj + timedelta(days=1)).strftime('%Y-%m-%d')
                        break
                except:
                    continue

        return jsonify({
            'success': True,
            'latest_issue_date': latest_issue_date
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# Data Fetching Functions
# ============================================================================

def fetch_forward_curve(issue_date):
    """
    Fetch full forward curve for ALL locations on a specific date.

    Args:
        issue_date: Date in YYYY-MM-DD format (optional - if None, gets latest)

    Returns:
        NGI API response:
        {
            "meta": {"trade_date": "...", "issue_date": "..."},
            "data": {
                "SLAHH": {
                    "Location": "Henry Hub",
                    "Contracts": ["2024-02-01", ...],
                    "Fixed Prices": [2.50, ...],
                    "Basis Prices": [0.00, ...]
                },
                ...
            }
        }
    """
    params = {}
    if issue_date:
        params['issue_date'] = issue_date

    return ngi_request('forwardDatafeed.json', params=params)


# ============================================================================
# Mode Processing Functions
# ============================================================================

def process_single_price_view(location_code, issue_dates, price_type='fixed'):
    """
    Build chart/table payload for single price mode (one location, multiple trade dates).

    Args:
        location_code: e.g., 'SLAHH'
        issue_dates: list like ['2024-01-15', '2024-01-22']
        price_type: 'fixed' or 'basis'

    Returns:
        Chart data with contract months on X-axis, one series per trade date
    """
    price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

    curves = []
    all_contracts = set()
    location_name = location_code
    failed_dates = []

    for issue_date in issue_dates:
        try:
            data = fetch_forward_curve(issue_date)
            location_data = data.get('data', {}).get(location_code, {})

            if not location_data:
                failed_dates.append(issue_date)
                continue

            location_name = location_data.get('Location', location_code)
            contracts = location_data.get('Contracts', [])
            prices = location_data.get(price_field, [])

            curves.append({
                'issue_date': issue_date,
                'trade_date': data.get('meta', {}).get('trade_date'),
                'contracts': contracts,
                'prices': prices
            })

            all_contracts.update(contracts)

        except Exception as e:
            # Skip dates that don't have data available
            print(f"Warning: Could not fetch data for {issue_date}: {str(e)}")
            failed_dates.append(issue_date)
            continue

    # Check if we got any data
    if not curves:
        raise ValueError(f'No forward curve data available for the selected dates. The API may not have published data for {", ".join(issue_dates)} yet.')

    # Sort contracts and filter to reasonable range
    sorted_contracts = sorted(list(all_contracts))
    sorted_contracts = filter_contracts_by_year(sorted_contracts, max_year=2030)
    formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

    # Build series
    palette = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']
    series = []

    for idx, curve in enumerate(curves):
        contract_price_map = dict(zip(curve['contracts'], curve['prices']))
        series_data = [contract_price_map.get(c) for c in sorted_contracts]

        color = palette[idx % len(palette)]

        series.append({
            'name': format_trade_date_label(curve['trade_date'] or curve['issue_date']),
            'type': 'line',
            'data': series_data,
            'color': color,
            'itemStyle': {'color': color},
            'lineStyle': {'width': 2, 'color': color},
            'symbol': 'none',
            'showSymbol': False
        })

    # Build table
    table_columns = ['Contract Month'] + [format_trade_date_label(c['trade_date'] or c['issue_date']) for c in curves]
    table_rows = []

    for idx, contract in enumerate(sorted_contracts):
        row = {'contract': formatted_contracts[idx]}
        for curve_idx, curve in enumerate(curves):
            contract_price_map = dict(zip(curve['contracts'], curve['prices']))
            row[table_columns[curve_idx + 1]] = contract_price_map.get(contract)
        table_rows.append(row)

    metadata = {
        'location_name': location_name,
        'price_type': price_type,
        'mode': 'single_price'
    }

    # Add warning if some dates failed
    if failed_dates:
        metadata['warning'] = f"Data unavailable for {len(failed_dates)} date(s): {', '.join(failed_dates)}"

    return {
        'dates': formatted_contracts,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows,
        'raw_records': curves,
        'metadata': metadata
    }


def process_multi_price_view(location_codes, issue_date, price_type='fixed'):
    """
    Build chart/table payload for multi-price mode (multiple locations, one trade date).

    Args:
        location_codes: list like ['SLAHH', 'CALSCG']
        issue_date: single date
        price_type: 'fixed' or 'basis'

    Returns:
        Chart data with contract months on X-axis, one series per location
    """
    price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

    data = fetch_forward_curve(issue_date)
    trade_date = data.get('meta', {}).get('trade_date')

    # Find union of all contracts across locations
    all_contracts = set()
    for code in location_codes:
        location_data = data.get('data', {}).get(code, {})
        all_contracts.update(location_data.get('Contracts', []))

    sorted_contracts = sorted(list(all_contracts))
    sorted_contracts = filter_contracts_by_year(sorted_contracts, max_year=2030)
    formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

    # Build series
    palette = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']
    series = []
    location_names = []

    for idx, code in enumerate(location_codes):
        location_data = data.get('data', {}).get(code, {})
        location_name = location_data.get('Location', code)
        location_names.append(location_name)

        contract_price_map = dict(zip(
            location_data.get('Contracts', []),
            location_data.get(price_field, [])
        ))

        series_data = [contract_price_map.get(c) for c in sorted_contracts]

        color = palette[idx % len(palette)]

        series.append({
            'name': location_name,
            'type': 'line',
            'data': series_data,
            'color': color,
            'itemStyle': {'color': color},
            'lineStyle': {'width': 2, 'color': color},
            'symbol': 'none',
            'showSymbol': False,
            'connectNulls': True
        })

    # Build table
    table_columns = ['Contract Month'] + location_names
    table_rows = []

    for idx, contract in enumerate(sorted_contracts):
        row = {'contract': formatted_contracts[idx]}
        for code, name in zip(location_codes, location_names):
            location_data = data.get('data', {}).get(code, {})
            contract_price_map = dict(zip(
                location_data.get('Contracts', []),
                location_data.get(price_field, [])
            ))
            row[name] = contract_price_map.get(contract)
        table_rows.append(row)

    return {
        'dates': formatted_contracts,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows,
        'raw_records': [],
        'metadata': {
            'trade_date': trade_date,
            'issue_date': issue_date,
            'price_type': price_type,
            'mode': 'multi_price'
        }
    }


def process_by_contract_view(contract_month, location_codes, start_date, end_date, price_type='fixed'):
    """
    Build chart/table payload for by-contract mode (one contract over time).

    Args:
        contract_month: e.g., '2025-01-01'
        location_codes: list of locations
        start_date, end_date: date range for trade dates
        price_type: 'fixed' or 'basis'

    Returns:
        Chart data with trade dates on X-axis, one series per location
    """
    price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

    # Use /forwardHistoricalData.json - one call per location (much faster!)
    results = {}
    all_trade_dates = []

    for location_code in location_codes:
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'location': location_code,
            'contract': contract_month
        }

        try:
            hist_data = ngi_request('forwardHistoricalData.json', params=params)

            # DEBUG: Print the response to see structure
            print(f"\n=== FORWARD HISTORICAL DATA for {location_code} ===")
            print(f"Type: {type(hist_data)}")
            print(f"Keys (if dict): {hist_data.keys() if isinstance(hist_data, dict) else 'N/A'}")
            print(f"First few items: {str(hist_data)[:500]}")
            print("=" * 50)

            # The response structure might be a list of records or nested dict
            # Let's handle all cases

            if isinstance(hist_data, list):
                # Case 1: Response is a list of records
                # [{trade_date: '2024-01-01', fixed_price: 2.5, basis_price: 0.1}, ...]
                dates = []
                prices = []
                location_name = location_code

                for record in hist_data:
                    # Try various field names
                    trade_date = (record.get('trade_date') or
                                 record.get('Trade Date') or
                                 record.get('date') or
                                 record.get('issue_date'))

                    if price_type == 'fixed':
                        price = (record.get('fixed_price') or
                                record.get('Fixed Price') or
                                record.get('price') or
                                record.get('settle'))
                    else:
                        price = (record.get('basis_price') or
                                record.get('Basis Price') or
                                record.get('basis') or
                                record.get('differential'))

                    location_name = (record.get('location') or
                                   record.get('Location') or
                                   record.get('point_name') or
                                   location_code)

                    if trade_date and price is not None:
                        dates.append(trade_date)
                        prices.append(price)

                results[location_code] = {
                    'name': location_name,
                    'dates': dates,
                    'prices': prices
                }

                if not all_trade_dates:
                    all_trade_dates = dates

            elif isinstance(hist_data, dict):
                # Case 2: Response is a dict structure
                # Check if it's a pandas-style dict (column -> {index -> value})

                # Detect pandas dict format by checking if values are dicts with numeric string keys
                is_pandas_format = False
                if hist_data and all(isinstance(v, dict) for v in hist_data.values()):
                    # Check if inner dicts have numeric string keys like '0', '1', '2'
                    first_val = next(iter(hist_data.values()), {})
                    if first_val and all(k.isdigit() for k in list(first_val.keys())[:3]):
                        is_pandas_format = True

                if is_pandas_format:
                    # Case 2a: Pandas-style dict format
                    # {column_name: {row_index: value}}
                    # Example: {'trade_dates': {'0': '2024-01-01', '1': '2024-01-02'},
                    #           'fixed_prices': {'0': 2.5, '1': 2.6}}

                    # Get the trade_dates column
                    trade_dates_dict = (hist_data.get('trade_dates') or
                                       hist_data.get('Trade Dates') or
                                       hist_data.get('issue_dates') or
                                       hist_data.get('dates') or {})

                    # Get the prices column based on price_type
                    if price_type == 'fixed':
                        prices_dict = (hist_data.get('fixed_prices') or
                                      hist_data.get('Fixed Prices') or
                                      hist_data.get('prices') or {})
                    else:
                        prices_dict = (hist_data.get('basis_prices') or
                                      hist_data.get('Basis Prices') or
                                      hist_data.get('basis') or {})

                    # Get location name
                    location_names_dict = (hist_data.get('location_names') or
                                          hist_data.get('Location Names') or
                                          hist_data.get('locations') or {})

                    if location_names_dict:
                        location_name = next(iter(location_names_dict.values()), location_code)
                    else:
                        location_name = location_code

                    # Convert from dict format to lists, maintaining order by numeric index
                    indices = sorted([int(k) for k in trade_dates_dict.keys()])
                    dates = [trade_dates_dict[str(i)] for i in indices if str(i) in trade_dates_dict]
                    prices = [prices_dict[str(i)] for i in indices if str(i) in prices_dict]

                    results[location_code] = {
                        'name': location_name,
                        'dates': dates,
                        'prices': prices
                    }

                    if not all_trade_dates:
                        all_trade_dates = dates

                else:
                    # Case 2b: Regular nested dict structure
                    if 'data' in hist_data:
                        # Structure: {data: {SLAHH: {trade_dates: [...], prices: [...]}}}
                        location_data = hist_data['data'].get(location_code, {})
                    else:
                        location_data = hist_data

                    # Try to extract dates and prices
                    dates = (location_data.get('trade_dates') or
                            location_data.get('Trade Dates') or
                            location_data.get('dates') or [])

                    if price_type == 'fixed':
                        prices = (location_data.get('fixed_prices') or
                                 location_data.get('Fixed Prices') or
                                 location_data.get(price_field, []))
                    else:
                        prices = (location_data.get('basis_prices') or
                                 location_data.get('Basis Prices') or
                                 location_data.get(price_field, []))

                    location_name = location_data.get('Location', location_code)

                    results[location_code] = {
                        'name': location_name,
                        'dates': dates,
                        'prices': prices
                    }

                    if not all_trade_dates:
                        all_trade_dates = dates

        except Exception as e:
            # If historical endpoint fails for this location, skip it
            print(f"Error fetching historical data for {location_code}: {str(e)}")
            continue

    # If we got no data, return empty structure
    if not results or not all_trade_dates:
        return {
            'dates': [],
            'series': [],
            'table_columns': ['Trade Date'],
            'table_rows': [],
            'raw_records': [],
            'metadata': {
                'contract_month': format_contract_month(contract_month),
                'price_type': price_type,
                'mode': 'by_contract',
                'total_dates': 0,
                'error': 'No data returned from API'
            }
        }

    # Build series
    palette = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']
    series = []
    location_names = []

    for idx, location_code in enumerate(location_codes):
        if location_code not in results:
            continue

        location_data = results[location_code]
        location_names.append(location_data['name'])
        color = palette[idx % len(palette)]

        series.append({
            'name': location_data['name'],
            'type': 'line',
            'data': location_data['prices'],
            'color': color,
            'itemStyle': {'color': color},
            'lineStyle': {'width': 2, 'color': color},
            'symbol': 'none',
            'showSymbol': False
        })

    # Build table
    table_columns = ['Trade Date'] + location_names
    table_rows = []

    for idx, trade_date in enumerate(all_trade_dates):
        row = {'date': trade_date}
        for location_code in location_codes:
            if location_code not in results:
                row[location_code] = None
                continue

            location_data = results[location_code]
            if idx < len(location_data['prices']):
                row[location_data['name']] = location_data['prices'][idx]
            else:
                row[location_data['name']] = None
        table_rows.append(row)

    return {
        'dates': [format_trade_date_label(d) for d in all_trade_dates],
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows,
        'raw_records': [],
        'metadata': {
            'contract_month': format_contract_month(contract_month),
            'price_type': price_type,
            'mode': 'by_contract',
            'total_dates': len(all_trade_dates)
        }
    }


# ============================================================================
# Helper Functions
# ============================================================================

def format_contract_month(contract_date):
    """Convert '2024-02-01' -> 'Feb 2024'"""
    if not contract_date:
        return 'N/A'
    try:
        year, month, _ = contract_date.split('-')
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return f"{month_names[int(month) - 1]} {year}"
    except (ValueError, IndexError):
        return contract_date


def format_trade_date_label(trade_date):
    """Convert '2024-01-15' -> 'Jan 15, 2024'"""
    if not trade_date:
        return 'Unknown'
    try:
        year, month, day = trade_date.split('-')
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return f"{month_names[int(month) - 1]} {int(day)}, {year}"
    except (ValueError, IndexError):
        return trade_date


def filter_contracts_by_year(contracts, max_year=2030):
    """Filter contracts to only show through specified year."""
    return [c for c in contracts if c and int(c.split('-')[0]) <= max_year]
