/**
 * Forward Curve Charts - Publication-ready NGI forward curve charts
 * Shows how one location's forward curve evolves across multiple trade dates
 * Generates charts at 750x400px, exports as 828x447px WebP
 */

const ForwardCurveCharts = {
    chart: null,
    tradeDates: [],       // Array of { date, color, style } objects
    fullApiResponse: null,
    customLegendLabels: {}, // Map of original series name -> custom label

    // Color palette matching NGI publication style
    colorPalette: [
        '#1d4063',  // Dark Navy Blue
        '#37b4ee',  // Sky Blue
        '#fabc28',  // Gold/Amber
        '#dc3545',  // Red
        '#28a745',  // Green
        '#6f42c1',  // Purple
        '#fd7e14',  // Orange
        '#20c997'   // Teal
    ],

    // Default line style rotation
    defaultStyles: ['solid', 'solid', 'dashed', 'dotted', 'dashed', 'solid', 'dotted', 'dashed'],

    // SVG path icons for legend (thin filled rectangles mimicking line styles)
    legendIcons: {
        solid:  'path://M0,5L40,5L40,7L0,7Z',
        dashed: 'path://M0,5L10,5L10,7L0,7Z M15,5L25,5L25,7L15,7Z M30,5L40,5L40,7L30,7Z',
        dotted: 'path://M0,5L4,5L4,7L0,7Z M8,5L12,5L12,7L8,7Z M16,5L20,5L20,7L16,7Z M24,5L28,5L28,7L24,7Z M32,5L36,5L36,7L32,7Z'
    },

    // Location data (full list matching daily price charts)
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
            { name: 'Enterprise Pipeline-S. TX MAP', value: 'STXMAP' },
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
            { name: 'Gulf South Pool 16', value: 'ETXGS16P' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'NGPL TexOk', value: 'ETXNGPL' },
            { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
            { name: 'Tolar Hub', value: 'OTHTOLAR' },
            { name: 'Transco Zone 2', value: 'ETXST45' },
            { name: 'E. TX Regional Avg.', value: 'ETXRAVG' }
        ],
        'West Texas': [
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'El Paso - Keystone', value: 'WTXEPKEY' },
            { name: 'El Paso - Plains Pool', value: 'WTXEPPL' },
            { name: 'El Paso - Waha', value: 'WTXEPW' },
            { name: 'Oneok WesTex', value: 'WTXONEOK' },
            { name: 'Transwestern', value: 'WTXTW' },
            { name: 'Transwestern - W. TX', value: 'WTXTWOTH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'W. TX/SE NM Regional Avg.', value: 'WTXRAVG' }
        ],
        'Midwest': [
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Chicago - Nicor Gas', value: 'MCWCCNICOR' },
            { name: 'Chicago - NIPSCO', value: 'MCWCCNIPS' },
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
            { name: 'Perryville', value: 'NLAPERRY' },
            { name: 'Texas Eastern, M1, 24', value: 'ALATETM124' },
            { name: 'Texas Gas Zone 1', value: 'ETXTGT' },
            { name: 'Trunkline Zone 1A', value: 'OTHTRNK1A' },
            { name: 'N. LA Regional Avg.', value: 'NLARAVG' }
        ],
        'South Louisiana': [
            { name: 'ANR SE', value: 'SLAANRSE' },
            { name: 'Columbia Gulf Mainline', value: 'SLACGMAIN' },
            { name: 'Columbia Gulf onshore', value: 'SLACGO' },
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Pine Prairie', value: 'SLAPPSF' },
            { name: 'Southern Natural', value: 'SLASONAT' },
            { name: 'Tennessee Line 500', value: 'SLAT500' },
            { name: 'Tennessee Line 800', value: 'SLAT800' },
            { name: 'Texas Eastern E. LA', value: 'SLATETCOE' },
            { name: 'Texas Eastern W. LA', value: 'SLATETCOW' },
            { name: 'Transco Zone 3 St. 65', value: 'SLAST65' },
            { name: 'S. LA Regional Avg.', value: 'SLARAVG' }
        ],
        'Southeast': [
            { name: 'Florida Gas Zone 3', value: 'SLAFGTZ3' },
            { name: 'Tenn Zone 1 100L', value: 'ALATENN1L100' },
            { name: 'Tenn Zone 1 St. 87', value: 'SETENN1ST87' },
            { name: 'Texas Eastern M-1, 30', value: 'ALATETM1' },
            { name: 'Transco Zone 4', value: 'ALAST85' },
            { name: 'Transco Zone 5', value: 'NEATRANZ5' },
            { name: 'Transco Zone 5 North', value: 'NEATZ5WGL' },
            { name: 'Transco Zone 5 South', value: 'NEATZ5NWGL' },
            { name: 'Transco Zone 5 St. 165', value: 'SEST165' },
            { name: 'Southeast Regional Avg.', value: 'SEREGAVG' }
        ],
        'Appalachia': [
            { name: 'Columbia Gas', value: 'NEATCO' },
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
            { name: 'Iroquois Zone 2', value: 'NEAIRO' },
            { name: 'Iroquois, Waddington', value: 'NEAIROWAD' },
            { name: 'Niagara', value: 'MCWNIAGR' },
            { name: 'Tenn Zone 5 200L', value: 'NEATENN5L200' },
            { name: 'Tenn Zone 5 200L East', value: 'NEATENNZ5E' },
            { name: 'Tenn Zone 6 200L', value: 'NEATENN6L200' },
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
            { name: 'MountainWest', value: 'RMTQUEST' },
            { name: 'Northwest Sumas', value: 'RMTSUMAS' },
            { name: 'Northwest Wyoming Pool', value: 'RMTNWW' },
            { name: 'Opal', value: 'RMTOPAL' },
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
            { name: 'SoCal Border - Ehrenberg', value: 'CALSAVGEH' },
            { name: 'SoCal Border - Kern River Station', value: 'CALSAVGKRS' },
            { name: 'SoCal Border - Kramer', value: 'CALSAVGKR' },
            { name: 'SoCal Border - Needles', value: 'CALSAVGNE' },
            { name: 'California Regional Avg.', value: 'CALRAVG' }
        ],
        'Canada': [
            { name: 'Alliance (APC) - ATP', value: 'CDNCREC' },
            { name: 'Empress', value: 'CDNEMP' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' },
            { name: 'Westcoast Station 2', value: 'CDNWST2' }
        ]
    },

    init: async function() {
        this.setupDropdowns();
        this.bindEvents();
        this.setupLogToggle();
        await this.fetchLatestDateAndSetupDates();
        this.log('Forward Curve Charts system initialized.');
    },

    log: function(msg) {
        const time = new Date().toLocaleTimeString();
        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if(logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if(lastLog) lastLog.textContent = msg.replace(/<[^>]*>/g, '');
    },

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if(logToggle) {
            logToggle.addEventListener('click', () => {
                const isOpen = logDrawer.style.height !== '0px' && logDrawer.style.height !== '';
                if(isOpen) {
                    logDrawer.style.height = '0';
                    logArrow.style.transform = 'rotate(0deg)';
                } else {
                    logDrawer.style.height = '16rem';
                    logArrow.style.transform = 'rotate(180deg)';
                }
            });
        }
    },

    setupDropdowns: function() {
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');

        Object.keys(this.locations).forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });

        regionSelect.value = 'Favorites';
        this.updateLocations();

        // Default to Henry Hub
        locationSelect.value = 'SLAHH';
    },

    updateLocations: function() {
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');
        const region = regionSelect.value;

        locationSelect.innerHTML = '';

        const locs = this.locations[region] || [];
        locs.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.value;
            option.textContent = loc.name;
            locationSelect.appendChild(option);
        });
    },

    fetchLatestDateAndSetupDates: async function() {
        try {
            this.log('Fetching latest available issue date...');
            const res = await fetch('/api/forward-latest-date');
            const data = await res.json();

            if (data.success && data.latest_issue_date) {
                this.log(`Latest issue date: <strong>${data.latest_issue_date}</strong>`);
                this.setupDefaultDates(data.latest_issue_date);
            } else {
                this.log('Could not fetch latest date, using fallback defaults');
                this.setupDefaultDates(null);
            }
        } catch (err) {
            this.log(`Error fetching latest date: ${err.message}`);
            this.setupDefaultDates(null);
        }
    },

    formatLocalDate: function(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    setupDefaultDates: function(latestIssueDate) {
        let latest;
        if (latestIssueDate) {
            latest = new Date(latestIssueDate + 'T00:00:00');
        } else {
            latest = new Date();
        }

        // ~2 weeks ago
        const twoWeeksAgo = new Date(latest);
        twoWeeksAgo.setDate(latest.getDate() - 14);

        // ~1 month ago
        const oneMonthAgo = new Date(latest);
        oneMonthAgo.setMonth(latest.getMonth() - 1);

        // Pre-populate 3 trade dates with colors and styles
        this.tradeDates = [
            { date: this.formatLocalDate(latest),       color: this.colorPalette[0], style: this.defaultStyles[0] },
            { date: this.formatLocalDate(twoWeeksAgo),  color: this.colorPalette[1], style: this.defaultStyles[1] },
            { date: this.formatLocalDate(oneMonthAgo),  color: this.colorPalette[2], style: this.defaultStyles[2] }
        ];

        document.getElementById('tradeDateInput').value = this.formatLocalDate(latest);

        this.renderTradeDatesList();
    },

    bindEvents: function() {
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocations());
        document.getElementById('addTradeDateBtn').addEventListener('click', () => this.addTradeDate());
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadChart());
        document.getElementById('updateContractRangeBtn').addEventListener('click', () => this.updateContractRange());
        document.getElementById('applyLegendBtn').addEventListener('click', () => this.applyLegendLabels());
        document.getElementById('exportColorsBtn').addEventListener('click', () => this.exportColors());
        document.getElementById('importColorsBtn').addEventListener('click', () => document.getElementById('importColorsFile').click());
        document.getElementById('importColorsFile').addEventListener('change', (e) => this.importColors(e));
        document.getElementById('hideYearCheckbox').addEventListener('change', () => {
            if (this.fullApiResponse && this.chart) this.rerenderChart();
        });
    },

    addTradeDate: function() {
        const input = document.getElementById('tradeDateInput');
        const date = input.value;
        if (date && !this.tradeDates.some(td => td.date === date)) {
            const idx = this.tradeDates.length;
            this.tradeDates.push({
                date: date,
                color: this.colorPalette[idx % this.colorPalette.length],
                style: this.defaultStyles[idx % this.defaultStyles.length]
            });
            this.renderTradeDatesList();
            this.log(`Added trade date: <strong>${date}</strong>`);
        }
    },

    removeTradeDate: function(date) {
        this.tradeDates = this.tradeDates.filter(td => td.date !== date);
        this.renderTradeDatesList();
        this.log(`Removed trade date: ${date}`);
        if (this.fullApiResponse && this.chart) this.rerenderChart();
    },

    renderTradeDatesList: function() {
        const container = document.getElementById('tradeDatesList');
        const emptyMsg = document.getElementById('emptyDatesMsg');

        // Remove only date items
        Array.from(container.querySelectorAll('.date-item')).forEach(el => el.remove());

        if (this.tradeDates.length === 0) {
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');

        this.tradeDates.forEach(td => {
            const div = document.createElement('div');
            div.className = 'date-item flex items-center gap-1.5 bg-white p-1.5 border border-gray-300 text-sm mb-1';

            // Color picker
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = td.color;
            colorInput.className = 'color-picker';
            colorInput.addEventListener('input', (e) => {
                td.color = e.target.value;
                if (this.fullApiResponse && this.chart) this.rerenderChart();
            });

            // Date label
            const label = document.createElement('span');
            label.className = 'flex-1 text-xs';
            label.textContent = td.date;

            // Line style selector
            const styleSelect = document.createElement('select');
            styleSelect.className = 'text-xs border border-gray-300 px-1 py-0.5 bg-white';
            ['solid', 'dashed', 'dotted'].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
                styleSelect.appendChild(opt);
            });
            styleSelect.value = td.style;
            styleSelect.addEventListener('change', (e) => {
                td.style = e.target.value;
                if (this.fullApiResponse && this.chart) this.rerenderChart();
            });

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => this.removeTradeDate(td.date));

            div.appendChild(colorInput);
            div.appendChild(label);
            div.appendChild(styleSelect);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    },

    getLocationName: function() {
        const sel = document.getElementById('locationSelect');
        return sel.options[sel.selectedIndex].text;
    },

    getPriceTypeLabel: function() {
        const priceType = document.querySelector('input[name="priceType"]:checked').value;
        return priceType === 'fixed' ? 'Fixed Price' : 'Basis';
    },

    // Convert style string to ECharts lineStyle.type
    styleToEcharts: function(style) {
        switch(style) {
            case 'dashed': return [8, 4];
            case 'dotted': return [3, 3];
            default: return 'solid';
        }
    },

    // Get SVG path icon for legend based on line style
    getLegendIcon: function(style) {
        return this.legendIcons[style] || this.legendIcons.solid;
    },

    handleGenerate: async function() {
        try {
            if (this.tradeDates.length === 0) {
                alert('Please add at least one trade date.');
                return;
            }

            const location = document.getElementById('locationSelect').value;
            const locationName = this.getLocationName();
            const priceType = document.querySelector('input[name="priceType"]:checked').value;

            const params = new URLSearchParams();
            params.append('mode', 'single_price');
            params.append('location', location);
            params.append('price_type', priceType);
            this.tradeDates.forEach(td => params.append('issue_dates[]', td.date));

            this.log(`Fetching forward curves for <strong>${locationName}</strong> (${this.tradeDates.length} trade dates)...`);

            const response = await fetch(`/api/forward-prices?${params.toString()}`);
            const data = await response.json();

            // Check for session expiration
            if (response.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...');
                window.location.href = '/auth';
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch data: ${response.status}`);
            }

            if (data.metadata && data.metadata.warning) {
                this.log(`Warning: ${data.metadata.warning}`);
            }

            // Store full response for contract range filtering
            this.fullApiResponse = data;

            // Format series names to DD-Mon-YYYY and add (Current) annotation
            this.formatSeriesNames(data);

            this.renderChart(data);
            this.log(`Chart rendered: <strong>750\u00d7400px</strong> display \u2022 ${data.series.length} series, ${data.dates.length} contract months`);

            // Show download button, contract range section, and legend editor
            document.getElementById('downloadBtn').classList.remove('hidden');
            this.setupContractRangeDropdowns(data.dates);
            document.getElementById('contractRangeSection').classList.remove('hidden');
            this.customLegendLabels = {};
            this.setupLegendEditor(data);
            document.getElementById('xAxisOptionsSection').classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching chart data:', error);
            this.log(`<span class="text-red-400">Error: ${error.message}</span>`);
            alert('Failed to load chart data. Please try again.');
        }
    },

    formatSeriesNames: function(data) {
        if (!data.series || data.series.length === 0) return;

        const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

        let latestIdx = 0;
        let latestDate = new Date(0);

        // Reformat each series name from "Jan 15, 2024" to "15-Jan-2024"
        data.series.forEach((s, i) => {
            const match = s.name.match(/^(\w+)\s+(\d+),\s+(\d+)$/);
            if (match) {
                const [_, month, day, year] = match;
                const d = new Date(parseInt(year), monthMap[month], parseInt(day));

                s.name = `${day.padStart(2, '0')}-${month}-${year}`;

                if (d > latestDate) {
                    latestDate = d;
                    latestIdx = i;
                }
            }
        });

        // Add "(Current)" to the most recent trade date
        data.series[latestIdx].name += ' (Current)';
    },

    // Map API series back to tradeDates by issue_date from raw_records
    getSeriesConfig: function(data, idx) {
        const issueDate = data.raw_records && data.raw_records[idx]
            ? data.raw_records[idx].issue_date
            : null;
        const tradeDateObj = issueDate
            ? this.tradeDates.find(td => td.date === issueDate)
            : null;

        return {
            color: tradeDateObj ? tradeDateObj.color : this.colorPalette[idx % this.colorPalette.length],
            style: tradeDateObj ? tradeDateObj.style : this.defaultStyles[idx % this.defaultStyles.length]
        };
    },

    setupContractRangeDropdowns: function(dates) {
        const fromSelect = document.getElementById('contractFrom');
        const toSelect = document.getElementById('contractTo');

        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        dates.forEach(d => {
            const fromOpt = document.createElement('option');
            fromOpt.value = d;
            fromOpt.textContent = d;
            fromSelect.appendChild(fromOpt);

            const toOpt = document.createElement('option');
            toOpt.value = d;
            toOpt.textContent = d;
            toSelect.appendChild(toOpt);
        });

        fromSelect.value = dates[0];
        toSelect.value = dates[dates.length - 1];
    },

    updateContractRange: function() {
        if (!this.fullApiResponse) return;
        this.rerenderChart();
    },

    setupLegendEditor: function(data) {
        const container = document.getElementById('legendEditorContainer');
        container.innerHTML = '';

        if (!data.series || data.series.length === 0) return;

        data.series.forEach((s, idx) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.customLegendLabels[s.name] || s.name;
            input.dataset.originalName = s.name;
            input.className = 'px-1.5 py-0.5 border border-gray-300 text-xs bg-white w-32';
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyLegendLabels();
            });
            container.appendChild(input);
        });

        document.getElementById('legendEditorSection').classList.remove('hidden');
    },

    applyLegendLabels: function() {
        const inputs = document.querySelectorAll('#legendEditorContainer input');
        this.customLegendLabels = {};
        inputs.forEach(input => {
            const original = input.dataset.originalName;
            const custom = input.value.trim();
            if (custom && custom !== original) {
                this.customLegendLabels[original] = custom;
            }
        });
        this.rerenderChart();
        this.log('Legend labels updated.');
    },

    // Re-render chart from stored data (used for color/style changes and contract range updates)
    rerenderChart: function() {
        if (!this.fullApiResponse) return;

        const fromVal = document.getElementById('contractFrom').value;
        const toVal = document.getElementById('contractTo').value;
        const allDates = this.fullApiResponse.dates;
        const fromIdx = allDates.indexOf(fromVal);
        const toIdx = allDates.indexOf(toVal);

        let chartData;
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx <= toIdx) {
            chartData = {
                ...this.fullApiResponse,
                dates: allDates.slice(fromIdx, toIdx + 1),
                series: this.fullApiResponse.series.map(s => ({
                    ...s,
                    data: s.data.slice(fromIdx, toIdx + 1)
                }))
            };
        } else {
            chartData = this.fullApiResponse;
        }

        this.renderChart(chartData);
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chart');

        // Dispose of existing chart instance
        if (this.chart) {
            this.chart.dispose();
        }

        this.chart = echarts.init(chartDom);

        if (!data || !data.series || data.series.length === 0) {
            alert('No data available. Please try different parameters.');
            return;
        }

        const locationName = this.getLocationName();
        const priceTypeLabel = this.getPriceTypeLabel();
        const titleText = `NGI's ${locationName} Forward ${priceTypeLabel}`;

        // Calculate Y-axis bounds
        let allPrices = [];
        data.series.forEach(s => {
            s.data.forEach(p => {
                if (p !== null && p !== undefined && !isNaN(p)) {
                    allPrices.push(p);
                }
            });
        });

        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const interval = this.calculateYAxisInterval(minPrice, maxPrice);
        const adjustedMin = Math.floor(minPrice / interval) * interval;
        const adjustedMax = Math.ceil(maxPrice / interval) * interval;

        // Build series configs from trade date settings
        const seriesConfigs = data.series.map((s, idx) => this.getSeriesConfig(data, idx));

        // Build ECharts series (apply custom legend labels if set)
        const series = data.series.map((s, idx) => {
            const cfg = seriesConfigs[idx];
            const displayName = this.customLegendLabels[s.name] || s.name;
            return {
                name: displayName,
                type: 'line',
                data: s.data.map(v => (v === null || v === undefined || isNaN(v)) ? null : v),
                color: cfg.color,
                itemStyle: { color: cfg.color },
                lineStyle: {
                    color: cfg.color,
                    width: 3,
                    type: this.styleToEcharts(cfg.style)
                },
                symbol: 'none',
                connectNulls: true
            };
        });

        // Build legend data with per-item SVG path icons matching line style
        const legendData = data.series.map((s, idx) => ({
            name: this.customLegendLabels[s.name] || s.name,
            icon: this.getLegendIcon(seriesConfigs[idx].style),
            itemStyle: { color: seriesConfigs[idx].color }
        }));

        const option = {
            color: seriesConfigs.map(c => c.color),
            toolbox: { show: false },
            textStyle: { fontFamily: "'Inter', Arial, sans-serif" },
            title: [{
                text: titleText,
                left: '3%',
                top: '10',
                textStyle: {
                    color: '#003A50',
                    fontWeight: 'bold',
                    fontSize: 24
                }
            }],
            legend: {
                top: '72',
                left: 'center',
                textStyle: {
                    fontFamily: "'Inter', Arial, sans-serif",
                    fontSize: 13,
                    fontWeight: 520,
                    color: '#000'
                },
                itemWidth: 28,
                itemHeight: 12,
                itemGap: 16,
                data: legendData
            },
            graphic: [
                {
                    type: 'image',
                    right: 40,
                    top: 18,
                    style: {
                        image: '/static/images/ngi_logo.png',
                        width: 70,
                        height: 35
                    }
                },
                {
                    type: 'group',
                    left: 'center',
                    top: 63,
                    children: [{
                        type: 'rect',
                        z: 100,
                        left: 'center',
                        top: 'middle',
                        shape: {
                            width: 700,
                            height: 1.4
                        },
                        style: {
                            fill: '#003A50'
                        }
                    }]
                },
                {
                    type: 'text',
                    left: '3.5%',
                    bottom: '7%',
                    style: {
                        text: "{bold|Note:} Forward Look data by trade date.",
                        font: "12px 'Inter', Arial, sans-serif",
                        rich: {
                            bold: {
                                fontWeight: 'bold',
                                fontSize: 12,
                                fontFamily: "'Inter', Arial, sans-serif"
                            }
                        },
                        fill: '#000'
                    }
                },
                {
                    type: 'text',
                    left: '3.5%',
                    bottom: '1.6%',
                    style: {
                        text: "{bold|Source:} NGI's Forward Look",
                        font: "14px 'Inter', Arial, sans-serif",
                        rich: {
                            bold: {
                                fontWeight: 'bold',
                                fontSize: 14,
                                fontFamily: "'Inter', Arial, sans-serif"
                            }
                        },
                        fill: '#000'
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            grid: {
                left: '7.1%',
                right: '4%',
                top: '25%',
                bottom: document.getElementById('hideYearCheckbox').checked ? '10%' : '14%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: document.getElementById('hideYearCheckbox').checked ? true : false,
                data: document.getElementById('hideYearCheckbox').checked
                    ? data.dates.map(d => d.replace(/\s+\d{4}$/, ''))
                    : data.dates,
                axisLabel: {
                    rotate: document.getElementById('hideYearCheckbox').checked ? 0 : 45,
                    interval: (index) => {
                        const totalDataPoints = data.dates.length;
                        const lastIndex = totalDataPoints - 1;
                        const numIntervals = Math.min(12, lastIndex);
                        if (numIntervals <= 0) return true;
                        const step = lastIndex / numIntervals;
                        const labelIndices = [];
                        for (let i = 0; i <= numIntervals; i++) {
                            labelIndices.push(Math.round(i * step));
                        }
                        if (!labelIndices.includes(lastIndex)) {
                            labelIndices.push(lastIndex);
                        }
                        return labelIndices.includes(index);
                    },
                    verticalAlign: document.getElementById('hideYearCheckbox').checked ? 'middle' : 'top',
                    align: document.getElementById('hideYearCheckbox').checked ? 'center' : 'right',
                    margin: document.getElementById('hideYearCheckbox').checked ? 14 : 8,
                    fontSize: document.getElementById('hideYearCheckbox').checked ? 14 : 13,
                    fontWeight: 550,
                    color: 'black'
                },
                axisLine: {
                    lineStyle: { color: '#D3D3D3' }
                },
                axisTick: {
                    alignWithLabel: true,
                    lineStyle: { color: '#D3D3D3' }
                }
            },
            yAxis: {
                type: 'value',
                name: '$US/MMBtu',
                nameLocation: 'middle',
                nameGap: 70,
                nameTextStyle: {
                    fontWeight: 750,
                    fontSize: 12,
                    color: 'black'
                },
                min: adjustedMin,
                max: adjustedMax,
                interval: interval,
                axisLine: { show: false },
                axisLabel: {
                    formatter: function(value) {
                        if (value < 0) {
                            return `{red|$${value.toFixed(3)}}`;
                        }
                        return `$${value.toFixed(3)}`;
                    },
                    textStyle: {
                        fontFamily: "'Inter', Arial, sans-serif",
                        fontSize: 14,
                        color: 'black'
                    },
                    rich: {
                        red: {
                            color: 'red',
                            fontFamily: "'Inter', Arial, sans-serif",
                            fontSize: 13
                        }
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#D3D3D3',
                        width: 1
                    }
                }
            },
            series: series
        };

        this.chart.setOption(option);
    },

    calculateYAxisInterval: function(min, max) {
        const range = max - min;

        if (range > 100) return 20;
        if (range > 50) return 10;
        if (range > 20) return 5;
        if (range > 8) return 2;
        if (range > 4) return 1;
        return 0.5;
    },

    downloadChart: function() {
        if (!this.chart) return;

        this.log('Preparing chart for download...');

        // Get full chart as PNG at 2x pixel ratio (1500x800)
        const fullChartBase64 = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // EXACT cropping: 20px left, 19px right, 11px top from 1500x800
            const cropLeft = 20;
            const cropTop = 11;
            const cropWidth = 1500 - 20 - 19;  // 1461px
            const cropHeight = 800 - 11;       // 789px

            // Scale to 828x447 while preserving aspect ratio
            const targetWidth = 828;
            const targetHeight = 447;
            const scaleX = targetWidth / cropWidth;
            const scaleY = targetHeight / cropHeight;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = Math.round(cropWidth * scale);
            const scaledHeight = Math.round(cropHeight * scale);

            // Set canvas to target dimensions
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Fill with white background
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Center the scaled image
            const offsetX = (targetWidth - scaledWidth) / 2;
            const offsetY = (targetHeight - scaledHeight) / 2;

            // Draw the cropped and scaled image
            ctx.drawImage(
                img,
                cropLeft, cropTop, cropWidth, cropHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );

            // Convert to WebP and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                const locationName = this.getLocationName();
                const priceTypeLabel = this.getPriceTypeLabel();
                const filename = `NGI ${locationName} Forward ${priceTypeLabel}.webp`;

                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.log(`Chart downloaded as <strong>${filename}</strong> (828\u00d7447px WebP)`);
            }, 'image/webp');
        };

        img.src = fullChartBase64;
    },

    exportColors: function() {
        if (!this.tradeDates.length) {
            alert('No color settings to export.');
            return;
        }
        const data = {
            preset: 'Forward Curve Colors',
            colors: this.tradeDates.map(td => ({ color: td.color, style: td.style }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'forward-curve-colors.json';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.log('Color settings exported.');
    },

    importColors: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (!data.colors || !Array.isArray(data.colors)) {
                    throw new Error('Invalid format: missing colors array');
                }
                // Apply imported colors to existing trade dates
                data.colors.forEach((c, i) => {
                    if (i < this.tradeDates.length) {
                        if (c.color) this.tradeDates[i].color = c.color;
                        if (c.style) this.tradeDates[i].style = c.style;
                    }
                });
                this.renderTradeDatesList();
                if (this.fullApiResponse) this.rerenderChart();
                this.log(`Imported color settings from <strong>${file.name}</strong>`);
            } catch (err) {
                alert('Could not read color file: ' + err.message);
            }
        };
        reader.readAsText(file);
        // Reset so the same file can be re-imported
        e.target.value = '';
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => ForwardCurveCharts.init());
