"""
Forward Table data routes.
Provides API endpoint and page for viewing forward curves in a table format.
Shows all locations for a single trade date.
"""

from flask import Blueprint, render_template, request, jsonify
from auth import require_api_creds, require_api_creds_json, ngi_request

forward_table_bp = Blueprint('forward_table', __name__)


@forward_table_bp.route('/forward-table')
@require_api_creds
def forward_table_page():
    """Render the forward table page."""
    return render_template('forward_table.html')


@forward_table_bp.route('/api/forward-table')
@require_api_creds_json
def api_forward_table():
    """
    API endpoint for Forward Table.
    Returns all locations' forward curves for a single issue date.

    Query params:
        issue_date: YYYY-MM-DD format
        price_type: 'fixed' or 'basis' (default: 'fixed')

    Returns:
        {
            success: true,
            metadata: {trade_date, issue_date, price_type, location_count, contract_range},
            locations: [{code, name, prices: [...]}],
            contracts: ['Jan 2024', 'Feb 2024', ...],
            raw_contracts: ['2024-01-01', '2024-02-01', ...]
        }
    """
    issue_date = request.args.get('issue_date')
    price_type = request.args.get('price_type', 'fixed').lower()

    if not issue_date:
        return jsonify({'success': False, 'error': 'issue_date is required'}), 400

    if price_type not in ('fixed', 'basis'):
        return jsonify({'success': False, 'error': 'price_type must be "fixed" or "basis"'}), 400

    try:
        # Fetch forward curve data for all locations
        data = fetch_forward_curve(issue_date)

        if not data or 'data' not in data:
            return jsonify({'success': False, 'error': 'No data received from API'}), 404

        price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

        # Extract metadata
        trade_date = data.get('meta', {}).get('trade_date', '')
        actual_issue_date = data.get('meta', {}).get('issue_date', issue_date)

        # Build location list sorted alphabetically by name
        locations = []
        all_contracts = set()

        for code, loc_data in data.get('data', {}).items():
            location_name = loc_data.get('Location', code)
            contracts = loc_data.get('Contracts', [])
            prices = loc_data.get(price_field, [])

            locations.append({
                'code': code,
                'name': location_name,
                'contracts': contracts,
                'prices': prices
            })

            all_contracts.update(contracts)

        # Sort locations alphabetically by name
        locations.sort(key=lambda x: x['name'])

        # Sort contracts chronologically
        sorted_contracts = sorted(list(all_contracts))

        # Format contracts for display (e.g., "Jan 2024")
        formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

        # Build price matrix: for each location, map prices to the full contract list
        for loc in locations:
            contract_price_map = dict(zip(loc['contracts'], loc['prices']))
            loc['prices'] = [contract_price_map.get(c) for c in sorted_contracts]
            # Remove the contracts field as it's now redundant
            del loc['contracts']

        # Determine contract range
        if sorted_contracts:
            contract_range = f"{format_contract_month(sorted_contracts[0])} - {format_contract_month(sorted_contracts[-1])}"
        else:
            contract_range = 'N/A'

        return jsonify({
            'success': True,
            'metadata': {
                'trade_date': trade_date,
                'issue_date': actual_issue_date,
                'price_type': 'Fixed' if price_type == 'fixed' else 'Basis',
                'location_count': len(locations),
                'contract_range': contract_range
            },
            'locations': locations,
            'contracts': formatted_contracts,
            'raw_contracts': sorted_contracts
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def fetch_forward_curve(issue_date):
    """
    Fetch full forward curve for ALL locations on a specific date.

    Args:
        issue_date: Date in YYYY-MM-DD format

    Returns:
        NGI API response with all locations' forward curves
    """
    params = {'issue_date': issue_date} if issue_date else {}
    return ngi_request('forwardDatafeed.json', params=params)


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
