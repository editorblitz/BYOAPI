"""
Netbacks data routes.
Provides API endpoints and page for LNG netback price visualization.
Compares TTF (Europe) and JKM (Asia) netbacks to Henry Hub.
"""

import json
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify, Response, stream_with_context
from auth import require_api_creds, ngi_request

netbacks_bp = Blueprint('netbacks', __name__)

# Color scheme for consistent series coloring
COLORS = {
    'ttf_netback': '#2563eb',      # Blue
    'jkm_netback': '#dc2626',      # Red
    'henry_hub': '#16a34a',        # Green
    'ttf_spread': '#7c3aed',       # Purple
    'jkm_spread': '#ea580c',       # Orange
}


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

    Supports two modes:
    - forward_curve: Show netback curves for all delivery months on a single date
    - time_series: Track a specific contract month over a date range

    Query params:
        - mode: 'forward_curve' or 'time_series'
        - issue_date: Single date for forward_curve mode (YYYY-MM-DD)
        - start_date, end_date: Date range for time_series mode
        - contract: Contract month for time_series mode (YYYY-MM-01)
        - show_spreads: 'true' to include spread calculations
    """
    mode = request.args.get('mode', 'forward_curve').lower()
    show_spreads = request.args.get('show_spreads', 'true').lower() == 'true'

    try:
        if mode == 'forward_curve':
            issue_date = request.args.get('issue_date')
            if not issue_date:
                raise ValueError('issue_date is required for forward_curve mode')

            payload = process_forward_curve_view(issue_date, show_spreads)

        elif mode == 'time_series':
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            contract = request.args.get('contract')

            if not start_date or not end_date:
                raise ValueError('start_date and end_date are required for time_series mode')
            if not contract:
                raise ValueError('contract is required for time_series mode')

            payload = process_time_series_view(contract, start_date, end_date, show_spreads)

        else:
            return jsonify({'error': f'Unknown mode: {mode}'}), 400

        return jsonify(payload)

    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@netbacks_bp.route('/api/netback-latest-date')
@require_api_creds
def api_netback_latest_date():
    """Fetch the latest available issue date from the NGI LNG API."""
    try:
        # Try fetching without date to get latest
        data = ngi_request('lngNetbackDatafeed.json', params={})

        # Extract issue date from response
        issue_date = None
        if isinstance(data, dict):
            issue_date = data.get('meta', {}).get('issue_date') or data.get('issue_date')

        if not issue_date:
            # Fallback: try recent dates going back 90 days to find latest available
            print("Searching for latest available netback date...")
            today = datetime.now()
            for days_back in range(0, 90):
                check_date = today - timedelta(days=days_back)
                check_date_str = check_date.strftime('%Y-%m-%d')
                try:
                    test_data = ngi_request('lngNetbackDatafeed.json', params={'issue_date': check_date_str})
                    # Check if the response has actual data
                    if test_data and isinstance(test_data, dict):
                        data_section = test_data.get('data', {})
                        if data_section and len(data_section) > 0:
                            issue_date = check_date_str
                            print(f"✓ Found latest netback date: {issue_date} (went back {days_back} days)")
                            break
                except Exception as e:
                    # Only print non-404 errors
                    if '404' not in str(e):
                        print(f"  Error checking {check_date_str}: {e}")
                    continue

            if not issue_date:
                print("WARNING: No netback data found in last 90 days!")

        return jsonify({
            'success': True,
            'latest_issue_date': issue_date
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@netbacks_bp.route('/api/netbacks-stream')
@require_api_creds
def api_netbacks_stream():
    """
    Server-Sent Events endpoint for streaming time series fetch progress.
    Provides real-time updates to the frontend logger during long-running fetches.
    """
    mode = request.args.get('mode', 'time_series').lower()
    show_spreads = request.args.get('show_spreads', 'true').lower() == 'true'

    if mode != 'time_series':
        return jsonify({'error': 'Stream endpoint only supports time_series mode'}), 400

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    contract = request.args.get('contract')

    if not start_date or not end_date:
        return jsonify({'error': 'start_date and end_date are required'}), 400
    if not contract:
        return jsonify({'error': 'contract is required'}), 400

    def generate():
        """Generator that yields SSE events with progress updates."""
        # Generate list of dates to fetch
        dates_to_fetch = generate_date_list(start_date, end_date)
        total_dates = len(dates_to_fetch)

        # Send initial progress message
        yield f"data: {json.dumps({'type': 'start', 'total': total_dates, 'contract': format_contract_month(contract)})}\n\n"

        ttf_series = {}
        jkm_series = {}
        hh_series = {}
        dates_with_data = 0
        dates_skipped = 0

        # Fetch data for each date
        for idx, date_str in enumerate(dates_to_fetch, 1):
            progress_pct = (idx / total_dates) * 100

            try:
                # Fetch netback data
                arb_data = fetch_arb_curves_data(date_str)
                found_data = False
                ttf_val = None
                jkm_val = None
                hh_val = None

                # Parse TTF and JKM for the specific contract
                if arb_data and isinstance(arb_data, dict):
                    data_section = arb_data.get('data', {})

                    # TTF Netback
                    ttf_data = data_section.get('LNETBACKTTF', {})
                    if ttf_data:
                        contracts = ttf_data.get('Contracts', [])
                        prices = ttf_data.get('Prices', [])
                        if contracts and prices:
                            contract_map = {c: parse_price(p) for c, p in zip(contracts, prices)}
                            netback_val = contract_map.get(contract)
                            if netback_val is not None:
                                ttf_series[date_str] = netback_val
                                ttf_val = netback_val
                                found_data = True

                    # JKM Netback
                    jkm_data = data_section.get('LNETBACKJPNKOR', {})
                    if jkm_data:
                        contracts = jkm_data.get('Contracts', [])
                        prices = jkm_data.get('Prices', [])
                        if contracts and prices:
                            contract_map = {c: parse_price(p) for c, p in zip(contracts, prices)}
                            netback_val = contract_map.get(contract)
                            if netback_val is not None:
                                jkm_series[date_str] = netback_val
                                jkm_val = netback_val
                                found_data = True

                # Fetch Henry Hub for this date and contract
                try:
                    hh_curve = fetch_henry_hub_curve(date_str)
                    hh_price = hh_curve.get(contract)
                    if hh_price is not None:
                        hh_series[date_str] = hh_price
                        hh_val = hh_price
                        found_data = True
                except Exception:
                    pass  # Skip HH errors silently

                if found_data:
                    dates_with_data += 1
                    # Send progress with data
                    progress_msg = {
                        'type': 'progress',
                        'current': idx,
                        'total': total_dates,
                        'percent': round(progress_pct, 1),
                        'date': date_str,
                        'status': 'data',
                        'ttf': ttf_val,
                        'jkm': jkm_val,
                        'hh': hh_val
                    }
                else:
                    dates_skipped += 1
                    # Send progress without data (weekend/holiday)
                    progress_msg = {
                        'type': 'progress',
                        'current': idx,
                        'total': total_dates,
                        'percent': round(progress_pct, 1),
                        'date': date_str,
                        'status': 'skip'
                    }

                yield f"data: {json.dumps(progress_msg)}\n\n"

            except Exception as e:
                dates_skipped += 1
                error_msg = str(e) if '404' not in str(e) else 'no data'
                yield f"data: {json.dumps({'type': 'progress', 'current': idx, 'total': total_dates, 'percent': round(progress_pct, 1), 'date': date_str, 'status': 'error', 'error': error_msg})}\n\n"
                continue

        # Build the final payload (same logic as process_time_series_view)
        all_dates = set()
        all_dates.update(ttf_series.keys())
        all_dates.update(jkm_series.keys())
        all_dates.update(hh_series.keys())

        sorted_dates = sorted(list(all_dates))
        formatted_dates = [format_trade_date_label(d) for d in sorted_dates]

        # Build series
        series = []

        # TTF Netback
        ttf_data_list = [ttf_series.get(d) for d in sorted_dates]
        if any(v is not None for v in ttf_data_list):
            series.append({
                'name': 'TTF Netback',
                'type': 'line',
                'data': ttf_data_list,
                'color': COLORS['ttf_netback'],
                'itemStyle': {'color': COLORS['ttf_netback']},
                'lineStyle': {'width': 2, 'color': COLORS['ttf_netback']},
                'symbol': 'circle',
                'symbolSize': 4
            })

        # JPN/KOR Netback
        jkm_data_list = [jkm_series.get(d) for d in sorted_dates]
        if any(v is not None for v in jkm_data_list):
            series.append({
                'name': 'JPN/KOR Netback',
                'type': 'line',
                'data': jkm_data_list,
                'color': COLORS['jkm_netback'],
                'itemStyle': {'color': COLORS['jkm_netback']},
                'lineStyle': {'width': 2, 'color': COLORS['jkm_netback']},
                'symbol': 'circle',
                'symbolSize': 4
            })

        # Henry Hub
        hh_data_list = [hh_series.get(d) for d in sorted_dates]
        if any(v is not None for v in hh_data_list):
            series.append({
                'name': 'Henry Hub',
                'type': 'line',
                'data': hh_data_list,
                'color': COLORS['henry_hub'],
                'itemStyle': {'color': COLORS['henry_hub']},
                'lineStyle': {'width': 2, 'color': COLORS['henry_hub']},
                'symbol': 'circle',
                'symbolSize': 4
            })

        # Calculate spreads if requested
        if show_spreads:
            # TTF-HH Spread
            ttf_spread = []
            for d in sorted_dates:
                ttf_v = ttf_series.get(d)
                hh_v = hh_series.get(d)
                if ttf_v is not None and hh_v is not None:
                    ttf_spread.append(round(ttf_v - hh_v, 3))
                else:
                    ttf_spread.append(None)

            if any(v is not None for v in ttf_spread):
                series.append({
                    'name': 'TTF-HH Spread',
                    'type': 'line',
                    'data': ttf_spread,
                    'color': COLORS['ttf_spread'],
                    'itemStyle': {'color': COLORS['ttf_spread']},
                    'lineStyle': {'width': 2, 'color': COLORS['ttf_spread'], 'type': 'dashed'},
                    'symbol': 'circle',
                    'symbolSize': 4
                })

            # JPN/KOR-HH Spread
            jkm_spread = []
            for d in sorted_dates:
                jkm_v = jkm_series.get(d)
                hh_v = hh_series.get(d)
                if jkm_v is not None and hh_v is not None:
                    jkm_spread.append(round(jkm_v - hh_v, 3))
                else:
                    jkm_spread.append(None)

            if any(v is not None for v in jkm_spread):
                series.append({
                    'name': 'JPN/KOR-HH Spread',
                    'type': 'line',
                    'data': jkm_spread,
                    'color': COLORS['jkm_spread'],
                    'itemStyle': {'color': COLORS['jkm_spread']},
                    'lineStyle': {'width': 2, 'color': COLORS['jkm_spread'], 'type': 'dashed'},
                    'symbol': 'circle',
                    'symbolSize': 4
                })

        # Build table data
        table_columns = ['Trade Date', 'TTF Netback', 'JPN/KOR Netback', 'Henry Hub']
        if show_spreads:
            table_columns.extend(['TTF-HH Spread', 'JPN/KOR-HH Spread'])

        table_rows = []
        for i, date_str in enumerate(sorted_dates):
            row = {
                'date': formatted_dates[i],
                'ttf_netback': ttf_series.get(date_str),
                'jkm_netback': jkm_series.get(date_str),
                'henry_hub': hh_series.get(date_str)
            }
            if show_spreads:
                ttf_v = ttf_series.get(date_str)
                jkm_v = jkm_series.get(date_str)
                hh_v = hh_series.get(date_str)
                row['ttf_spread'] = round(ttf_v - hh_v, 3) if ttf_v is not None and hh_v is not None else None
                row['jkm_spread'] = round(jkm_v - hh_v, 3) if jkm_v is not None and hh_v is not None else None
            table_rows.append(row)

        # Send final complete message with all data
        final_payload = {
            'type': 'complete',
            'dates': formatted_dates,
            'series': series,
            'table_columns': table_columns,
            'table_rows': table_rows,
            'metadata': {
                'contract_month': format_contract_month(contract),
                'start_date': start_date,
                'end_date': end_date,
                'mode': 'time_series',
                'show_spreads': show_spreads,
                'total_dates': len(sorted_dates),
                'dates_with_data': dates_with_data,
                'dates_skipped': dates_skipped
            }
        }

        yield f"data: {json.dumps(final_payload)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


# ============================================================================
# Data Fetching Functions
# ============================================================================

def fetch_netback_data(issue_date):
    """
    Fetch LNG netback data for a specific issue date.

    Args:
        issue_date: Date in YYYY-MM-DD format

    Returns:
        NGI API response with netback data
    """
    params = {'issue_date': issue_date} if issue_date else {}
    return ngi_request('lngNetbackDatafeed.json', params=params)


def fetch_arb_curves_data(issue_date):
    """
    Fetch LNG netback/arbitrage curves data for a specific issue date.

    Tries lngNetbackDatafeed.json first, falls back to lngArbCurvesDatafeed.json.

    Args:
        issue_date: Date in YYYY-MM-DD format

    Returns:
        NGI API response with netback/arbitrage curve data, or None if not available
    """
    params = {'issue_date': issue_date} if issue_date else {}

    # Try netback datafeed first (more likely to have the data we need)
    try:
        data = ngi_request('lngNetbackDatafeed.json', params=params)
        if data:
            return data
    except Exception as e:
        # 404 on weekends/holidays is expected - don't log as error
        if '404' not in str(e):
            print(f"lngNetbackDatafeed error for {issue_date}: {e}")

    # Fallback to arb curves
    try:
        data = ngi_request('lngArbCurvesDatafeed.json', params=params)
        if data:
            return data
    except Exception as e:
        # 404 on weekends/holidays is expected - don't log as error
        if '404' not in str(e):
            print(f"lngArbCurvesDatafeed error for {issue_date}: {e}")

    return None


def fetch_henry_hub_curve(issue_date):
    """
    Fetch Henry Hub forward curve for comparison.

    Args:
        issue_date: Date in YYYY-MM-DD format

    Returns:
        Dict with contracts as keys and prices as values
    """
    params = {'issue_date': issue_date} if issue_date else {}
    data = ngi_request('forwardDatafeed.json', params=params)

    # Extract Henry Hub data
    hh_data = data.get('data', {}).get('SLAHH', {})
    contracts = hh_data.get('Contracts', [])
    prices = hh_data.get('Fixed Prices', [])

    return dict(zip(contracts, prices))


# ============================================================================
# Mode Processing Functions
# ============================================================================

def process_forward_curve_view(issue_date, show_spreads=True):
    """
    Build chart/table payload for forward curve mode.
    Shows netback curves for all delivery months on a single date.

    Args:
        issue_date: Single date to fetch
        show_spreads: Whether to include spread calculations

    Returns:
        Chart data with contract months on X-axis
    """
    # Fetch netback/arb curve data
    arb_data = fetch_arb_curves_data(issue_date)
    if arb_data is None:
        arb_data = {}

    # Fetch Henry Hub curve for comparison
    try:
        hh_curve = fetch_henry_hub_curve(issue_date)
        print(f"HH: Fetched {len(hh_curve)} total contracts")
        if hh_curve:
            hh_contracts = sorted(list(hh_curve.keys()))[:15]
            print(f"HH: First 15 contracts: {hh_contracts}")
    except Exception as e:
        print(f"Error fetching HH curve: {e}")
        hh_curve = {}

    # Debug: print response structure
    print(f"\n=== NETBACK DATA for {issue_date} ===")
    print(f"Type: {type(arb_data)}")
    if isinstance(arb_data, dict):
        print(f"Top-level Keys: {list(arb_data.keys())}")
        # Print more detail about the data structure
        data_section = arb_data.get('data', arb_data)
        if isinstance(data_section, dict):
            print(f"Data section keys: {list(data_section.keys())[:10]}")
            # Show first entry structure
            for key in list(data_section.keys())[:2]:
                val = data_section[key]
                if isinstance(val, dict):
                    print(f"  '{key}' keys: {list(val.keys())}")
                elif isinstance(val, list) and len(val) > 0:
                    print(f"  '{key}' is list with {len(val)} items, first: {val[0]}")
                else:
                    print(f"  '{key}': {val}")
        elif isinstance(data_section, list) and len(data_section) > 0:
            print(f"Data is a list with {len(data_section)} items")
            print(f"First item: {data_section[0]}")
    print("=" * 50)

    # Parse the netback data
    # Structure: data['LNETBACKTTF'] = {Pointcode, Name, Contracts: [...], Prices: [...]}
    #            data['LNETBACKJPNKOR'] = {Pointcode, Name, Contracts: [...], Prices: [...]}
    ttf_netbacks = {}
    jkm_netbacks = {}

    if isinstance(arb_data, dict):
        data_section = arb_data.get('data', {})

        # TTF Netback - look for LNETBACKTTF
        ttf_data = data_section.get('LNETBACKTTF', {})
        if ttf_data:
            contracts = ttf_data.get('Contracts', [])
            prices = ttf_data.get('Prices', [])
            if contracts and prices:
                # Convert prices to floats (API returns strings)
                ttf_netbacks = {c: parse_price(p) for c, p in zip(contracts, prices)}
                print(f"TTF: Found {len(ttf_netbacks)} contracts: {contracts}")

        # JKM Netback - look for LNETBACKJPNKOR (Japan/Korea Marker)
        jkm_data = data_section.get('LNETBACKJPNKOR', {})
        if jkm_data:
            contracts = jkm_data.get('Contracts', [])
            prices = jkm_data.get('Prices', [])
            if contracts and prices:
                # Convert prices to floats (API returns strings)
                jkm_netbacks = {c: parse_price(p) for c, p in zip(contracts, prices)}
                print(f"JKM: Found {len(jkm_netbacks)} contracts: {contracts}")

    # Build contract list based on what netback data exists
    # Only show months where we have netback data (TTF or JKM)
    netback_contracts = set()
    netback_contracts.update(ttf_netbacks.keys())
    netback_contracts.update(jkm_netbacks.keys())

    if not netback_contracts:
        # No netback data at all
        sorted_contracts = []
    else:
        # Use netback contracts as the base, filter and limit to 12
        sorted_contracts = sorted(list(netback_contracts))
        sorted_contracts = filter_contracts_by_year(sorted_contracts, max_year=2030)
        sorted_contracts = sorted_contracts[:12]

    formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

    print(f"Displaying {len(sorted_contracts)} contracts based on netback availability")
    if sorted_contracts:
        print(f"  First contract: {sorted_contracts[0]}, Last: {sorted_contracts[-1]}")

    # Build series
    series = []

    # TTF Netback
    ttf_data = [ttf_netbacks.get(c) for c in sorted_contracts]
    if any(v is not None for v in ttf_data):
        series.append({
            'name': 'TTF Netback',
            'type': 'line',
            'data': ttf_data,
            'color': COLORS['ttf_netback'],
            'itemStyle': {'color': COLORS['ttf_netback']},
            'lineStyle': {'width': 2, 'color': COLORS['ttf_netback']},
            'symbol': 'none'
        })

    # JPN/KOR Netback
    jkm_data = [jkm_netbacks.get(c) for c in sorted_contracts]
    if any(v is not None for v in jkm_data):
        series.append({
            'name': 'JPN/KOR Netback',
            'type': 'line',
            'data': jkm_data,
            'color': COLORS['jkm_netback'],
            'itemStyle': {'color': COLORS['jkm_netback']},
            'lineStyle': {'width': 2, 'color': COLORS['jkm_netback']},
            'symbol': 'none'
        })

    # Henry Hub
    hh_data = [hh_curve.get(c) for c in sorted_contracts]
    if any(v is not None for v in hh_data):
        series.append({
            'name': 'Henry Hub',
            'type': 'line',
            'data': hh_data,
            'color': COLORS['henry_hub'],
            'itemStyle': {'color': COLORS['henry_hub']},
            'lineStyle': {'width': 2, 'color': COLORS['henry_hub']},
            'symbol': 'none'
        })

    # Calculate spreads if requested
    if show_spreads:
        # TTF-HH Spread
        ttf_spread = []
        for i, c in enumerate(sorted_contracts):
            ttf_val = ttf_netbacks.get(c)
            hh_val = hh_curve.get(c)
            if ttf_val is not None and hh_val is not None:
                ttf_spread.append(round(ttf_val - hh_val, 3))
            else:
                ttf_spread.append(None)

        if any(v is not None for v in ttf_spread):
            series.append({
                'name': 'TTF-HH Spread',
                'type': 'line',
                'data': ttf_spread,
                'color': COLORS['ttf_spread'],
                'itemStyle': {'color': COLORS['ttf_spread']},
                'lineStyle': {'width': 2, 'color': COLORS['ttf_spread'], 'type': 'dashed'},
                'symbol': 'none'
            })

        # JPN/KOR-HH Spread
        jkm_spread = []
        for i, c in enumerate(sorted_contracts):
            jkm_val = jkm_netbacks.get(c)
            hh_val = hh_curve.get(c)
            if jkm_val is not None and hh_val is not None:
                jkm_spread.append(round(jkm_val - hh_val, 3))
            else:
                jkm_spread.append(None)

        if any(v is not None for v in jkm_spread):
            series.append({
                'name': 'JPN/KOR-HH Spread',
                'type': 'line',
                'data': jkm_spread,
                'color': COLORS['jkm_spread'],
                'itemStyle': {'color': COLORS['jkm_spread']},
                'lineStyle': {'width': 2, 'color': COLORS['jkm_spread'], 'type': 'dashed'},
                'symbol': 'none'
            })

    # Build table data
    table_columns = ['Contract Month', 'TTF Netback', 'JPN/KOR Netback', 'Henry Hub']
    if show_spreads:
        table_columns.extend(['TTF-HH Spread', 'JPN/KOR-HH Spread'])

    table_rows = []
    for i, contract in enumerate(sorted_contracts):
        row = {
            'contract': formatted_contracts[i],
            'ttf_netback': ttf_netbacks.get(contract),
            'jkm_netback': jkm_netbacks.get(contract),
            'henry_hub': hh_curve.get(contract)
        }
        if show_spreads:
            ttf_val = ttf_netbacks.get(contract)
            jkm_val = jkm_netbacks.get(contract)
            hh_val = hh_curve.get(contract)
            row['ttf_spread'] = round(ttf_val - hh_val, 3) if ttf_val is not None and hh_val is not None else None
            row['jkm_spread'] = round(jkm_val - hh_val, 3) if jkm_val is not None and hh_val is not None else None
        table_rows.append(row)

    return {
        'dates': formatted_contracts,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows,
        'metadata': {
            'issue_date': issue_date,
            'mode': 'forward_curve',
            'show_spreads': show_spreads
        }
    }


def process_time_series_view(contract_month, start_date, end_date, show_spreads=True):
    """
    Build chart/table payload for time series mode.
    Tracks a specific contract month over a date range.

    Args:
        contract_month: e.g., '2025-06-01'
        start_date, end_date: Date range for trade dates
        show_spreads: Whether to include spread calculations

    Returns:
        Chart data with trade dates on X-axis
    """
    # Generate list of dates to fetch
    dates_to_fetch = generate_date_list(start_date, end_date)
    total_dates = len(dates_to_fetch)

    print(f"\n{'='*60}")
    print(f"NETBACK TIME SERIES: Fetching {total_dates} dates")
    print(f"  Contract: {contract_month} | Range: {start_date} to {end_date}")
    print(f"{'='*60}")

    ttf_series = {}
    jkm_series = {}
    hh_series = {}

    # Progress tracking
    dates_with_data = 0
    dates_skipped = 0

    # Fetch data for each date
    for idx, date_str in enumerate(dates_to_fetch, 1):
        # Progress update every date
        progress_pct = (idx / total_dates) * 100
        print(f"  [{idx:3d}/{total_dates}] ({progress_pct:5.1f}%) Fetching {date_str}...", end=" ")

        try:
            # Fetch netback data (returns None for weekends/holidays)
            arb_data = fetch_arb_curves_data(date_str)

            found_data = False

            # Parse TTF and JKM for the specific contract
            if arb_data and isinstance(arb_data, dict):
                data_section = arb_data.get('data', {})

                # TTF Netback
                ttf_data = data_section.get('LNETBACKTTF', {})
                if ttf_data:
                    contracts = ttf_data.get('Contracts', [])
                    prices = ttf_data.get('Prices', [])
                    if contracts and prices:
                        contract_map = {c: parse_price(p) for c, p in zip(contracts, prices)}
                        netback_val = contract_map.get(contract_month)
                        if netback_val is not None:
                            ttf_series[date_str] = netback_val
                            found_data = True

                # JKM Netback
                jkm_data = data_section.get('LNETBACKJPNKOR', {})
                if jkm_data:
                    contracts = jkm_data.get('Contracts', [])
                    prices = jkm_data.get('Prices', [])
                    if contracts and prices:
                        contract_map = {c: parse_price(p) for c, p in zip(contracts, prices)}
                        netback_val = contract_map.get(contract_month)
                        if netback_val is not None:
                            jkm_series[date_str] = netback_val
                            found_data = True

            # Fetch Henry Hub for this date and contract
            try:
                hh_curve = fetch_henry_hub_curve(date_str)
                hh_val = hh_curve.get(contract_month)
                if hh_val is not None:
                    hh_series[date_str] = hh_val
                    found_data = True
            except Exception as hh_err:
                # 404 on weekends/holidays is expected
                if '404' not in str(hh_err):
                    print(f"HH error: {hh_err}")

            # Log result
            if found_data:
                ttf_val = ttf_series.get(date_str, '-')
                jkm_val = jkm_series.get(date_str, '-')
                hh_val = hh_series.get(date_str, '-')
                print(f"✓ TTF={ttf_val}, JKM={jkm_val}, HH={hh_val}")
                dates_with_data += 1
            else:
                print("- no data (weekend/holiday)")
                dates_skipped += 1

        except Exception as e:
            # Only log unexpected errors (not 404s from weekends/holidays)
            if '404' not in str(e):
                print(f"ERROR: {e}")
            else:
                print("- no data (404)")
                dates_skipped += 1
            continue

    # Summary
    print(f"{'='*60}")
    print(f"FETCH COMPLETE: {dates_with_data} dates with data, {dates_skipped} skipped")
    print(f"{'='*60}\n")

    # Build unified date list from what we got
    all_dates = set()
    all_dates.update(ttf_series.keys())
    all_dates.update(jkm_series.keys())
    all_dates.update(hh_series.keys())

    sorted_dates = sorted(list(all_dates))
    formatted_dates = [format_trade_date_label(d) for d in sorted_dates]

    # Build series
    series = []

    # TTF Netback
    ttf_data = [ttf_series.get(d) for d in sorted_dates]
    if any(v is not None for v in ttf_data):
        series.append({
            'name': 'TTF Netback',
            'type': 'line',
            'data': ttf_data,
            'color': COLORS['ttf_netback'],
            'itemStyle': {'color': COLORS['ttf_netback']},
            'lineStyle': {'width': 2, 'color': COLORS['ttf_netback']},
            'symbol': 'circle',
            'symbolSize': 4
        })

    # JPN/KOR Netback
    jkm_data = [jkm_series.get(d) for d in sorted_dates]
    if any(v is not None for v in jkm_data):
        series.append({
            'name': 'JPN/KOR Netback',
            'type': 'line',
            'data': jkm_data,
            'color': COLORS['jkm_netback'],
            'itemStyle': {'color': COLORS['jkm_netback']},
            'lineStyle': {'width': 2, 'color': COLORS['jkm_netback']},
            'symbol': 'circle',
            'symbolSize': 4
        })

    # Henry Hub
    hh_data = [hh_series.get(d) for d in sorted_dates]
    if any(v is not None for v in hh_data):
        series.append({
            'name': 'Henry Hub',
            'type': 'line',
            'data': hh_data,
            'color': COLORS['henry_hub'],
            'itemStyle': {'color': COLORS['henry_hub']},
            'lineStyle': {'width': 2, 'color': COLORS['henry_hub']},
            'symbol': 'circle',
            'symbolSize': 4
        })

    # Calculate spreads if requested
    if show_spreads:
        # TTF-HH Spread
        ttf_spread = []
        for d in sorted_dates:
            ttf_val = ttf_series.get(d)
            hh_val = hh_series.get(d)
            if ttf_val is not None and hh_val is not None:
                ttf_spread.append(round(ttf_val - hh_val, 3))
            else:
                ttf_spread.append(None)

        if any(v is not None for v in ttf_spread):
            series.append({
                'name': 'TTF-HH Spread',
                'type': 'line',
                'data': ttf_spread,
                'color': COLORS['ttf_spread'],
                'itemStyle': {'color': COLORS['ttf_spread']},
                'lineStyle': {'width': 2, 'color': COLORS['ttf_spread'], 'type': 'dashed'},
                'symbol': 'circle',
                'symbolSize': 4
            })

        # JPN/KOR-HH Spread
        jkm_spread = []
        for d in sorted_dates:
            jkm_val = jkm_series.get(d)
            hh_val = hh_series.get(d)
            if jkm_val is not None and hh_val is not None:
                jkm_spread.append(round(jkm_val - hh_val, 3))
            else:
                jkm_spread.append(None)

        if any(v is not None for v in jkm_spread):
            series.append({
                'name': 'JPN/KOR-HH Spread',
                'type': 'line',
                'data': jkm_spread,
                'color': COLORS['jkm_spread'],
                'itemStyle': {'color': COLORS['jkm_spread']},
                'lineStyle': {'width': 2, 'color': COLORS['jkm_spread'], 'type': 'dashed'},
                'symbol': 'circle',
                'symbolSize': 4
            })

    # Build table data
    table_columns = ['Trade Date', 'TTF Netback', 'JPN/KOR Netback', 'Henry Hub']
    if show_spreads:
        table_columns.extend(['TTF-HH Spread', 'JPN/KOR-HH Spread'])

    table_rows = []
    for i, date_str in enumerate(sorted_dates):
        row = {
            'date': formatted_dates[i],
            'ttf_netback': ttf_series.get(date_str),
            'jkm_netback': jkm_series.get(date_str),
            'henry_hub': hh_series.get(date_str)
        }
        if show_spreads:
            ttf_val = ttf_series.get(date_str)
            jkm_val = jkm_series.get(date_str)
            hh_val = hh_series.get(date_str)
            row['ttf_spread'] = round(ttf_val - hh_val, 3) if ttf_val is not None and hh_val is not None else None
            row['jkm_spread'] = round(jkm_val - hh_val, 3) if jkm_val is not None and hh_val is not None else None
        table_rows.append(row)

    return {
        'dates': formatted_dates,
        'series': series,
        'table_columns': table_columns,
        'table_rows': table_rows,
        'metadata': {
            'contract_month': format_contract_month(contract_month),
            'start_date': start_date,
            'end_date': end_date,
            'mode': 'time_series',
            'show_spreads': show_spreads,
            'total_dates': len(sorted_dates)
        }
    }


# ============================================================================
# Helper Functions
# ============================================================================

def generate_date_list(start_date, end_date):
    """Generate a list of date strings between start and end."""
    dates = []
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    current = start
    while current <= end:
        dates.append(current.strftime('%Y-%m-%d'))
        current += timedelta(days=1)

    return dates


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


def parse_price(value):
    """Convert a price value to float, handling strings and None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            # Remove any commas or currency symbols
            cleaned = value.replace(',', '').replace('$', '').strip()
            return float(cleaned) if cleaned else None
        except ValueError:
            return None
    return None
