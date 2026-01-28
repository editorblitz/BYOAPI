/**
 * Fixed Forward Spread Dashboard - Grid of forward spread charts with quick timeframe buttons
 */

const ForwardSpreadDashboard = {
    charts: [],
    nextChartId: 0,
    currentDatePickerChart: null,
    resizeListenerAdded: false,
    logOpen: false,

    // Logging functions
    log: function(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const lastLogMsg = document.getElementById('lastLogMsg');
        if (!logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: 'text-gray-300',
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400'
        };

        const entry = document.createElement('div');
        entry.className = `${colors[type] || colors.info} mb-1`;
        entry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;

        if (lastLogMsg) {
            lastLogMsg.textContent = message.replace(/<[^>]*>/g, '');
        }
    },

    setStatus: function(status, label) {
        const statusDot = document.getElementById('statusDot');
        const statusLabel = document.getElementById('statusLabel');

        const colors = {
            ready: 'bg-green-500',
            loading: 'bg-yellow-500',
            error: 'bg-red-500'
        };

        if (statusDot) {
            statusDot.className = `w-2 h-2 rounded-full ${colors[status] || colors.ready}`;
        }
        if (statusLabel) {
            statusLabel.textContent = label || status.toUpperCase();
        }
    },

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if (logToggle && logDrawer) {
            logToggle.addEventListener('click', () => {
                this.logOpen = !this.logOpen;
                if (this.logOpen) {
                    logDrawer.classList.remove('h-0');
                    logDrawer.classList.add('h-64');
                    if (logArrow) logArrow.style.transform = 'rotate(180deg)';
                } else {
                    logDrawer.classList.remove('h-64');
                    logDrawer.classList.add('h-0');
                    if (logArrow) logArrow.style.transform = 'rotate(0deg)';
                }
            });
        }
    },

    // Location database (same as daily_prices.js)
    locations: {
        'Favorites': [
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Cheyenne Hub', value: 'RMTCHEY' },
            { name: 'SoCal Citygate', value: 'CALSCG' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' }
        ],
        'South Texas': [
            { name: 'Agua Dulce', value: 'STXAGUAD' },
            { name: 'Florida Gas Zone 1', value: 'STXFGTZ1' },
            { name: 'NGPL S. TX', value: 'STXNGPL' },
            { name: 'Tennessee Zone 0 South', value: 'STXTENN' },
            { name: 'Texas Eastern S. TX', value: 'STXTETCO' },
            { name: 'Transco Zone 1', value: 'STXST30' },
            { name: 'Tres Palacios', value: 'STX3PAL' },
            { name: 'S. TX Regional Avg.', value: 'STXRAVG' }
        ],
        'East Texas': [
            { name: 'Atmos Zone 3', value: 'ETXATMOSZ3' },
            { name: 'Carthage', value: 'ETXCARTH' },
            { name: 'Golden Triangle Storage', value: 'ETXGLDTRI' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'Moss Bluff', value: 'ETXMBSF' },
            { name: 'NGPL TexOk', value: 'ETXNGPL' },
            { name: 'Tennessee Zone 0 North', value: 'ETXTENN' },
            { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
            { name: 'Tolar Hub', value: 'OTHTOLAR' },
            { name: 'Transco Zone 2', value: 'ETXST45' },
            { name: 'E. TX Regional Avg.', value: 'ETXRAVG' }
        ],
        'West Texas': [
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'El Paso - Keystone Pool', value: 'WTXEPKEY' },
            { name: 'El Paso - Plains Pool', value: 'WTXEPPL' },
            { name: 'El Paso - Waha Pool', value: 'WTXEPWAHA' },
            { name: 'Northern Natural Gas 1-7', value: 'WTXNNG' },
            { name: 'Oneok WesTex', value: 'WTXONEOK' },
            { name: 'Transwestern', value: 'WTXTW' },
            { name: 'Transwestern - Central', value: 'WTXTWCENT' },
            { name: 'Transwestern - W. TX', value: 'WTXTWOTH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'W. TX/SE NM Regional Avg.', value: 'WTXRAVG' }
        ],
        'Midwest': [
            { name: 'Alliance', value: 'MCWALL' },
            { name: 'ANR ML7', value: 'MCWML7' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Chicago - Nicor Gas', value: 'MCWCCNICOR' },
            { name: 'Chicago - NIPSCO', value: 'MCWCCNIPS' },
            { name: 'Chicago - North Shore', value: 'MCWCCNSHOR' },
            { name: 'Chicago - Peoples', value: 'MCWCCPEOP' },
            { name: 'Consumers Energy', value: 'MCWCONS' },
            { name: 'Dawn', value: 'MCWDAWN' },
            { name: 'Defiance', value: 'MCWDEFIANCE' },
            { name: 'Rover-ANR', value: 'MCWROVANR' },
            { name: 'Rover-Panhandle', value: 'MCWROVPEPL' },
            { name: 'Emerson', value: 'MCWEMER' },
            { name: 'Joliet', value: 'MCWJOL' },
            { name: 'Lebanon', value: 'NEALEB' },
            { name: 'Michigan Consolidated', value: 'MCWMCON' },
            { name: 'NGPL Amarillo Mainline', value: 'MCWNGPLAM' },
            { name: 'NGPL Iowa-Illinois', value: 'MCWNGPLIOI' },
            { name: 'NGPL MidAmerican', value: 'MCWNGPLMIDAM' },
            { name: 'Parkway/Union', value: 'MCWPARKWAY' },
            { name: 'REX Zone 3 Delivered', value: 'OTHREXZN3DEL' },
            { name: 'REX into ANR - Shelby', value: 'MCWREXANR' },
            { name: 'REX into MGT - Edgar', value: 'MCWREXMGT' },
            { name: 'REX into NGPL - Moultrie', value: 'MCWREXNGPL' },
            { name: 'REX into PEPL - Putnam', value: 'MCWREXPEPL' },
            { name: 'REX into Trunk - Douglas', value: 'MCWREXTRNK' },
            { name: 'Midwest Regional Avg.', value: 'MWERAVG' }
        ],
        'Midcontinent': [
            { name: 'ANR SW', value: 'MCWANR' },
            { name: 'El Paso Anadarko', value: 'MCWEPANDKO' },
            { name: 'Enable East', value: 'MCWNORE' },
            { name: 'NGPL Midcontinent', value: 'MCWNGPL' },
            { name: 'Northern Natural Demarc', value: 'MCWDMARK' },
            { name: 'OGT', value: 'MCWONG' },
            { name: 'Panhandle Eastern', value: 'MCWPEPL' },
            { name: 'Southern Star', value: 'MCWWILL' },
            { name: 'Ventura', value: 'OTHVENTURA' },
            { name: 'Northern Border Ventura', value: 'MCWNBVENT' },
            { name: 'Northern Natural Ventura', value: 'MCWVENT' },
            { name: 'Midcontinent Regional Avg.', value: 'MCTRAVG' }
        ],
        'North Louisiana': [
            { name: 'Enable South', value: 'NLACPTS' },
            { name: 'NGPL Gulf Coast Mainline', value: 'NLANGPLGULFML' },
            { name: 'Perryville', value: 'NLAPERRY' },
            { name: 'Texas Eastern, M1, 24', value: 'ALATETM124' },
            { name: 'Texas Gas Zone 1', value: 'ETXTGT' },
            { name: 'Trunkline Zone 1A', value: 'OTHTRNK1A' },
            { name: 'N. LA Regional Avg.', value: 'NLARAVG' }
        ],
        'South Louisiana': [
            { name: 'ANR SE', value: 'SLAANRSE' },
            { name: 'Bobcat Storage', value: 'STGBOBCAT' },
            { name: 'Columbia Gulf Mainline', value: 'SLACGMAIN' },
            { name: 'Columbia Gulf onshore', value: 'SLACGO' },
            { name: 'Egan Hub', value: 'STGEGAN' },
            { name: 'Florida Gas Zone 2', value: 'SLAFGTZ2' },
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Pine Prairie', value: 'SLAPPSF' },
            { name: 'Southern Natural', value: 'SLASONAT' },
            { name: 'Tennessee Line 500', value: 'SLAT500' },
            { name: 'Tennessee Line 800', value: 'SLAT800' },
            { name: 'Texas Eastern E. LA', value: 'SLATETCOE' },
            { name: 'Texas Eastern W. LA', value: 'SLATETCOW' },
            { name: 'Transco Zone 3 non-St. 65', value: 'SLANONST65' },
            { name: 'Transco Zone 3 St. 65', value: 'SLAST65' },
            { name: 'Trunkline E. LA', value: 'SLATRNKE' },
            { name: 'Trunkline W. LA', value: 'SLATRNKW' },
            { name: 'S. LA Regional Avg.', value: 'SLARAVG' }
        ],
        'Southeast': [
            { name: 'Cove Point', value: 'NEACOVE' },
            { name: 'FGT Citygate', value: 'FLAFGT' },
            { name: 'Florida Gas Zone 3', value: 'SLAFGTZ3' },
            { name: 'Southern Pines', value: 'ALASPSF' },
            { name: 'Tenn Zone 1 100L', value: 'ALATENN1L100' },
            { name: 'Tenn Zone 1 non-St. 87', value: 'SETENN1OTH' },
            { name: 'Tenn Zone 1 St. 87', value: 'SETENN1ST87' },
            { name: 'Texas Eastern M-1, 30', value: 'ALATETM1' },
            { name: 'Transco Zone 4', value: 'ALAST85' },
            { name: 'Transco Zone 5', value: 'NEATRANZ5' },
            { name: 'Transco Zone 5 North', value: 'NEATZ5WGL' },
            { name: 'Transco Zone 5 South', value: 'NEATZ5NWGL' },
            { name: 'Southeast Regional Avg.', value: 'SEREGAVG' }
        ],
        'Appalachia': [
            { name: 'Columbia Gas', value: 'NEATCO' },
            { name: 'Eastern Gas North', value: 'NEACNGNP' },
            { name: 'Eastern Gas South', value: 'NEACNG' },
            { name: 'Millennium East Pool', value: 'NEAMILL' },
            { name: 'Tenn Zone 4 200L', value: 'NEATENN4L200' },
            { name: 'Tennessee Zn 4 313 Pool', value: 'NEATENN4313P' },
            { name: 'Tennessee Zn 4 Marcellus', value: 'NEATENN4MAR' },
            { name: 'Texas Eastern M-2, 30 Receipt', value: 'NEATETM2REC' },
            { name: 'Texas Eastern M-3, Delivery', value: 'NEATETM3DEL' },
            { name: 'Transco-Leidy Line', value: 'NEALEIDYT' },
            { name: 'Appalachia Regional Avg.', value: 'APPREGAVG' }
        ],
        'Northeast': [
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Algonquin Citygate (non-G)', value: 'NEALGNG' },
            { name: 'Algonquin Receipts', value: 'NEAALGIN' },
            { name: 'Dracut', value: 'NEADRACUT' },
            { name: 'Iroquois Zone 1', value: 'NEAIROZ1' },
            { name: 'Iroquois Zone 2', value: 'NEAIRO' },
            { name: 'Iroquois, Waddington', value: 'NEAIROWAD' },
            { name: 'Maritimes & Northeast', value: 'NEAMNP' },
            { name: 'Niagara', value: 'MCWNIAGR' },
            { name: 'PNGTS', value: 'NEAPNGTS' },
            { name: 'E Hereford/Pittsburg', value: 'NEAEHPITT' },
            { name: 'PNGTS Non-Border', value: 'NEAPNGTSNBDR' },
            { name: 'Tenn Zone 5 200L', value: 'NEATENN5L200' },
            { name: 'Tenn Zone 5 200L East', value: 'NEATENNZ5E' },
            { name: 'Tenn Zone 5 200L West', value: 'NEATENNZ5W' },
            { name: 'Tenn Zone 6 200L', value: 'NEATENN6L200' },
            { name: 'Tenn Zone 6 200L North', value: 'NEATENNZ6N' },
            { name: 'Tenn Zone 6 200L South', value: 'NEATENNZ6S' },
            { name: 'Transco Zone 6 non-NY', value: 'NEATZ6NNY' },
            { name: 'Transco Zone 6 NY', value: 'NEATZ6NY' },
            { name: 'Northeast Regional Avg.', value: 'NEARAVG' }
        ],
        'Rockies': [
            { name: 'Cheyenne Hub', value: 'RMTCHEY' },
            { name: 'CIG', value: 'RMTCIG' },
            { name: 'CIG DJ Basin', value: 'RMTCIGDJ' },
            { name: 'El Paso Bondad', value: 'RMTEPBON' },
            { name: 'El Paso San Juan', value: 'RMTEPSJ' },
            { name: 'Kingsgate', value: 'RMTKING' },
            { name: 'KRGT Rec Pool', value: 'RMTKR' },
            { name: 'Northwest S. of Green River', value: 'RMTNWSGR' },
            { name: 'Northwest Sumas', value: 'RMTSUMAS' },
            { name: 'Northwest Wyoming Pool', value: 'RMTNWW' },
            { name: 'Opal', value: 'RMTOPAL' },
            { name: 'Questar', value: 'RMTQUEST' },
            { name: 'Ruby - Receipts', value: 'RMTRUBYR' },
            { name: 'Stanfield', value: 'RMTSTAN' },
            { name: 'Transwestern San Juan', value: 'RMTTWSJ' },
            { name: 'White River Hub', value: 'RMTWHITERVR' },
            { name: 'Rocky Mtns. Regional Avg.', value: 'RMTRAVG' }
        ],
        'Arizona/Nevada': [
            { name: 'El Paso S. Mainline/N. Baja', value: 'ARNBAJAN' },
            { name: 'KRGT Del Pool', value: 'ARNKERNDEL' }
        ],
        'California': [
            { name: 'Malin', value: 'CALM400' },
            { name: 'PG&E Citygate', value: 'CALPGCG' },
            { name: 'SoCal Citygate', value: 'CALSCG' },
            { name: 'Southern Border, PG&E', value: 'CALSPGE' },
            { name: 'SoCal Border Avg.', value: 'CALSAVG' },
            { name: 'SoCal Border - Blythe', value: 'CALSAVGBLY' },
            { name: 'SoCal Border - Ehrenberg', value: 'CALSAVGEH' },
            { name: 'SoCal Border - Kern River Station', value: 'CALSAVGKRS' },
            { name: 'SoCal Border - Kramer', value: 'CALSAVGKR' },
            { name: 'SoCal Border - Needles', value: 'CALSAVGNE' },
            { name: 'SoCal Border - Topock', value: 'CALSAVGTPK' },
            { name: 'SoCal Border - Wheeler Ridge', value: 'CALSAVGWR' },
            { name: 'California Regional Avg.', value: 'CALRAVG' }
        ],
        'Canada': [
            { name: 'Alliance (APC) - ATP', value: 'CDNCREC' },
            { name: 'Empress', value: 'CDNEMP' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' },
            { name: 'Westcoast Station 2', value: 'CDNWST2' }
        ]
    },

    // Default spread pairs - regional spreads (no Henry Hub since that's just basis)
    defaultSpreads: [
        { loc1: 'NEAALGCG', loc2: 'MCWCCITY' },  // Northeast vs Midwest
        { loc1: 'CALPGCG', loc2: 'CALSCG' },     // NorCal vs SoCal
        { loc1: 'NEATZ6NY', loc2: 'NEAALGCG' },  // Transco Z6 NY vs Algonquin
        { loc1: 'MCWCCITY', loc2: 'MCWDAWN' },   // Chicago vs Dawn
        { loc1: 'CALSCG', loc2: 'WTXWAHA' },     // SoCal vs Waha (West Coast vs Permian)
        { loc1: 'NEALEIDYT', loc2: 'MCWCCITY' }, // Leidy vs Chicago (Appalachia vs Midwest)
        { loc1: 'RMTOPAL', loc2: 'WTXWAHA' },    // Opal vs Waha (Rockies vs Permian)
        { loc1: 'NEAALGCG', loc2: 'NEATZ6NY' },  // Algonquin vs Transco Z6 (New England spread)
        { loc1: 'CALPGCG', loc2: 'RMTOPAL' }     // PG&E vs Opal (California vs Rockies)
    ],

    init: function() {
        this.setupLogToggle();
        this.setupEventListeners();
        this.setupResizeListener();
        this.log('Fixed Forward Spreads Dashboard initialized', 'success');
        this.initializeDefaultCharts();
    },

    setupResizeListener: function() {
        if (!this.resizeListenerAdded) {
            window.addEventListener('resize', () => {
                this.charts.forEach(chart => {
                    if (chart.instance) {
                        chart.instance.resize();
                    }
                });
            });
            this.resizeListenerAdded = true;
        }
    },

    setupEventListeners: function() {
        // Add chart button
        document.getElementById('addChartBtn').addEventListener('click', () => {
            this.addChart();
        });

        // Date picker modal
        document.getElementById('cancelDatePicker').addEventListener('click', () => {
            this.closeDatePicker();
        });

        document.getElementById('applyDatePicker').addEventListener('click', () => {
            this.applyCustomDateRange();
        });

        // Close modal on background click
        document.getElementById('datePickerModal').addEventListener('click', (e) => {
            if (e.target.id === 'datePickerModal') {
                this.closeDatePicker();
            }
        });
    },

    initializeDefaultCharts: async function() {
        // Add default spread charts with staggered loading
        for (let i = 0; i < this.defaultSpreads.length; i++) {
            const spread = this.defaultSpreads[i];
            await this.addChart(spread.loc1, spread.loc2);
            // Delay between chart initializations to avoid rate limiting
            // Each chart makes 2 API calls, so we need sufficient spacing
            if (i < this.defaultSpreads.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
    },

    addChart: async function(defaultLoc1 = null, defaultLoc2 = null) {
        const chartId = this.nextChartId++;
        const grid = document.getElementById('dashboardGrid');

        // Create chart card HTML
        const cardHTML = `
            <div class="chart-card" data-chart-id="${chartId}">
                <div class="chart-header">
                    <div class="chart-controls">
                        <select class="location-select" data-chart-id="${chartId}" data-location="1">
                            ${this.generateLocationOptions()}
                        </select>
                        <select class="location-select" data-chart-id="${chartId}" data-location="2">
                            ${this.generateLocationOptions()}
                        </select>
                        <select class="contract-select" data-chart-id="${chartId}">
                            ${this.generateContractOptions()}
                        </select>
                    </div>
                    <div class="timeframe-buttons">
                        <button class="timeframe-btn active" data-chart-id="${chartId}" data-timeframe="1M">1M</button>
                        <button class="timeframe-btn" data-chart-id="${chartId}" data-timeframe="3M">3M</button>
                        <button class="timeframe-btn" data-chart-id="${chartId}" data-timeframe="6M">6M</button>
                        <button class="timeframe-btn" data-chart-id="${chartId}" data-timeframe="1Y">1Y</button>
                        <button class="timeframe-btn" data-chart-id="${chartId}" data-timeframe="5Y">5Y</button>
                        <button class="calendar-btn" data-chart-id="${chartId}">📅</button>
                    </div>
                </div>
                <div class="chart-container" id="chart-${chartId}"></div>
            </div>
        `;

        grid.insertAdjacentHTML('beforeend', cardHTML);

        // Set default locations if provided
        if (defaultLoc1 || defaultLoc2) {
            const loc1Select = grid.querySelector(`select[data-chart-id="${chartId}"][data-location="1"]`);
            const loc2Select = grid.querySelector(`select[data-chart-id="${chartId}"][data-location="2"]`);
            if (defaultLoc1 && loc1Select) loc1Select.value = defaultLoc1;
            if (defaultLoc2 && loc2Select) loc2Select.value = defaultLoc2;
        }

        // Initialize chart object
        const chartObj = {
            id: chartId,
            instance: null,
            location1: defaultLoc1 || this.getFirstLocation(),
            location2: defaultLoc2 || this.getFirstLocation(),
            contract: this.getPromptMonthContract(),
            timeframe: '1M',
            customStartDate: null,
            customEndDate: null,
            isLoading: false
        };

        this.charts.push(chartObj);

        // Bind events for this chart
        this.bindChartEvents(chartId);

        // Load initial data and wait for it to complete
        await this.loadChartData(chartId);
    },

    bindChartEvents: function(chartId) {
        const card = document.querySelector(`.chart-card[data-chart-id="${chartId}"]`);

        // Location selects
        card.querySelectorAll('.location-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const locationNum = e.target.dataset.location;
                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart[`location${locationNum}`] = e.target.value;
                    this.loadChartData(chartId);
                }
            });
        });

        // Contract select
        const contractSelect = card.querySelector('.contract-select');
        if (contractSelect) {
            contractSelect.addEventListener('change', (e) => {
                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart.contract = e.target.value;
                    this.loadChartData(chartId);
                }
            });
        }

        // Timeframe buttons
        card.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                card.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart.timeframe = e.target.dataset.timeframe;
                    chart.customStartDate = null;
                    chart.customEndDate = null;
                    this.loadChartData(chartId);
                }
            });
        });

        // Calendar button
        card.querySelector('.calendar-btn').addEventListener('click', () => {
            this.openDatePicker(chartId);
        });
    },

    generateLocationOptions: function() {
        let html = '';
        Object.keys(this.locations).forEach(region => {
            html += `<optgroup label="${region}">`;
            this.locations[region].forEach(loc => {
                html += `<option value="${loc.value}">${loc.name}</option>`;
            });
            html += '</optgroup>';
        });
        return html;
    },

    generateContractOptions: function() {
        // Generate contract month options: next 24 months starting with prompt month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let html = '';

        const today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth() + 1;  // Next month (0-indexed to 1-indexed)

        // Generate 24 months of options (first one is prompt month)
        for (let i = 0; i < 24; i++) {
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
            const contractValue = `${year}-${String(month).padStart(2, '0')}-01`;
            const contractLabel = `${months[month - 1]} ${year}`;
            html += `<option value="${contractValue}">${contractLabel}</option>`;
        }

        return html;
    },

    getFirstLocation: function() {
        const firstRegion = Object.keys(this.locations)[0];
        return this.locations[firstRegion][0].value;
    },

    getPromptMonthContract: function() {
        // Calculate the prompt month (next month from today)
        const today = new Date();
        let year = today.getFullYear();
        let month = today.getMonth() + 2;  // +1 for next month, +1 for 0-indexed to 1-indexed

        if (month > 12) {
            month = 1;
            year++;
        }

        return `${year}-${String(month).padStart(2, '0')}-01`;
    },

    openDatePicker: function(chartId) {
        this.currentDatePickerChart = chartId;
        const modal = document.getElementById('datePickerModal');
        modal.classList.add('active');

        // Set current dates or defaults
        const today = new Date().toISOString().split('T')[0];
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        document.getElementById('customStartDate').value = oneMonthAgo.toISOString().split('T')[0];
        document.getElementById('customEndDate').value = today;
    },

    closeDatePicker: function() {
        const modal = document.getElementById('datePickerModal');
        modal.classList.remove('active');
        this.currentDatePickerChart = null;
    },

    applyCustomDateRange: function() {
        if (!this.currentDatePickerChart) return;

        const startDate = document.getElementById('customStartDate').value;
        const endDate = document.getElementById('customEndDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        const chart = this.charts.find(c => c.id === this.currentDatePickerChart);
        if (chart) {
            chart.customStartDate = startDate;
            chart.customEndDate = endDate;
            chart.timeframe = 'custom';

            // Update button states
            const card = document.querySelector(`.chart-card[data-chart-id="${chart.id}"]`);
            card.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));

            this.loadChartData(chart.id);
        }

        this.closeDatePicker();
    },

    getDateRange: function(timeframe, customStart, customEnd) {
        const endDate = new Date();
        let startDate = new Date();

        if (timeframe === 'custom' && customStart && customEnd) {
            return {
                start: customStart,
                end: customEnd
            };
        }

        switch(timeframe) {
            case '1M':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '3M':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case '6M':
                startDate.setMonth(endDate.getMonth() - 6);
                break;
            case '1Y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            case '5Y':
                startDate.setFullYear(endDate.getFullYear() - 5);
                break;
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    },

    async loadChartData(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        // Prevent multiple simultaneous requests
        if (chart.isLoading) {
            return;
        }

        chart.isLoading = true;
        this.setChartButtonsEnabled(chartId, false);
        this.setStatus('loading', 'LOADING');

        const dateRange = this.getDateRange(chart.timeframe, chart.customStartDate, chart.customEndDate);

        // Get location names for logging
        const loc1Name = this.getLocationName(chart.location1);
        const loc2Name = this.getLocationName(chart.location2);

        this.log(`Chart ${chartId + 1}: Fetching forward spread for <strong>${loc1Name}</strong> - <strong>${loc2Name}</strong>`);
        this.log(`Contract: ${chart.contract}, Date range: ${dateRange.start} to ${dateRange.end}`);

        try {
            // Fetch forward spread data using the new endpoint
            const url = `/api/forward-spread-data?location1=${chart.location1}&location2=${chart.location2}&start_date=${dateRange.start}&end_date=${dateRange.end}&contract=${chart.contract}`;

            this.log(`API call: /api/forward-spread-data?location1=${chart.location1}&location2=${chart.location2}&...`);

            const response = await fetch(url);
            const data = await response.json();

            // Check for session expiration
            if (response.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...', 'error');
                window.location.href = '/auth';
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data from API');
            }

            // Check for API errors in response
            if (data.error) {
                throw new Error(data.error);
            }

            const dataPoints = data.dates ? data.dates.length : 0;
            this.log(`Received ${dataPoints} data points for spread calculation`, 'success');

            this.renderChart(chartId, data);
            this.setStatus('ready', 'READY');
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.log(`Error: ${error.message}`, 'error');
            this.setStatus('error', 'ERROR');
            // Show error in chart area instead of alert
            const chartDom = document.getElementById(`chart-${chartId}`);
            if (chartDom) {
                chartDom.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:12px;text-align:center;padding:1rem;">Error loading data: ${error.message}</div>`;
            }
        } finally {
            chart.isLoading = false;
            this.setChartButtonsEnabled(chartId, true);
        }
    },

    getLocationName: function(locationCode) {
        for (const region of Object.values(this.locations)) {
            const loc = region.find(l => l.value === locationCode);
            if (loc) return loc.name;
        }
        return locationCode;
    },

    setChartButtonsEnabled: function(chartId, enabled) {
        const card = document.querySelector(`.chart-card[data-chart-id="${chartId}"]`);
        if (!card) return;

        // Enable/disable timeframe buttons
        card.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.disabled = !enabled;
        });

        // Enable/disable calendar button
        const calendarBtn = card.querySelector('.calendar-btn');
        if (calendarBtn) {
            calendarBtn.disabled = !enabled;
        }

        // Enable/disable location selects
        card.querySelectorAll('.location-select').forEach(select => {
            select.disabled = !enabled;
        });

        // Enable/disable contract select
        const contractSelect = card.querySelector('.contract-select');
        if (contractSelect) {
            contractSelect.disabled = !enabled;
        }
    },

    renderChart: function(chartId, data) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        const chartDom = document.getElementById(`chart-${chartId}`);

        // Dispose existing chart
        if (chart.instance) {
            chart.instance.dispose();
        }

        // Initialize new chart
        chart.instance = echarts.init(chartDom);

        // Get location names from data
        const loc1Name = data.location1_name || 'Location 1';
        const loc2Name = data.location2_name || 'Location 2';
        const contractMonth = data.contract || 'Prompt';

        // Get dates and spreads from data
        const dates = data.dates || [];
        const spreadData = data.spreads || [];

        // Calculate y-axis range based on data
        let yMin = null;
        let yMax = null;
        if (spreadData.length > 0) {
            const validSpreads = spreadData.filter(s => s !== null && s !== undefined);
            if (validSpreads.length > 0) {
                yMin = Math.min(...validSpreads);
                yMax = Math.max(...validSpreads);

                // Add 10% padding to top and bottom
                const range = yMax - yMin;
                const padding = range * 0.1;
                yMin = yMin - padding;
                yMax = yMax + padding;
            }
        }

        // Format dates for display (shorter format)
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[1]}/${parts[2]}`;  // MM/DD format
            }
            return dateStr;
        };

        const option = {
            title: {
                text: `${loc1Name} - ${loc2Name} (${contractMonth})`,
                textStyle: {
                    fontSize: 12,
                    fontWeight: 600
                },
                left: 10,
                top: 8
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (params && params[0]) {
                        const value = params[0].value;
                        return `${params[0].name}<br/>Spread: $${value !== null ? value.toFixed(3) : 'N/A'}`;
                    }
                    return '';
                }
            },
            grid: {
                left: 50,
                right: 15,
                top: 35,
                bottom: 30,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    fontSize: 9,
                    color: '#374151',
                    rotate: 0,
                    interval: function(index, value) {
                        // Show ~4 labels evenly spaced
                        const total = dates.length;
                        if (total <= 4) return true;
                        const step = Math.floor(total / 4);
                        return index === 0 || index === total - 1 || index % step === 0;
                    },
                    formatter: formatDate
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    lineStyle: { color: '#e5e7eb' }
                }
            },
            yAxis: {
                type: 'value',
                min: yMin,
                max: yMax,
                axisLabel: {
                    fontSize: 9,
                    formatter: function(value) {
                        return '$' + value.toFixed(2);
                    }
                },
                splitLine: {
                    lineStyle: { color: '#f3f4f6' }
                },
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                }
            },
            series: [{
                data: spreadData,
                type: 'line',
                smooth: false,
                lineStyle: {
                    width: 1.5,
                    color: '#3b82f6'
                },
                itemStyle: {
                    color: '#3b82f6'
                },
                symbol: 'none',
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
                        ]
                    }
                }
            }]
        };

        chart.instance.setOption(option);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    ForwardSpreadDashboard.init();
});
