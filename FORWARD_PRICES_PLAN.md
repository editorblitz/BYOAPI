# Forward Prices Implementation Plan

## Overview
Build a comprehensive Forward Prices section that matches the Spot Prices layout with tabbed interface, chart visualization, data table, and activity log.

---

## API Understanding

### Forward Data API Response Structure

When calling `/forwardDatafeed.json?issue_date=2024-01-28`, the response is:

```javascript
{
  "meta": {
    "trade_date": "2024-01-27",  // trade date is issue_date - 1 business day
    "issue_date": "2024-01-28"
  },
  "data": {
    "SLAHH": {  // pointcode as key
      "Location": "Henry Hub",
      "Contracts": ["2024-02-01", "2024-03-01", "2024-04-01", ...],  // YYYY-MM-DD format
      "Fixed Prices": [2.50, 2.55, 2.60, ...],  // parallel array
      "Basis Prices": [0.00, 0.02, 0.03, ...]   // parallel array (differential to NYMEX)
    },
    "CALSCG": {
      "Location": "SoCal Citygate",
      "Contracts": ["2024-02-01", "2024-03-01", ...],
      "Fixed Prices": [3.50, 3.55, ...],
      "Basis Prices": [1.00, 1.02, ...]
    }
    // ... all other locations
  }
}
```

### Key API Insights

1. ✅ **Both Fixed and Basis prices returned in ONE call**
   - No need for separate API calls or parameters
   - Toggle is just which array we display

2. ✅ **All locations returned at once**
   - Single API call gets entire market for that date
   - Filter by location on frontend/backend

3. ✅ **Contract format is `YYYY-MM-DD`** (first of month)
   - Display as "Jan 2024" or "Feb 2025"

4. ✅ **For multiple trade dates**: Make N API calls, merge the curves

### Available Endpoints

- `/forwardDatafeed.json` - Get full curve for all locations on specific date
  - Parameters: `issue_date` (YYYY-MM-DD)
  - Returns: All locations, all contracts, both fixed and basis

- `/forwardHistoricalData.json` - Get specific contract over time
  - Parameters: `start_date`, `end_date`, `location`, `contract`
  - Useful for "By Contract" mode

- `/forwardLocations` - Get list of available forward locations
  - Use to populate location dropdowns

---

## Three Modes Explained

### Mode 1: Single Price
**Purpose:** View one location's forward curve across multiple trade dates (compare how the curve shifted)

**Inputs:**
- Price Type: Fixed or Basis
- Location: Single select (e.g., Henry Hub)
- Trade Dates: Multiple dates (e.g., Jan 15, Jan 22, Jan 29)

**Chart:**
- X-axis: Contract months (Feb 2024, Mar 2024, Apr 2024, ...)
- Y-axis: Price ($/MMBtu)
- Series: One line per trade date (3 lines if 3 dates selected)

**Use Case:** "How did Henry Hub's forward curve change over the past 3 weeks?"

---

### Mode 2: Multi-Price
**Purpose:** Compare multiple locations' forward curves on a single trade date

**Inputs:**
- Price Type: Fixed or Basis
- Trade Date: Single date
- Locations: Multiple locations (e.g., Henry Hub, SoCal, Chicago)

**Chart:**
- X-axis: Contract months (Feb 2024, Mar 2024, Apr 2024, ...)
- Y-axis: Price ($/MMBtu)
- Series: One line per location (3 lines if 3 locations selected)

**Use Case:** "What did the forward curves look like for multiple markets on Jan 15?"

---

### Mode 3: By Contract
**Purpose:** Track a specific contract month's price over time for multiple locations

**Inputs:**
- Price Type: Fixed or Basis
- Contract Month: Single month (e.g., "Jan 2027")
- Date Range: Start and end trade dates
- Locations: Multiple locations

**Chart:**
- X-axis: Trade dates (Jan 1, Jan 8, Jan 15, ...)
- Y-axis: Price ($/MMBtu)
- Series: One line per location showing that contract's evolution

**Use Case:** "How did the January 2027 contract price change over the past 6 months for multiple locations?"

---

## Implementation Plan

