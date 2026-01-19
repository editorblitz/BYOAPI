"""
Forward Spread Dashboard data routes.
Provides API endpoints and page for fixed forward price spread visualization.
Uses forwardHistoricalData.json for efficient bulk data fetching.
"""

from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, ngi_request

forward_spread_dashboard_bp = Blueprint('forward_spread_dashboard', __name__)


@forward_spread_dashboard_bp.route('/forward-spread-dashboard')
@require_api_creds
def forward_spread_dashboard_page():
    """Render the fixed forward spreads dashboard page."""
    return render_template('forward_spread_dashboard.html')


@forward_spread_dashboard_bp.route('/api/forward-spread-data')
@require_api_creds
def api_forward_spread_data():
    """
    Fetch forward spread data between two locations over a date range.
    Uses forwardHistoricalData.json for efficient single-call data retrieval.

    Query params:
    - location1: First location code (e.g., 'SLAHH')
    - location2: Second location code (e.g., 'WTXWAHA')
    - start_date: Start date (YYYY-MM-DD)
    - end_date: End date (YYYY-MM-DD)
    - contract: Optional specific contract month (YYYY-MM-01). Defaults to prompt month.

    Returns:
    - Spread data over time for the specified contract month
    """
    try:
        location1 = request.args.get('location1', 'SLAHH')
        location2 = request.args.get('location2', 'WTXWAHA')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        contract = request.args.get('contract')

        if not start_date or not end_date:
            return jsonify({'error': 'start_date and end_date are required'}), 400

        # If no contract specified, use the prompt month (next month from end_date)
        if not contract:
            contract = get_prompt_month_contract(end_date)

        # Fetch historical data for both locations in parallel (2 API calls total)
        location1_data = fetch_historical_forward_data(location1, contract, start_date, end_date)
        location2_data = fetch_historical_forward_data(location2, contract, start_date, end_date)

        # Calculate spreads
        spread_data = calculate_spreads(location1_data, location2_data, contract)

        return jsonify(spread_data)

    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(exc)}), 500


def get_prompt_month_contract(reference_date_str):
    """
    Get the prompt month contract based on a reference date.
    The prompt month is the next calendar month.

    Args:
        reference_date_str: Date string in YYYY-MM-DD format

    Returns:
        Contract month in YYYY-MM-01 format
    """
    ref_date = datetime.strptime(reference_date_str, '%Y-%m-%d')

    # Move to next month
    if ref_date.month == 12:
        prompt_month = datetime(ref_date.year + 1, 1, 1)
    else:
        prompt_month = datetime(ref_date.year, ref_date.month + 1, 1)

    return prompt_month.strftime('%Y-%m-%d')


def fetch_historical_forward_data(location_code, contract, start_date, end_date):
    """
    Fetch historical forward price data for a location and contract.
    Uses forwardHistoricalData.json for efficient single-call retrieval.

    Args:
        location_code: Location code (e.g., 'SLAHH')
        contract: Contract month (e.g., '2025-02-01')
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        {
            'location_name': 'Henry Hub',
            'location_code': 'SLAHH',
            'dates': ['2024-01-15', '2024-01-16', ...],
            'prices': [2.50, 2.52, ...]
        }
    """
    result = {
        'location_name': location_code,
        'location_code': location_code,
        'dates': [],
        'prices': []
    }

    try:
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'location': location_code,
            'contract': contract
        }

        hist_data = ngi_request('forwardHistoricalData.json', params=params)

        # Parse the response - handle different possible formats
        if isinstance(hist_data, list):
            # List of records format
            for record in hist_data:
                trade_date = (record.get('trade_date') or
                             record.get('Trade Date') or
                             record.get('date') or
                             record.get('issue_date'))

                price = (record.get('fixed_price') or
                        record.get('Fixed Price') or
                        record.get('price') or
                        record.get('settle'))

                location_name = (record.get('location_name') or
                               record.get('Location') or
                               record.get('point_name') or
                               location_code)

                result['location_name'] = location_name

                if trade_date and price is not None:
                    result['dates'].append(trade_date)
                    result['prices'].append(float(price))

        elif isinstance(hist_data, dict):
            # Check for pandas-style dict format {column: {index: value}}
            is_pandas_format = False
            if hist_data and all(isinstance(v, dict) for v in hist_data.values()):
                first_val = next(iter(hist_data.values()), {})
                if first_val and all(str(k).isdigit() for k in list(first_val.keys())[:3]):
                    is_pandas_format = True

            if is_pandas_format:
                # Pandas dict format
                trade_dates_dict = (hist_data.get('trade_dates') or
                                   hist_data.get('Trade Dates') or
                                   hist_data.get('issue_dates') or
                                   hist_data.get('dates') or {})

                prices_dict = (hist_data.get('fixed_prices') or
                              hist_data.get('Fixed Prices') or
                              hist_data.get('prices') or {})

                location_names_dict = (hist_data.get('location_names') or
                                      hist_data.get('Location Names') or
                                      hist_data.get('locations') or {})

                if location_names_dict:
                    result['location_name'] = next(iter(location_names_dict.values()), location_code)

                # Convert from dict format to lists
                indices = sorted([int(k) for k in trade_dates_dict.keys()])
                result['dates'] = [trade_dates_dict[str(i)] for i in indices if str(i) in trade_dates_dict]
                result['prices'] = [float(prices_dict[str(i)]) for i in indices if str(i) in prices_dict]

            else:
                # Regular nested dict structure
                if 'data' in hist_data:
                    location_data = hist_data['data'].get(location_code, {})
                else:
                    location_data = hist_data

                result['dates'] = (location_data.get('trade_dates') or
                                  location_data.get('Trade Dates') or
                                  location_data.get('dates') or [])

                result['prices'] = (location_data.get('fixed_prices') or
                                   location_data.get('Fixed Prices') or [])

                result['location_name'] = location_data.get('Location', location_code)

    except Exception as e:
        print(f"Error fetching historical forward data for {location_code}: {str(e)}")
        import traceback
        traceback.print_exc()

    return result


def calculate_spreads(location1_data, location2_data, contract):
    """
    Calculate spreads between two locations across common dates.

    Returns:
        {
            'dates': ['2024-01-15', '2024-01-16', ...],
            'spreads': [0.15, 0.18, ...],
            'location1_name': 'Henry Hub',
            'location2_name': 'Waha',
            'contract': 'Feb 2025',
            'raw_records': [...]
        }
    """
    # Build date->price lookups
    prices1 = dict(zip(location1_data['dates'], location1_data['prices']))
    prices2 = dict(zip(location2_data['dates'], location2_data['prices']))

    # Find common dates
    common_dates = sorted(set(prices1.keys()).intersection(set(prices2.keys())))

    dates = []
    spreads = []
    raw_records = []

    for date in common_dates:
        loc1_price = prices1[date]
        loc2_price = prices2[date]

        if loc1_price is not None and loc2_price is not None:
            spread = loc1_price - loc2_price
            dates.append(date)
            spreads.append(spread)

            raw_records.append({
                'trade_date': date,
                'loc1_price': loc1_price,
                'loc2_price': loc2_price,
                'spread': spread
            })

    # Format contract for display
    contract_display = format_contract_month(contract)

    return {
        'dates': dates,
        'spreads': spreads,
        'location1_name': location1_data['location_name'],
        'location2_name': location2_data['location_name'],
        'contract': contract_display,
        'raw_records': raw_records
    }


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
