#!/usr/bin/env python3
"""
Flask web application for natural gas price data visualization
"""
import os
import json
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from database import PriceDatabase

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')

# Add JSON filter for Jinja2
@app.template_filter('tojson')
def to_json(value):
    return json.dumps(value)

# Initialize database
db = PriceDatabase()

@app.route('/')
def index():
    """Main home page - analysis tool selector"""
    # Get database stats for overview
    stats = db.get_database_stats()
    return render_template('home.html', stats=stats)

@app.route('/price-viewer')
def price_viewer():
    """Basic price viewing dashboard"""
    # Get available locations for dropdown
    locations = db.get_available_locations()

    # Group locations by region
    locations_by_region = {}
    for loc in locations:
        region = loc['region_name']
        if region not in locations_by_region:
            locations_by_region[region] = []
        locations_by_region[region].append(loc)

    # Get database stats
    stats = db.get_database_stats()

    return render_template('price_viewer.html',
                         locations_by_region=locations_by_region,
                         stats=stats)

@app.route('/year-on-year-viewer')
def year_on_year_viewer():
    """Year-on-year price comparison dashboard"""
    # Get available locations for dropdown
    locations = db.get_available_locations()

    # Group locations by region
    locations_by_region = {}
    for loc in locations:
        region = loc['region_name']
        if region not in locations_by_region:
            locations_by_region[region] = []
        locations_by_region[region].append(loc)

    # Get database stats
    stats = db.get_database_stats()

    return render_template('year_on_year_viewer.html',
                         locations_by_region=locations_by_region,
                         stats=stats)

@app.route('/monthly-volumes')
def monthly_volumes():
    """Monthly volume analysis dashboard"""
    # Get available locations for dropdown
    locations = db.get_available_locations()

    # Group locations by region
    locations_by_region = {}
    for loc in locations:
        region = loc['region_name']
        if region not in locations_by_region:
            locations_by_region[region] = []
        locations_by_region[region].append(loc)

    # Get database stats
    stats = db.get_database_stats()

    return render_template('monthly_volumes.html',
                         locations_by_region=locations_by_region,
                         stats=stats)

@app.route('/admin')
def admin():
    """Admin dashboard for data management"""
    # Get locations with their latest dates
    locations_status = get_locations_status()

    # Get database stats
    stats = db.get_database_stats()

    return render_template('admin.html',
                         locations_status=locations_status,
                         stats=stats)