### Phase 1: Backend - Data Routes

**File: `data_routes/forward_prices.py`** (rename from `strips.py`)

#### 1.1 Update Blueprint and Routes
```python
forward_prices_bp = Blueprint('forward_prices', __name__)

@forward_prices_bp.route('/forward-prices')
@require_api_creds
def forward_prices_page():
    return render_template('forward_prices.html')

@forward_prices_bp.route('/api/forward-prices')
@require_api_creds
def api_forward_prices():
    mode = request.args.get('mode', 'single_price')
    price_type = request.args.get('price_type', 'fixed')

    if mode == 'single_price':
        # ...
    elif mode == 'multi_price':
        # ...
    elif mode == 'by_contract':
        # ...
```

#### 1.2 Data Fetching Functions

```python
def fetch_forward_curve(issue_date):
    """
    Fetch full forward curve for ALL locations on a specific date.

    Args:
        issue_date: Date in YYYY-MM-DD format

    Returns:
        NGI API response with meta and data
    """
    params = {'issue_date': issue_date}
    return ngi_request('forwardDatafeed.json', params=params)

def fetch_forward_locations():
    """Fetch available forward locations from API"""
    return ngi_request('forwardLocations')
```

#### 1.3 Mode Processing Functions

```python
def process_single_price_view(location_code, issue_dates, price_type='fixed'):
    """
    Show one location's curves across multiple trade dates.

    Args:
        location_code: e.g., 'SLAHH'
        issue_dates: list like ['2024-01-15', '2024-01-22']
        price_type: 'fixed' or 'basis'

    Returns:
        {
            'dates': ['Feb 2024', 'Mar 2024', ...],  # contract months
            'series': [
                {'name': 'Jan 15 2024', 'data': [2.50, 2.55, ...]},
                {'name': 'Jan 22 2024', 'data': [2.52, 2.57, ...]}
            ],
            'table_columns': [...],
            'table_rows': [...],
            'raw_records': [...]
        }
    """
    price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

    curves = []
    all_contracts = set()

    for issue_date in issue_dates:
        data = fetch_forward_curve(issue_date)
        location_data = data['data'].get(location_code, {})

        curves.append({
            'issue_date': issue_date,
            'trade_date': data['meta'].get('trade_date'),
            'contracts': location_data.get('Contracts', []),
            'prices': location_data.get(price_field, [])
        })

        all_contracts.update(location_data.get('Contracts', []))

    # Sort contracts and format
    sorted_contracts = sorted(list(all_contracts))
    formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

    # Build series
    series = []
    for curve in curves:
        contract_price_map = dict(zip(curve['contracts'], curve['prices']))
        series_data = [contract_price_map.get(c) for c in sorted_contracts]

        series.append({
            'name': format_trade_date_label(curve['trade_date']),
            'type': 'line',
            'data': series_data,
            'symbol': 'none',
            'showSymbol': False
        })

    # Build table...
    # Return structure
```

```python
def process_multi_price_view(location_codes, issue_date, price_type='fixed'):
    """
    Show multiple locations' curves for one trade date.

    Returns same structure as single_price but with series per location
    """
    price_field = 'Fixed Prices' if price_type == 'fixed' else 'Basis Prices'

    data = fetch_forward_curve(issue_date)

    # Find union of all contracts across locations
    all_contracts = set()
    for code in location_codes:
        location_data = data['data'].get(code, {})
        all_contracts.update(location_data.get('Contracts', []))

    sorted_contracts = sorted(list(all_contracts))
    formatted_contracts = [format_contract_month(c) for c in sorted_contracts]

    # Build series
    series = []
    for code in location_codes:
        location_data = data['data'].get(code, {})
        contract_price_map = dict(zip(
            location_data.get('Contracts', []),
            location_data.get(price_field, [])
        ))

        series_data = [contract_price_map.get(c) for c in sorted_contracts]

        series.append({
            'name': location_data.get('Location', code),
            'type': 'line',
            'data': series_data,
            'symbol': 'none',
            'showSymbol': False
        })

    # Return structure
```

