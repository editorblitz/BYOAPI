"""
Forward Heatmap data routes.
Compares forward curves between two trade dates with heatmap visualization.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, require_api_creds_json, ngi_request

forward_heatmap_bp = Blueprint('forward_heatmap', __name__)


@forward_heatmap_bp.route('/forward-heatmap')
@require_api_creds
def forward_heatmap_page():
    """Render the forward heatmap page."""
    return render_template('forward_heatmap.html')


@forward_heatmap_bp.route('/api/forward-heatmap')
@require_api_creds_json
def api_forward_heatmap():
    """
    API endpoint for Forward Heatmap comparison.
    Compares forward curves between two issue dates.

    Query params:
        start_date: Start issue date (YYYY-MM-DD)
        end_date: End issue date (YYYY-MM-DD)

    Returns:
        {
            success: true,
            metadata: {start_trade_date, end_trade_date, alignment_info},
            table_data: [{location, start_fixed, end_fixed, fixed_change, ...}],
            heatmap_data: {
                fixed: {location: {contract: {change, start_price, end_price}}},
                basis: {location: {contract: {change, start_price, end_price}}}
            },
            contracts: ['01-2024', '02-2024', ...]
        }
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'success': False, 'error': 'Both start_date and end_date are required'}), 400

    try:
        # Fetch forward curve data for both dates
        start_data = fetch_forward_curve(start_date)
        end_data = fetch_forward_curve(end_date)

        if not start_data or 'data' not in start_data:
            return jsonify({'success': False, 'error': f'No data available for start date {start_date}'}), 404

        if not end_data or 'data' not in end_data:
            return jsonify({'success': False, 'error': f'No data available for end date {end_date}'}), 404

        # Align contract data (handle month rolls)
        adjusted_start_data, alignment_info = align_contract_data(start_data, end_data)

        # Pad arrays for missing data
        pad_arrays_for_missing_data(adjusted_start_data, end_data)

        # Build response data
        table_data = []
        fixed_heatmap = {}
        basis_heatmap = {}
        all_contracts = []

        # Get contract list from first location
        first_location = next(iter(adjusted_start_data['data'].values()), None)
        if first_location and first_location.get('Contracts'):
            all_contracts = [
                format_contract_month_short(c) if c else f'Unknown'
                for c in first_location['Contracts']
            ]

        # Process each location
        for key, start_loc in sorted(adjusted_start_data['data'].items(), key=lambda x: x[1].get('Location', '')):
            end_loc = end_data['data'].get(key)
            if not end_loc:
                continue

            location_name = start_loc.get('Location', key)

            # Initialize heatmap entries for this location
            fixed_heatmap[location_name] = {}
            basis_heatmap[location_name] = {}

            # Process all contracts for heatmaps
            contracts = start_loc.get('Contracts', [])
            fixed_prices_start = start_loc.get('Fixed Prices', [])
            fixed_prices_end = end_loc.get('Fixed Prices', [])
            basis_prices_start = start_loc.get('Basis Prices', [])
            basis_prices_end = end_loc.get('Basis Prices', [])

            for idx, contract in enumerate(contracts):
                contract_label = format_contract_month_short(contract) if contract else f'Unknown-{idx}'

                # Fixed price change
                start_fixed = fixed_prices_start[idx] if idx < len(fixed_prices_start) else None
                end_fixed = fixed_prices_end[idx] if idx < len(fixed_prices_end) else None

                if start_fixed is not None and end_fixed is not None:
                    fixed_change = round(float(end_fixed) - float(start_fixed), 3)
                    fixed_heatmap[location_name][contract_label] = {
                        'change': fixed_change,
                        'start_price': float(start_fixed),
                        'end_price': float(end_fixed)
                    }
                else:
                    fixed_heatmap[location_name][contract_label] = {
                        'change': None,
                        'start_price': float(start_fixed) if start_fixed is not None else None,
                        'end_price': float(end_fixed) if end_fixed is not None else None
                    }

                # Basis price change
                start_basis = basis_prices_start[idx] if idx < len(basis_prices_start) else None
                end_basis = basis_prices_end[idx] if idx < len(basis_prices_end) else None

                if start_basis is not None and end_basis is not None:
                    basis_change = round(float(end_basis) - float(start_basis), 3)
                    basis_heatmap[location_name][contract_label] = {
                        'change': basis_change,
                        'start_price': float(start_basis),
                        'end_price': float(end_basis)
                    }
                else:
                    basis_heatmap[location_name][contract_label] = {
                        'change': None,
                        'start_price': float(start_basis) if start_basis is not None else None,
                        'end_price': float(end_basis) if end_basis is not None else None
                    }

            # Build table row (prompt month only)
            start_fixed_prompt = fixed_prices_start[0] if fixed_prices_start else None
            end_fixed_prompt = fixed_prices_end[0] if fixed_prices_end else None
            start_basis_prompt = basis_prices_start[0] if basis_prices_start else None
            end_basis_prompt = basis_prices_end[0] if basis_prices_end else None

            fixed_change = None
            if start_fixed_prompt is not None and end_fixed_prompt is not None:
                fixed_change = round(float(end_fixed_prompt) - float(start_fixed_prompt), 3)

            basis_change = None
            if start_basis_prompt is not None and end_basis_prompt is not None:
                basis_change = round(float(end_basis_prompt) - float(start_basis_prompt), 3)

            table_data.append({
                'location': location_name,
                'start_fixed': float(start_fixed_prompt) if start_fixed_prompt is not None else None,
                'end_fixed': float(end_fixed_prompt) if end_fixed_prompt is not None else None,
                'fixed_change': fixed_change,
                'start_basis': float(start_basis_prompt) if start_basis_prompt is not None else None,
                'end_basis': float(end_basis_prompt) if end_basis_prompt is not None else None,
                'basis_change': basis_change
            })

        # Get prompt month label
        prompt_month = all_contracts[0] if all_contracts else 'N/A'

        return jsonify({
            'success': True,
            'metadata': {
                'start_trade_date': adjusted_start_data.get('meta', {}).get('trade_date', ''),
                'end_trade_date': end_data.get('meta', {}).get('trade_date', ''),
                'start_issue_date': start_date,
                'end_issue_date': end_date,
                'prompt_month': prompt_month,
                'alignment_info': alignment_info,
                'location_count': len(table_data),
                'contract_count': len(all_contracts)
            },
            'table_data': table_data,
            'heatmap_data': {
                'fixed': fixed_heatmap,
                'basis': basis_heatmap
            },
            'contracts': all_contracts
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def fetch_forward_curve(issue_date):
    """Fetch full forward curve for ALL locations on a specific date."""
    params = {'issue_date': issue_date} if issue_date else {}
    return ngi_request('forwardDatafeed.json', params=params)


def get_prompt_month(data):
    """Get the first contract date from any location's data."""
    if not data or 'data' not in data:
        return None
    first_location = next(iter(data['data'].values()), None)
    if not first_location or not first_location.get('Contracts'):
        return None
    return first_location['Contracts'][0]


def get_month_difference(start_month, end_month):
    """Calculate the number of months between two contract dates."""
    if not start_month or not end_month:
        return 0
    try:
        start_year, start_month_num, _ = start_month.split('-')
        end_year, end_month_num, _ = end_month.split('-')
        return (int(end_year) - int(start_year)) * 12 + (int(end_month_num) - int(start_month_num))
    except (ValueError, AttributeError):
        return 0


def align_contract_data(start_data, end_data):
    """
    Align contract data between two dates to handle month rolls.
    If the prompt month changed between dates, remove earlier months from start data.
    """
    import copy

    start_prompt = get_prompt_month(start_data)
    end_prompt = get_prompt_month(end_data)

    alignment_info = {
        'start_prompt_month': format_contract_month(start_prompt) if start_prompt else None,
        'end_prompt_month': format_contract_month(end_prompt) if end_prompt else None,
        'months_rolled': 0,
        'removed_months': [],
        'adjusted': False
    }

    if not start_prompt or not end_prompt:
        return start_data, alignment_info

    month_diff = get_month_difference(start_prompt, end_prompt)
    alignment_info['months_rolled'] = month_diff

    if month_diff <= 0:
        return start_data, alignment_info

    # Need to adjust - deep copy start data
    adjusted_data = copy.deepcopy(start_data)
    alignment_info['adjusted'] = True

    # Get sample of removed months for display
    first_location = next(iter(adjusted_data['data'].values()), None)
    if first_location and first_location.get('Contracts'):
        items_to_remove = min(month_diff, len(first_location['Contracts']) - 1)
        for i in range(items_to_remove):
            if first_location['Contracts'][i]:
                alignment_info['removed_months'].append(
                    format_contract_month(first_location['Contracts'][i])
                )

    # Remove earlier months from all locations
    for loc_data in adjusted_data['data'].values():
        items_to_remove = min(month_diff, len(loc_data.get('Contracts', [])) - 1)
        if items_to_remove > 0:
            loc_data['Fixed Prices'] = loc_data.get('Fixed Prices', [])[items_to_remove:]
            loc_data['Basis Prices'] = loc_data.get('Basis Prices', [])[items_to_remove:]
            loc_data['Contracts'] = loc_data.get('Contracts', [])[items_to_remove:]

    return adjusted_data, alignment_info


def pad_arrays_for_missing_data(start_data, end_data):
    """Ensure both datasets have matching contract arrays for comparison."""
    for key in start_data.get('data', {}).keys():
        start_loc = start_data['data'].get(key)
        end_loc = end_data.get('data', {}).get(key)

        if not start_loc or not end_loc:
            continue

        start_len = len(start_loc.get('Contracts', []))
        end_len = len(end_loc.get('Contracts', []))

        if start_len < end_len:
            diff = end_len - start_len
            start_loc['Contracts'] = start_loc.get('Contracts', []) + [None] * diff
            start_loc['Fixed Prices'] = start_loc.get('Fixed Prices', []) + [None] * diff
            start_loc['Basis Prices'] = start_loc.get('Basis Prices', []) + [None] * diff


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


def format_contract_month_short(contract_date):
    """Convert '2024-02-01' -> '02-2024'"""
    if not contract_date:
        return 'N/A'
    try:
        year, month, _ = contract_date.split('-')
        return f"{month}-{year}"
    except (ValueError, IndexError):
        return contract_date