@app.route('/api/update-location-data', methods=['POST'])
def api_update_location_data():
    """API endpoint to update data for a specific location"""
    from test_api import NGIDataAPI

    location_code = request.json.get('location_code')
    if not location_code:
        return jsonify({'error': 'Location code required'}), 400

    try:
        # Get the latest date for this location
        latest_date = get_latest_date_for_location(location_code)
        if not latest_date:
            return jsonify({'error': 'No existing data found for location'}), 404

        # Calculate update period (from day after latest to today)
        start_date = (datetime.strptime(latest_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = datetime.now().strftime('%Y-%m-%d')

        if start_date > end_date:
            return jsonify({'message': 'Data is already up to date', 'records_added': 0})

        # Initialize API and get new data
        api = NGIDataAPI()
        raw_data = api.get_historical_data(location_code, start_date, end_date)

        if not raw_data:
            return jsonify({'error': 'No new data available from API'}), 404

        # Process and store the data
        processed_data = api.process_api_response(raw_data)
        if processed_data:
            inserted, duplicates = db.insert_price_data(processed_data)
            return jsonify({
                'message': f'Update completed for {location_code}',
                'records_added': inserted,
                'duplicates': duplicates,
                'date_range': f'{start_date} to {end_date}'
            })
        else:
            return jsonify({'error': 'No processed data available'}, 404)

    except Exception as e:
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@app.route('/api/update-all-locations', methods=['POST'])
def api_update_all_locations():
    """API endpoint to update data for all existing locations"""
    try:
        locations_status = get_locations_status()
        results = []
        total_added = 0

        for location in locations_status:
            location_code = location['location_code']

            # Skip if already up to date
            if location['days_behind'] <= 0:
                results.append({
                    'location': location_code,
                    'status': 'up_to_date',
                    'records_added': 0
                })
                continue

            try:
                # Update this location
                from test_api import NGIDataAPI
                api = NGIDataAPI()

                start_date = (datetime.strptime(location['latest_date'], '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
                end_date = datetime.now().strftime('%Y-%m-%d')

                raw_data = api.get_historical_data(location_code, start_date, end_date)
                if raw_data:
                    processed_data = api.process_api_response(raw_data)
                    if processed_data:
                        inserted, duplicates = db.insert_price_data(processed_data)
                        total_added += inserted
                        results.append({
                            'location': location_code,
                            'status': 'updated',
                            'records_added': inserted,
                            'duplicates': duplicates
                        })
                    else:
                        results.append({
                            'location': location_code,
                            'status': 'no_data',
                            'records_added': 0
                        })
                else:
                    results.append({
                        'location': location_code,
                        'status': 'api_error',
                        'records_added': 0
                    })

            except Exception as e:
                results.append({
                    'location': location_code,
                    'status': 'error',
                    'error': str(e),
                    'records_added': 0
                })

        return jsonify({
            'message': f'Bulk update completed',
            'total_records_added': total_added,
            'results': results
        })

    except Exception as e:
        return jsonify({'error': f'Bulk update failed: {str(e)}'}), 500

def get_locations_status():
    """Get status of all locations with data"""
    locations = db.get_available_locations()
    status_list = []

    for location in locations:
        location_code = location['point_code']
        latest_date = get_latest_date_for_location(location_code)
        earliest_date = get_earliest_date_for_location(location_code)

        if latest_date:
            latest_dt = datetime.strptime(latest_date, '%Y-%m-%d')
            today = datetime.now()
            days_behind = (today - latest_dt).days

            status_list.append({
                'point_code': location_code,
                'location_code': location_code,
                'location_name': location['location_name'],
                'region_name': location['region_name'],
                'earliest_date': earliest_date,
                'latest_date': latest_date,
                'days_behind': days_behind,
                'status': 'up_to_date' if days_behind <= 1 else 'needs_update'
            })

    return sorted(status_list, key=lambda x: x['days_behind'], reverse=True)

def get_latest_date_for_location(location_code):
    """Get the latest trade date for a specific location"""
    with sqlite3.connect(db.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT MAX(trade_date)
            FROM price_data
            WHERE point_code = ?
        ''', (location_code,))
        result = cursor.fetchone()
        return result[0] if result and result[0] else None

def get_earliest_date_for_location(location_code):
    """Get the earliest trade date for a specific location"""
    with sqlite3.connect(db.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT MIN(trade_date)
            FROM price_data
            WHERE point_code = ?
        ''', (location_code,))
        result = cursor.fetchone()
        return result[0] if result and result[0] else None

@app.route('/api/price-data')
def api_price_data():
    """API endpoint to get price data for charts"""
    location_code = request.args.get('location', 'SLAHH')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # Default to last 30 days if no dates provided
    if not start_date or not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    # Get data from database
    data = db.get_price_data(location_code, start_date, end_date)

    if not data:
        return jsonify({'error': 'No data found'}), 404

    # Format data for ECharts
    trade_dates = [record['trade_date'] for record in data]
    averages = [record['average'] for record in data]
    highs = [record['high'] for record in data]
    lows = [record['low'] for record in data]
    volumes = [record['volume'] for record in data]

    response_data = {
        'location_name': data[0]['location_name'],
        'region_name': data[0]['region_name'],
        'trade_dates': trade_dates,
        'averages': averages,
        'highs': highs,
        'lows': lows,
        'volumes': volumes,
        'record_count': len(data),
        'date_range': {
            'start': start_date,
            'end': end_date
        }
    }

    return jsonify(response_data)

@app.route('/api/year-on-year-data')
def api_year_on_year_data():
    """API endpoint to get year-on-year price comparison data"""
    location_code = request.args.get('location', 'SLAHH')
    comparison_mode = request.args.get('mode', 'full')  # 'full' or 'ytd'

    # Get current year and previous year
    current_year = datetime.now().year
    previous_year = current_year - 1
    current_date = datetime.now()

    # Current year: Jan 1 to today (always same for both modes)
    current_year_start = f"{current_year}-01-01"
    current_year_end = current_date.strftime('%Y-%m-%d')

    # Previous year date range depends on mode
    previous_year_start = f"{previous_year}-01-01"
    if comparison_mode == 'ytd':
        # Year-to-date: same period as current year
        if current_date.month == 12 and current_date.day == 31:
            previous_year_end = f"{previous_year}-12-31"
        else:
            previous_year_end = f"{previous_year}-{current_date.month:02d}-{current_date.day:02d}"
    else:
        # Full year: entire previous year
        previous_year_end = f"{previous_year}-12-31"

    # Get data from database
    current_year_data = db.get_price_data(location_code, current_year_start, current_year_end)
    previous_year_data = db.get_price_data(location_code, previous_year_start, previous_year_end)

    if not current_year_data and not previous_year_data:
        return jsonify({'error': 'No data found'}), 404

    # Process current year data
    current_dates = []
    current_prices = []
    location_name = "Unknown"
    region_name = "Unknown"

    for record in current_year_data:
        # Convert to MM-DD format for comparison
        trade_date = datetime.strptime(record['trade_date'], '%Y-%m-%d')
        date_key = trade_date.strftime('%m-%d')
        current_dates.append(date_key)
        current_prices.append(record['average'])
        location_name = record['location_name']
        region_name = record['region_name']

    # Process previous year data
    previous_dates = []
    previous_prices = []

    for record in previous_year_data:
        # Convert to MM-DD format for comparison
        trade_date = datetime.strptime(record['trade_date'], '%Y-%m-%d')
        date_key = trade_date.strftime('%m-%d')
        previous_dates.append(date_key)
        previous_prices.append(record['average'])
        if not location_name or location_name == "Unknown":
            location_name = record['location_name']
            region_name = record['region_name']

    # Create aligned data (match dates)
    all_dates = sorted(list(set(current_dates + previous_dates)))

    aligned_current = []
    aligned_previous = []

    for date_key in all_dates:
        # Current year price
        if date_key in current_dates:
            idx = current_dates.index(date_key)
            aligned_current.append(current_prices[idx])
        else:
            aligned_current.append(None)

        # Previous year price
        if date_key in previous_dates:
            idx = previous_dates.index(date_key)
            aligned_previous.append(previous_prices[idx])
        else:
            aligned_previous.append(None)

    response_data = {
        'location_name': location_name,
        'region_name': region_name,
        'dates': all_dates,
        'current_year': current_year,
        'previous_year': previous_year,
        'current_year_prices': aligned_current,
        'previous_year_prices': aligned_previous,
        'current_year_records': len(current_year_data),
        'previous_year_records': len(previous_year_data),
        'comparison_mode': comparison_mode,
        'previous_year_period': f"{previous_year_start} to {previous_year_end}"
    }

    return jsonify(response_data)

@app.route('/api/five-year-range-data')
def api_five_year_range_data():
    """API endpoint to get five-year range comparison data"""
    location_code = request.args.get('location', 'SLAHH')

    current_year = datetime.now().year

    # Get current year data (Jan 1 to present)
    current_year_start = f"{current_year}-01-01"
    current_year_end = datetime.now().strftime('%Y-%m-%d')
    current_year_data = db.get_price_data(location_code, current_year_start, current_year_end)

    # Get previous 5 years of complete data
    five_year_data = {}
    for year in range(current_year - 5, current_year):
        year_start = f"{year}-01-01"
        year_end = f"{year}-12-31"
        year_data = db.get_price_data(location_code, year_start, year_end)
        five_year_data[year] = year_data

    if not current_year_data:
        return jsonify({'error': 'No current year data found'}), 404

    # Convert flow dates to daily prices for current year
    current_daily_prices = convert_flow_to_daily_prices(current_year_data, current_year)

    # Convert flow dates to daily prices for each of the 5 previous years
    historical_daily_prices = {}
    for year, year_data in five_year_data.items():
        if year_data:
            historical_daily_prices[year] = convert_flow_to_daily_prices(year_data, year)

    # Calculate 5-year range for each day of year (excluding leap day complications)
    daily_ranges = calculate_five_year_ranges(historical_daily_prices, current_year)

    # Prepare response data
    location_name = current_year_data[0]['location_name'] if current_year_data else "Unknown"
    region_name = current_year_data[0]['region_name'] if current_year_data else "Unknown"

    response_data = {
        'location_name': location_name,
        'region_name': region_name,
        'current_year': current_year,
        'current_year_prices': current_daily_prices,
        'five_year_high': daily_ranges['high'],
        'five_year_low': daily_ranges['low'],
        'five_year_average': daily_ranges['average'],
        'dates': daily_ranges['dates'],
        'years_included': list(historical_daily_prices.keys()),
        'current_year_records': len(current_year_data),
        'debug_info': {
            'current_year_sample': dict(list(current_daily_prices.items())[:5]),
            'historical_sample': {year: dict(list(prices.items())[:5]) for year, prices in historical_daily_prices.items()},
            'range_sample': {
                'dates': daily_ranges['dates'][:5],
                'highs': daily_ranges['high'][:5],
                'lows': daily_ranges['low'][:5]
            }
        }
    }

    return jsonify(response_data)

def convert_flow_to_daily_prices(data_records, year):
    """Convert flow date records to daily prices for every day of the year"""
    daily_prices = {}

    # Handle leap year - skip Feb 29 for consistency
    is_leap_year = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

    for record in data_records:
        flow_start = datetime.strptime(record['flow_start_date'], '%Y-%m-%d')
        flow_end = datetime.strptime(record['flow_end_date'], '%Y-%m-%d')
        price = record['average']

        # Assign price to each day in the flow period
        current_date = flow_start
        while current_date <= flow_end:
            # Skip Feb 29 in leap years for consistency across years
            if not (is_leap_year and current_date.month == 2 and current_date.day == 29):
                date_key = current_date.strftime('%m-%d')
                daily_prices[date_key] = price

            current_date += timedelta(days=1)

    return daily_prices

def calculate_five_year_ranges(historical_data, current_year):
    """Calculate min, max, and average for each day across 5 years"""
    # Get all possible dates (excluding Feb 29)
    all_dates = []
    for month in range(1, 13):
        days_in_month = 31
        if month in [4, 6, 9, 11]:
            days_in_month = 30
        elif month == 2:
            days_in_month = 28  # Always use 28 for February

        for day in range(1, days_in_month + 1):
            all_dates.append(f"{month:02d}-{day:02d}")

    daily_highs = {}
    daily_lows = {}
    daily_averages = {}

    for date_key in all_dates:
        prices_for_date = []

        # Collect prices for this date across all available years
        for year, daily_prices in historical_data.items():
            if date_key in daily_prices:
                prices_for_date.append(daily_prices[date_key])

        if prices_for_date:
            daily_highs[date_key] = max(prices_for_date)
            daily_lows[date_key] = min(prices_for_date)
            daily_averages[date_key] = sum(prices_for_date) / len(prices_for_date)
        else:
            daily_highs[date_key] = None
            daily_lows[date_key] = None
            daily_averages[date_key] = None

    # Convert to ordered lists
    dates = all_dates
    highs = [daily_highs[date] for date in dates]
    lows = [daily_lows[date] for date in dates]
    averages = [daily_averages[date] for date in dates]

    return {
        'dates': dates,
        'high': highs,
        'low': lows,
        'average': averages
    }

@app.route('/api/monthly-volume-data')
def api_monthly_volume_data():
    """API endpoint to get monthly volume analysis data"""
    location_code = request.args.get('location', 'SLAHH')

    # Get last 13+ months of data to ensure complete months
    end_date = datetime.now()

    # Go back to first day of the month 13 months ago
    current_month = end_date.replace(day=1)
    start_month = current_month
    for _ in range(13):  # Go back 13 months to ensure we get full months
        if start_month.month == 1:
            start_month = start_month.replace(year=start_month.year - 1, month=12)
        else:
            start_month = start_month.replace(month=start_month.month - 1)

    start_date_str = start_month.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')

    # Get data from database
    data = db.get_price_data(location_code, start_date_str, end_date_str)

    if not data:
        return jsonify({'error': 'No data found'}), 404

    # Calculate monthly aggregations
    monthly_stats = calculate_monthly_volumes(data)

    location_name = data[0]['location_name'] if data else "Unknown"
    region_name = data[0]['region_name'] if data else "Unknown"

    response_data = {
        'location_name': location_name,
        'region_name': region_name,
        'monthly_data': monthly_stats,
        'total_records': len(data),
        'date_range': {
            'start': start_date_str,
            'end': end_date_str
        }
    }

    return jsonify(response_data)

def calculate_monthly_volumes(data):
    """Calculate monthly volume statistics from daily data"""
    monthly_volumes = {}

    for record in data:
        trade_date = datetime.strptime(record['trade_date'], '%Y-%m-%d')
        month_key = trade_date.strftime('%Y-%m')
        volume = record['volume'] or 0
        deals = record['deals'] or 0

        if month_key not in monthly_volumes:
            monthly_volumes[month_key] = {
                'year': trade_date.year,
                'month': trade_date.month,
                'month_name': trade_date.strftime('%B'),
                'total_volume': 0,
                'total_deals': 0,
                'trading_days': 0,
                'daily_volumes': []
            }

        monthly_volumes[month_key]['total_volume'] += volume
        monthly_volumes[month_key]['total_deals'] += deals
        monthly_volumes[month_key]['trading_days'] += 1
        monthly_volumes[month_key]['daily_volumes'].append(volume)

    # Calculate averages and format for chart
    monthly_stats = []
    for month_key in sorted(monthly_volumes.keys()):
        month_data = monthly_volumes[month_key]
        daily_avg_volume = (month_data['total_volume'] / month_data['trading_days']
                           if month_data['trading_days'] > 0 else 0)

        monthly_stats.append({
            'month_key': month_key,
            'year': month_data['year'],
            'month': month_data['month'],
            'month_name': month_data['month_name'],
            'display_name': f"{month_data['month_name'][:3]} {month_data['year']}",
            'total_volume': month_data['total_volume'],
            'total_deals': month_data['total_deals'],
            'trading_days': month_data['trading_days'],
            'daily_avg_volume': round(daily_avg_volume, 0)
        })

    return monthly_stats

@app.route('/api/locations')
def api_locations():
    """API endpoint to get available locations"""
    locations = db.get_available_locations()
    return jsonify(locations)

@app.route('/api/stats')
def api_stats():
    """API endpoint to get database statistics"""
    stats = db.get_database_stats()
    return jsonify(stats)

@app.route('/api/locations-status')
def api_locations_status():
    """API endpoint to get status of all locations"""
    try:
        locations_status = get_locations_status()

        # Add record count for each location
        for location in locations_status:
            location_code = location['point_code']
            with sqlite3.connect(db.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT COUNT(*)
                    FROM price_data
                    WHERE point_code = ?
                ''', (location_code,))
                result = cursor.fetchone()
                location['record_count'] = result[0] if result else 0

        return jsonify({'locations': locations_status})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/location/<location_code>')
def location_detail(location_code):
    """Detailed view for a specific location"""
    # Get date range for this location
    date_range = db.get_date_range(location_code)

    # Get recent data for preview
    recent_data = db.get_price_data(location_code, limit=10)

    if not recent_data:
        return f"No data found for location {location_code}", 404

    location_info = {
        'code': location_code,
        'name': recent_data[0]['location_name'],
        'region': recent_data[0]['region_name'],
        'date_range': date_range
    }

    return render_template('location_detail.html',
                         location=location_info,
                         recent_data=recent_data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)