```python
def process_by_contract_view(contract_month, location_codes, start_date, end_date, price_type='fixed'):
    """
    Show one contract month's price evolution over time.

    Args:
        contract_month: e.g., '2025-01-01'
        location_codes: list of locations
        start_date, end_date: trade date range
        price_type: 'fixed' or 'basis'

    Returns:
        {
            'dates': ['2024-01-15', '2024-01-22', ...],  # trade dates
            'series': [
                {'name': 'Henry Hub', 'data': [2.50, 2.52, ...]},
                {'name': 'SoCal', 'data': [3.50, 3.55, ...]}
            ],
            ...
        }
    """
    # Use /forwardHistoricalData.json for each location
    # OR: make multiple calls to /forwardDatafeed.json and extract specific contract

    # Implementation depends on API endpoint availability
```

#### 1.4 Helper Functions

```python
def format_contract_month(contract_date):
    """Convert '2024-02-01' -> 'Feb 2024'"""
    if not contract_date:
        return 'N/A'
    year, month, _ = contract_date.split('-')
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return f"{month_names[int(month) - 1]} {year}"

def format_trade_date_label(trade_date):
    """Convert '2024-01-15' -> 'Jan 15 2024'"""
    if not trade_date:
        return 'Unknown'
    year, month, day = trade_date.split('-')
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return f"{month_names[int(month) - 1]} {int(day)} {year}"

def filter_contracts_by_year(contracts, max_year=2030):
    """Filter contracts to only show through specified year"""
    return [c for c in contracts if int(c.split('-')[0]) <= max_year]
```

---

### Phase 2: Frontend - HTML Template

**File: `templates/forward_prices.html`** (rename from `strips.html`)

#### 2.1 Layout Structure (mirror `daily_prices.html`)
- Sidebar (left): 320px fixed width with tabs and controls
- Main content (center): Chart container (~66% width)
- Data table: Full width below
- Activity log: Fixed bottom drawer

#### 2.2 Sidebar Components

**Tab Buttons:**
```html
<div class="flex border-b border-gray-300 bg-gray-100">
    <button data-mode="single_price" class="mode-tab ...">Single Price</button>
    <button data-mode="multi_price" class="mode-tab ...">Multi-Price</button>
    <button data-mode="by_contract" class="mode-tab ...">By Contract</button>
</div>
```

**Price Type Toggle (shared across all modes):**
```html
<div class="price-type-selector">
    <label class="text-xs font-semibold uppercase mb-1">Price Type</label>
    <div class="flex gap-2">
        <label class="flex items-center">
            <input type="radio" name="priceType" value="fixed" checked>
            <span>Fixed Price</span>
        </label>
        <label class="flex items-center">
            <input type="radio" name="priceType" value="basis">
            <span>Basis</span>
        </label>
    </div>
</div>
```

**Single Price Mode Controls:**
```html
<div id="singlePriceSection">
    <label>Location</label>
    <select id="singleLocationSelect"></select>

    <label>Trade Dates</label>
    <input type="date" id="tradeDateInput">
    <button id="addTradeDateBtn">+ Add Date</button>

    <div id="tradeDatesList">
        <!-- List of selected dates with remove buttons -->
    </div>
</div>
```

**Multi-Price Mode Controls:**
```html
<div id="multiPriceSection" class="hidden">
    <label>Trade Date</label>
    <input type="date" id="multiTradeDate">

    <label>Locations</label>
    <select id="regionSelectMulti"></select>
    <select id="locationSelectMulti"></select>
    <button id="addLocationBtn">+ Add Location</button>

    <div id="locationsList">
        <!-- List of selected locations with remove buttons -->
    </div>
</div>
```

**By Contract Mode Controls:**
```html
<div id="byContractSection" class="hidden">
    <label>Contract Month</label>
    <select id="contractMonthSelect">
        <!-- Populated with Jan 2025, Feb 2025, ... Dec 2030 -->
    </select>

    <label>Date Range</label>
    <input type="date" id="contractStartDate">
    <input type="date" id="contractEndDate">

    <label>Locations</label>
    <select id="regionSelectContract"></select>
    <select id="locationSelectContract"></select>
    <button id="addContractLocationBtn">+ Add Location</button>

    <div id="contractLocationsList">
        <!-- List of selected locations -->
    </div>
</div>
```

**Submit Button:**
```html
<button id="analyzeBtn" class="w-full bg-gray-900 ...">Submit</button>
```

#### 2.3 Chart Container
```html
<div class="flex-1 flex flex-col gap-4">
    <div class="bg-white p-6 border">
        <div class="mb-6">
            <h3 id="chartTitle" class="text-xl font-bold">Forward Prices</h3>
            <p id="chartSubtitle" class="text-sm text-gray-600">Select parameters to begin</p>
            <div id="customLegend" class="flex gap-6 text-xs font-medium"></div>
        </div>
        <div id="chartContainer" class="w-full h-[400px]"></div>
    </div>
</div>
```

#### 2.4 Data Table
```html
<div class="mt-4 px-4">
    <div class="bg-white border">
        <div class="px-4 py-2 border-b bg-gray-100 flex justify-between">
            <h3 class="font-semibold">Data Table</h3>
            <button id="copyTableBtn">Copy Table</button>
        </div>
        <div class="overflow-auto max-h-96">
            <table class="w-full">
                <thead id="tableHeaderRow"></thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>
    </div>
</div>
```

#### 2.5 Activity Log (exact copy from daily_prices.html)
```html
<div class="fixed bottom-0 left-0 right-0 z-40">
    <div id="logDrawer" class="bg-gray-900 border-t h-0 overflow-hidden">
        <div id="logContent" class="h-64 p-4 font-mono text-xs overflow-y-auto"></div>
    </div>
    <button id="logToggle" class="w-full bg-gray-800 h-8 flex items-center justify-between px-4">
        <div class="flex items-center gap-3">
            <div id="statusDot" class="w-2 h-2 bg-green-500"></div>
            <span id="statusLabel">Ready</span>
            <span id="lastLogMsg">System ready</span>
        </div>
        <svg id="logArrow">...</svg>
    </button>
</div>
```

---

### Phase 3: Frontend - JavaScript

**File: `static/js/forward_prices.js`**

#### 3.1 App State Object
```javascript
const App = {
    state: {
        mode: 'single_price',
        priceType: 'fixed',
        chartInstance: null,
        rawRecords: [],
        hiddenSeries: new Set(),
        yAxisZoomEnabled: false,

        // Single Price mode
        singleLocation: 'SLAHH',
        tradeDates: [],

        // Multi-Price mode
        multiTradeDate: '',
        multiLocations: [],

        // By Contract mode
        contractMonth: '',
        contractDateRange: {start: '', end: ''},
        contractLocations: [],

        // Location database
        locations: {}
    }
}
```

#### 3.2 Initialization
```javascript
init: function() {
    this.setupDates();
    this.setupContractMonths();
    this.loadLocations();
    this.bindEvents();
    this.setMode('single_price');
    this.setSystemStatus('ready');
    this.log('System initialized.');
}
```

#### 3.3 Mode Switching
```javascript
setMode: function(mode) {
    this.state.mode = mode;
    this.log(`Switched to [${mode.toUpperCase()}] mode.`);

    // Show/hide appropriate sections
    document.getElementById('singlePriceSection').classList.toggle('hidden', mode !== 'single_price');
    document.getElementById('multiPriceSection').classList.toggle('hidden', mode !== 'multi_price');
    document.getElementById('byContractSection').classList.toggle('hidden', mode !== 'by_contract');

    // Update tab styles
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.classList.toggle('border-b-2', btn.dataset.mode === mode);
    });
}
```

#### 3.4 API Call
```javascript
analyze: async function() {
    const mode = this.state.mode;
    const priceType = this.state.priceType;

    const params = new URLSearchParams();
    params.append('mode', mode);
    params.append('price_type', priceType);

    if (mode === 'single_price') {
        params.append('location', this.state.singleLocation);
        this.state.tradeDates.forEach(date => {
            params.append('issue_dates[]', date);
        });
    } else if (mode === 'multi_price') {
        params.append('issue_date', this.state.multiTradeDate);
        this.state.multiLocations.forEach(loc => {
            params.append('locations[]', loc.code);
        });
    } else if (mode === 'by_contract') {
        params.append('contract', this.state.contractMonth);
        params.append('start_date', this.state.contractDateRange.start);
        params.append('end_date', this.state.contractDateRange.end);
        this.state.contractLocations.forEach(loc => {
            params.append('locations[]', loc.code);
        });
    }

    const res = await fetch(`/api/forward-prices?${params.toString()}`);
    const data = await res.json();

    this.renderChart(data);
    this.renderTable(data);
}
```

#### 3.5 Chart Rendering
```javascript
renderChart: function(data) {
    if (!this.state.chartInstance) {
        this.state.chartInstance = echarts.init(document.getElementById('chartContainer'));
    }

    this.state.chartInstance.clear();
    this.updateChartHeader(data);
    this.updateCustomLegend(data);

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                // Format tooltip
            }
        },
        legend: {show: false},
        grid: {left: 50, right: 60, bottom: 50, top: 20},
        xAxis: {
            type: 'category',
            data: data.dates,
            axisLabel: {rotate: 45}
        },
        yAxis: {
            type: 'value',
            scale: true,
            position: 'right',
            axisLabel: {formatter: (v) => `$${v.toFixed(2)}`}
        },
        series: data.series.map(s => ({
            ...s,
            lineStyle: {width: 2},
            smooth: false
        }))
    };

    this.state.chartInstance.setOption(option);
}
```

---

### Phase 4: Styling

**Option 1:** Reuse `static/css/daily_prices_pro.css` (minimal changes)

**Option 2:** Create `static/css/forward_prices.css` if significant customization needed

Key styles needed:
- Price type radio button styling
- Trade date/location list items with remove buttons
- Contract month dropdown

---

### Phase 5: Integration

#### 5.1 Update `app.py`
```python
from data_routes.forward_prices import forward_prices_bp

app.register_blueprint(forward_prices_bp)
```

#### 5.2 Update `templates/base.html`
```html
<a href="{{ url_for('forward_prices.forward_prices_page') }}">Forward Prices</a>
```

---

## Implementation Questions & Decisions

### Q1: Date selection UI for Single Price mode
**Answer:** Date picker + "Add Date" button → list of selected dates (more flexible)

### Q2: Contract month range
**Answer:** Filter to show ~5 years forward (60 contracts max), configurable

### Q3: By Contract mode - Date granularity
**Answer:** All available trade dates in range, add optional weekly grouping later

### Q4: Location source
**Answer:** Call `/forwardLocations` once on page load to get accurate forward market locations

### Q5: File naming
**Answer:** Rename to `forward_prices.*` for clarity

---

## Testing Checklist

- [ ] Single Price mode: Multiple dates for one location displays correctly
- [ ] Multi-Price mode: Multiple locations for one date displays correctly
- [ ] By Contract mode: Contract time series works
- [ ] Price Type toggle: Switching between fixed/basis updates data
- [ ] Chart: Series visibility toggle works
- [ ] Chart: Y-axis zoom toggle works
- [ ] Table: Copy function works
- [ ] Log: Activity log tracks actions
- [ ] Edge cases: No data, API errors, invalid selections
- [ ] UI: Loading states, error messages, responsive behavior

---

## File Checklist

- [ ] `data_routes/forward_prices.py` - Backend routes
- [ ] `templates/forward_prices.html` - 3 tabs + price type toggle
- [ ] `static/js/forward_prices.js` - Mode switching, API calls
- [ ] `static/css/forward_prices.css` (optional) - Custom styles
- [ ] `app.py` - Blueprint registration
- [ ] `templates/base.html` - Nav update

---

## API Endpoints Summary

| Endpoint | Purpose | Parameters |
|----------|---------|------------|
| `/forwardDatafeed.json` | Get full curve for all locations | `issue_date` |
| `/forwardHistoricalData.json` | Get specific contract over time | `start_date`, `end_date`, `location`, `contract` |
| `/forwardLocations` | Get available locations | None |

---

## Color Palette

Reuse from daily_prices: `['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be123c']`
