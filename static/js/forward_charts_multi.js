/**
 * Forward Curves - Multi Location - Publication-ready NGI forward curve comparison charts
 * Charts forward curves for multiple locations on a single trade date.
 * Generates charts at 750x400px, exports as 1656x894px WebP.
 */

const ForwardChartsMulti = {
    chart: null,
    compareList: [], // Each item: {val, name, color, style}
    forwardData: null, // { labels: [], series: [{name, data}], tradeDate, issueDate, priceType }
    customLegendLabels: {},
    customTitle: null, // { line1, line2 } or null for auto
    customNote: null,  // string or null for auto
    customSource: null, // string or null for auto
    customYMin: null,  // number or null for auto
    customYMax: null,  // number or null for auto

    // Color palette for multi-line charts (up to 8 colors)
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
    defaultStyles: ['solid', 'solid', 'dashed', 'solid', 'dotted', 'dashed', 'solid', 'dotted'],

    // SVG path icons for legend
    legendIcons: {
        solid:  'path://M0,5L40,5L40,7L0,7Z',
        dashed: 'path://M0,5L10,5L10,7L0,7Z M15,5L25,5L25,7L15,7Z M30,5L40,5L40,7L30,7Z',
        dotted: 'path://M0,5L4,5L4,7L0,7Z M8,5L12,5L12,7L8,7Z M16,5L20,5L20,7L16,7Z M24,5L28,5L28,7L24,7Z M32,5L36,5L36,7L32,7Z'
    },

    // Location Database (fallback — replaced at init with the full list
    // fetched from /api/forward-locations, which mirrors the NGI forward datafeed)
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
            { name: 'Tres Palacios', value: 'STX3PAL' }
        ],
        'East Texas': [
            { name: 'Carthage', value: 'ETXCARTH' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'NGPL TexOk', value: 'ETXNGPL' },
            { name: 'Tennessee Zone 0 North', value: 'ETXTENN' },
            { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
            { name: 'Transco Zone 2', value: 'ETXST45' }
        ],
        'West Texas': [
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'Transwestern', value: 'WTXTW' },
            { name: 'Waha', value: 'WTXWAHA' }
        ],
        'Midwest / Midcontinent': [
            { name: 'Alliance', value: 'MCWALL' },
            { name: 'ANR ML7', value: 'MCWML7' },
            { name: 'ANR SW', value: 'MCWANR' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Consumers Energy', value: 'MCWCONS' },
            { name: 'Dawn', value: 'MCWDAWN' },
            { name: 'Enable East', value: 'MCWNORE' },
            { name: 'Michigan Consolidated', value: 'MCWMCON' },
            { name: 'NGPL Midcontinent', value: 'MCWNGPL' },
            { name: 'Northern Natural Demarc', value: 'MCWDMARK' },
            { name: 'OGT', value: 'MCWONG' },
            { name: 'Panhandle Eastern', value: 'MCWPEPL' },
            { name: 'Southern Star', value: 'MCWWILL' }
        ],
        'North Louisiana': [
            { name: 'Enable South', value: 'NLACPTS' },
            { name: 'Perryville', value: 'NLAPERRY' },
            { name: 'Texas Gas Zone 1', value: 'ETXTGT' }
        ],
        'South Louisiana': [
            { name: 'ANR SE', value: 'SLAANRSE' },
            { name: 'Columbia Gulf Mainline', value: 'SLACGMAIN' },
            { name: 'Florida Gas Zone 2', value: 'SLAFGTZ2' },
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Southern Natural', value: 'SLASONAT' },
            { name: 'Tennessee Line 500', value: 'SLAT500' },
            { name: 'Texas Eastern E. LA', value: 'SLATETCOE' },
            { name: 'Transco Zone 3', value: 'SLATRANZ3' }
        ],
        'Southeast': [
            { name: 'Cove Point', value: 'NEACOVE' },
            { name: 'FGT Citygate', value: 'FLAFGT' },
            { name: 'Florida Gas Zone 3', value: 'SLAFGTZ3' },
            { name: 'Transco Zone 4', value: 'ALAST85' },
            { name: 'Transco Zone 5', value: 'NEATRANZ5' }
        ],
        'Northeast / Appalachia': [
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Algonquin Receipts', value: 'NEAALGIN' },
            { name: 'Columbia Gas', value: 'NEATCO' },
            { name: 'Dracut', value: 'NEADRACUT' },
            { name: 'Eastern Gas South', value: 'NEACNG' },
            { name: 'Iroquois Zone 2', value: 'NEAIRO' },
            { name: 'Niagara', value: 'MCWNIAGR' },
            { name: 'Tennessee Zn 4 Marcellus', value: 'NEATENN4MAR' },
            { name: 'Texas Eastern M-2, 30 Receipt', value: 'NEATETM2REC' },
            { name: 'Texas Eastern M-3, Delivery', value: 'NEATETM3DEL' },
            { name: 'Transco-Leidy Line', value: 'NEALEIDYT' },
            { name: 'Transco Zone 6 NY', value: 'NEATZ6NY' }
        ],
        'Rocky Mountains': [
            { name: 'Cheyenne Hub', value: 'RMTCHEY' },
            { name: 'CIG', value: 'RMTCIG' },
            { name: 'Northwest Sumas', value: 'RMTSUMAS' },
            { name: 'Opal', value: 'RMTOPAL' },
            { name: 'White River Hub', value: 'RMTWHITERVR' }
        ],
        'Arizona/Nevada': [
            { name: 'El Paso S. Mainline/N. Baja', value: 'ARNBAJAN' },
            { name: 'KRGT Del Pool', value: 'ARNKERNDEL' }
        ],
        'California': [
            { name: 'Malin', value: 'CALM400' },
            { name: 'PG&E Citygate', value: 'CALPGCG' },
            { name: 'SoCal Citygate', value: 'CALSCG' },
            { name: 'SoCal Border Avg.', value: 'CALSAVG' }
        ],
        'Canada': [
            { name: 'Alliance (APC) - ATP', value: 'CDNCREC' },
            { name: 'Empress', value: 'CDNEMP' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' },
            { name: 'Westcoast Station 2', value: 'CDNWST2' }
        ]
    },

    // Region grouping for locations fetched from the API, based on NGI
    // point-code prefixes. First matching prefix wins, so more specific
    // prefixes are listed first; unmatched codes go to 'Other'.
    REGION_PREFIXES: [
        ['STX', 'South Texas'],
        ['ETXTGT', 'North Louisiana'],
        ['ETX', 'East Texas'],
        ['WTX', 'West Texas'],
        ['MCWNIAGR', 'Northeast / Appalachia'],
        ['MCW', 'Midwest / Midcontinent'],
        ['MWE', 'Midwest / Midcontinent'],
        ['MCT', 'Midwest / Midcontinent'],
        ['NLA', 'North Louisiana'],
        ['SLAFGTZ3', 'Southeast'],
        ['SLA', 'South Louisiana'],
        ['NEACOVE', 'Southeast'],
        ['NEATRANZ5', 'Southeast'],
        ['NEATZ5', 'Southeast'],
        ['NEA', 'Northeast / Appalachia'],
        ['ALA', 'Southeast'],
        ['FLA', 'Southeast'],
        ['SE', 'Southeast'],
        ['RMT', 'Rocky Mountains'],
        ['ARN', 'Arizona/Nevada'],
        ['CAL', 'California'],
        ['CDN', 'Canada']
    ],

    REGION_ORDER: [
        'Favorites', 'South Texas', 'East Texas', 'West Texas',
        'Midwest / Midcontinent', 'North Louisiana', 'South Louisiana',
        'Southeast', 'Northeast / Appalachia', 'Rocky Mountains',
        'Arizona/Nevada', 'California', 'Canada', 'Other'
    ],

    init: async function() {
        this.setupDropdowns();
        this.bindEvents();
        this.setupLogToggle();
        await this.fetchLocationsAndLatestDate();
        this.log('Forward Curves - Multi Location system initialized.');
    },

    log: function(msg) {
        const time = new Date().toLocaleTimeString();
        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if (logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if (lastLog) lastLog.textContent = msg.replace(/<[^>]*>/g, '');
    },

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if (logToggle) {
            logToggle.addEventListener('click', () => {
                const isOpen = logDrawer.style.height !== '0px' && logDrawer.style.height !== '';
                if (isOpen) {
                    logDrawer.style.height = '0';
                    logArrow.style.transform = 'rotate(0deg)';
                } else {
                    logDrawer.style.height = '16rem';
                    logArrow.style.transform = 'rotate(180deg)';
                }
            });
        }
    },

    fetchLocationsAndLatestDate: async function() {
        try {
            this.log('Fetching available forward locations and latest issue date from API...');
            const res = await fetch('/api/forward-locations');
            const data = await res.json();

            if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
                this.buildLocationDb(data.locations);
                this.setupDropdowns();
                this.log(`Loaded ${data.locations.length} forward locations from API.`);
            } else {
                this.log('Could not fetch forward locations, using built-in defaults');
            }

            if (data.success && data.latest_issue_date) {
                document.getElementById('issueDateInput').value = data.latest_issue_date;
                this.log(`Latest available issue date: <strong>${data.latest_issue_date}</strong>`);
            } else {
                this.log('Could not fetch latest issue date; please pick one manually.');
            }
        } catch (err) {
            this.log(`Error fetching forward locations: ${err.message}. Using built-in defaults.`);
        }
    },

    regionForCode: function(code) {
        const match = this.REGION_PREFIXES.find(([prefix]) => code.startsWith(prefix));
        return match ? match[1] : 'Other';
    },

    buildLocationDb: function(apiLocations) {
        const groups = {};
        apiLocations.forEach(loc => {
            if (!loc || !loc.code) return;
            const region = this.regionForCode(loc.code);
            (groups[region] = groups[region] || []).push({ name: loc.name || loc.code, value: loc.code });
        });

        Object.values(groups).forEach(locs => locs.sort((a, b) => a.name.localeCompare(b.name)));

        // Keep the curated Favorites group, but only locations the API actually has
        const available = new Set(apiLocations.map(l => l.code));
        const favorites = this.locations['Favorites'].filter(l => available.has(l.value));

        const db = {};
        if (favorites.length > 0) db['Favorites'] = favorites;
        this.REGION_ORDER.forEach(region => {
            if (groups[region]) db[region] = groups[region];
        });
        // Any regions not covered by REGION_ORDER
        Object.keys(groups).forEach(region => {
            if (!db[region]) db[region] = groups[region];
        });

        this.locations = db;
    },

    setupDropdowns: function() {
        const regionSelect = document.getElementById('regionSelect');
        regionSelect.innerHTML = '';

        Object.keys(this.locations).forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });

        if (this.locations['Favorites']) regionSelect.value = 'Favorites';
        this.updateLocations();
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

    bindEvents: function() {
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocations());
        document.getElementById('addToCompareBtn').addEventListener('click', () => {
            const sel = document.getElementById('locationSelect');
            if (sel.selectedIndex >= 0) {
                const opt = sel.options[sel.selectedIndex];
                this.addToCompare(opt.value, opt.textContent);
            }
        });
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadChart());
        document.getElementById('updateContractRangeBtn').addEventListener('click', () => this.rerenderChart());
        document.getElementById('applyTitleBtn').addEventListener('click', () => this.applyTitle());
        document.getElementById('applyLegendBtn').addEventListener('click', () => this.applyLegendLabels());
        document.getElementById('applyNoteSourceBtn').addEventListener('click', () => this.applyNoteSource());
        ['noteInput', 'sourceInput'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyNoteSource();
            });
        });
        document.getElementById('applyYAxisLabelBtn').addEventListener('click', () => this.applyYAxisLabel());
        document.getElementById('yAxisLabelInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.applyYAxisLabel();
        });
        document.getElementById('exportColorsBtn').addEventListener('click', () => this.exportColors());
        document.getElementById('importColorsBtn').addEventListener('click', () => document.getElementById('importColorsFile').click());
        document.getElementById('importColorsFile').addEventListener('change', (e) => this.importColors(e));
        document.getElementById('applyYAxisBtn').addEventListener('click', () => this.applyYAxis());
        document.getElementById('resetYAxisBtn').addEventListener('click', () => this.resetYAxis());
        ['yAxisMin', 'yAxisMax'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyYAxis();
            });
        });
        document.getElementById('hideYearCheckbox').addEventListener('change', (e) => {
            const sub = document.getElementById('showYearUnderJanCheckbox');
            sub.disabled = !e.target.checked;
            if (!e.target.checked) sub.checked = false;
            this.rerenderChart();
        });
        document.getElementById('showYearUnderJanCheckbox').addEventListener('change', () => this.rerenderChart());
        document.getElementById('hideMonthCheckbox').addEventListener('change', () => this.rerenderChart());
        document.getElementById('xAxisPadding').addEventListener('input', () => this.rerenderChart());
        document.getElementById('legendPadding').addEventListener('input', () => this.rerenderChart());

        // Two-line title checkbox toggles second input
        document.getElementById('twoLineTitleCheckbox').addEventListener('change', (e) => {
            document.getElementById('titleLine2').classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) {
                const line2 = document.getElementById('titleLine2');
                if (!line2.value) line2.value = 'Forward Natural Gas Prices';
            }
        });

        // Enter key in title inputs triggers apply
        ['titleLine1', 'titleLine2'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyTitle();
            });
        });
    },

    addToCompare: function(val, name) {
        if (this.compareList.some(i => i.val === val)) return;

        const idx = this.compareList.length;
        this.compareList.push({
            val,
            name,
            color: this.colorPalette[idx % this.colorPalette.length],
            style: this.defaultStyles[idx % this.defaultStyles.length]
        });
        this.renderCompareList();
        this.log(`Added <strong>${name}</strong> to comparison list.`);
    },

    removeFromCompare: function(val) {
        const item = this.compareList.find(i => i.val === val);
        this.compareList = this.compareList.filter(i => i.val !== val);
        this.renderCompareList();
        if (item) {
            this.log(`Removed <strong>${item.name}</strong> from comparison list.`);
        }
    },

    renderCompareList: function() {
        const container = document.getElementById('compareListContainer');
        container.innerHTML = '';

        if (this.compareList.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 italic">No locations added.</p>';
            return;
        }

        this.compareList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'bg-white p-2 border border-gray-300 text-sm';

            // Top row: name + remove button
            const topRow = document.createElement('div');
            topRow.className = 'flex justify-between items-center';

            const label = document.createElement('span');
            label.className = 'truncate pr-2 text-xs font-medium';
            label.textContent = item.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => this.removeFromCompare(item.val));

            topRow.appendChild(label);
            topRow.appendChild(removeBtn);

            // Bottom row: color picker + style dropdown
            const bottomRow = document.createElement('div');
            bottomRow.className = 'flex items-center gap-2 mt-1';

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = item.color;
            colorInput.className = 'color-picker';
            colorInput.addEventListener('input', (e) => {
                item.color = e.target.value;
                this.rerenderChart();
            });

            const styleSelect = document.createElement('select');
            styleSelect.className = 'px-1 py-0.5 border border-gray-300 text-xs bg-white flex-1';
            ['solid', 'dashed', 'dotted'].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
                if (s === item.style) opt.selected = true;
                styleSelect.appendChild(opt);
            });
            styleSelect.addEventListener('change', (e) => {
                item.style = e.target.value;
                this.rerenderChart();
            });

            bottomRow.appendChild(colorInput);
            bottomRow.appendChild(styleSelect);

            div.appendChild(topRow);
            div.appendChild(bottomRow);
            container.appendChild(div);
        });
    },

    handleGenerate: async function() {
        if (this.compareList.length === 0) {
            alert('Please add at least one location to compare.');
            return;
        }

        const issueDate = document.getElementById('issueDateInput').value;
        if (!issueDate) {
            alert('Please select an issue date.');
            return;
        }

        const priceType = document.getElementById('priceTypeSelect').value;

        const params = new URLSearchParams();
        params.append('mode', 'multi_price');
        params.append('issue_date', issueDate);
        params.append('price_type', priceType);
        this.compareList.forEach(item => params.append('locations[]', item.val));

        this.log(`Fetching ${priceType} forward curves for ${this.compareList.length} location(s) on ${issueDate}...`);

        try {
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

            if (!data.dates || !data.series || data.series.length === 0) {
                throw new Error('No forward curve data returned');
            }

            this.forwardData = {
                labels: data.dates,
                series: data.series.map(s => ({ name: s.name, data: s.data })),
                tradeDate: (data.metadata && data.metadata.trade_date) || issueDate,
                issueDate: issueDate,
                priceType: priceType
            };

            const totalPoints = this.forwardData.series.reduce((sum, s) => sum + s.data.filter(v => v !== null && v !== undefined).length, 0);
            this.log(`Received ${totalPoints} prices across ${this.forwardData.series.length} curve(s), ${this.forwardData.labels.length} contract months.`);

            // Setup controls
            this.setupContractRangeDropdowns();
            document.getElementById('contractRangeSection').classList.remove('hidden');
            this.customTitle = null;
            this.setupTitleEditor();
            this.customLegendLabels = {};
            this.setupLegendEditor();
            this.customNote = null;
            this.customSource = null;
            this.setupNoteSource();
            this.customYMin = null;
            this.customYMax = null;
            document.getElementById('yAxisMin').value = '';
            document.getElementById('yAxisMax').value = '';
            document.getElementById('chartControlsSection').classList.remove('hidden');
            document.getElementById('downloadBtn').classList.remove('hidden');

            this.renderChart();
            this.log(`Chart rendered: <strong>750×400px</strong> display • Exports as <strong>1656×894px WebP</strong>`);

        } catch (error) {
            console.error('Error fetching chart data:', error);
            this.log(`<span class="text-red-400">Error: ${error.message}</span>`);
            alert('Failed to load chart data. Please try again.');
        }
    },

    setupContractRangeDropdowns: function() {
        const fromSelect = document.getElementById('contractFrom');
        const toSelect = document.getElementById('contractTo');
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        this.forwardData.labels.forEach((label, idx) => {
            const optFrom = document.createElement('option');
            optFrom.value = String(idx);
            optFrom.textContent = label;
            fromSelect.appendChild(optFrom);

            const optTo = document.createElement('option');
            optTo.value = String(idx);
            optTo.textContent = label;
            toSelect.appendChild(optTo);
        });

        // Default: first and last
        fromSelect.value = '0';
        toSelect.value = String(this.forwardData.labels.length - 1);
    },

    getContractRange: function() {
        const total = this.forwardData.labels.length;
        let fromIdx = parseInt(document.getElementById('contractFrom').value, 10);
        let toIdx = parseInt(document.getElementById('contractTo').value, 10);
        if (isNaN(fromIdx) || fromIdx < 0) fromIdx = 0;
        if (isNaN(toIdx) || toIdx >= total) toIdx = total - 1;
        if (fromIdx > toIdx) [fromIdx, toIdx] = [toIdx, fromIdx];
        return { fromIdx, toIdx };
    },

    getDefaultTitle: function() {
        const priceType = this.forwardData ? this.forwardData.priceType : 'fixed';
        const suffix = priceType === 'basis' ? 'Forward Basis Prices' : 'Forward Natural Gas Prices';
        if (this.compareList.length === 1) {
            return `NGI's ${this.compareList[0].name} ${suffix}`;
        }
        return `NGI's ${suffix}`;
    },

    setupTitleEditor: function() {
        const twoLine = document.getElementById('twoLineTitleCheckbox').checked;
        if (this.customTitle) {
            document.getElementById('titleLine1').value = this.customTitle.line1;
            document.getElementById('titleLine2').value = this.customTitle.line2 || '';
        } else {
            document.getElementById('titleLine1').value = this.getDefaultTitle();
            document.getElementById('titleLine2').value = '';
        }
        document.getElementById('titleLine2').classList.toggle('hidden', !twoLine);
    },

    applyTitle: function() {
        const twoLine = document.getElementById('twoLineTitleCheckbox').checked;
        const line1 = document.getElementById('titleLine1').value.trim();
        const line2 = twoLine ? document.getElementById('titleLine2').value.trim() : '';
        this.customTitle = { line1, line2 };
        this.rerenderChart();
        this.log('Title updated.');
    },

    getTitleText: function() {
        if (this.customTitle) {
            if (this.customTitle.line2) return this.customTitle.line1 + '\n' + this.customTitle.line2;
            return this.customTitle.line1;
        }
        return this.getDefaultTitle();
    },

    styleToEcharts: function(style) {
        if (style === 'dashed') return [10, 6];
        if (style === 'dotted') return [4, 4];
        return 'solid';
    },

    getLegendIcon: function(style) {
        return this.legendIcons[style] || this.legendIcons.solid;
    },

    formatTradeDate: function(dateStr) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const parts = String(dateStr).split('-');
        if (parts.length !== 3) return dateStr;
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        const year = parts[0];
        return `${day}-${month}-${year}`;
    },

    renderChart: function() {
        if (!this.forwardData) return;

        const chartDom = document.getElementById('chart');
        if (this.chart) this.chart.dispose();
        this.chart = echarts.init(chartDom);

        const hideYear = document.getElementById('hideYearCheckbox').checked;
        const hideMonth = document.getElementById('hideMonthCheckbox').checked;
        const showYearUnderJanEl = document.getElementById('showYearUnderJanCheckbox');
        const showYearUnderJan = hideYear && showYearUnderJanEl && showYearUnderJanEl.checked;
        const compact = hideYear || hideMonth; // any simplification = horizontal labels
        const yAxisLabel = (document.getElementById('yAxisLabelInput').value || '').trim() || '$US/MMBtu';

        const titleText = this.getTitleText();
        const isTwoLine = titleText.includes('\n');

        const { fromIdx, toIdx } = this.getContractRange();
        const labels = this.forwardData.labels.slice(fromIdx, toIdx + 1);

        // Build series with per-item colors and styles (compareList order matches API series order)
        const series = this.forwardData.series.map((s, idx) => {
            const item = this.compareList[idx];
            const seriesColor = item ? item.color : this.colorPalette[idx % this.colorPalette.length];
            const lineStyle = item ? item.style : 'solid';
            const displayName = this.customLegendLabels[s.name] || s.name;
            return {
                name: displayName,
                type: 'line',
                data: s.data.slice(fromIdx, toIdx + 1).map(v => (v === null || v === undefined || isNaN(v)) ? null : v),
                color: seriesColor,
                itemStyle: { color: seriesColor },
                lineStyle: {
                    color: seriesColor,
                    width: 3,
                    type: this.styleToEcharts(lineStyle)
                },
                symbol: 'none',
                connectNulls: true
            };
        });

        // Y-axis bounds (use custom overrides if set)
        const allPrices = series.flatMap(s => s.data).filter(p => p !== null && p !== undefined && !isNaN(p));
        if (allPrices.length === 0) {
            this.log('<span class="text-red-400">No prices available for the selected contract range.</span>');
            return;
        }
        const dataMin = Math.min(...allPrices);
        const dataMax = Math.max(...allPrices);
        const effectiveMin = this.customYMin !== null ? this.customYMin : dataMin;
        const effectiveMax = this.customYMax !== null ? this.customYMax : dataMax;
        const interval = this.calculateYAxisInterval(effectiveMin, effectiveMax);
        const adjustedMin = Math.floor(effectiveMin / interval) * interval;
        const adjustedMax = Math.ceil(effectiveMax / interval) * interval;

        // Layout offsets adjust for one-line vs two-line title
        const dividerTop = isTwoLine ? 73 : 63;
        const legendTop = isTwoLine ? 80 : 70;
        const legendPadding = parseFloat(document.getElementById('legendPadding').value) || 0;
        const gridTop = ((isTwoLine ? 28 : 24) + legendPadding) + '%';

        const legendData = series.map((s, idx) => {
            const item = this.compareList[idx];
            const lineStyle = item ? item.style : 'solid';
            return {
                name: s.name,
                icon: this.getLegendIcon(lineStyle),
                itemStyle: { color: s.color }
            };
        });

        // Labels come from the API as "Feb 2026"
        const formatContractLabel = function(value) {
            const parts = String(value).split(' ');
            const mon = parts[0];
            const yr = parts[1] || '';
            if (hideYear) return mon;
            if (hideMonth) return yr;
            return mon + '-' + yr;
        };

        // When showing the year under months, control label skipping ourselves
        // so we know exactly which labels are visible — the year then goes under
        // the FIRST VISIBLE month of each year (not just January, which auto
        // label-skipping can hide).
        let labelInterval = 'auto';
        let labelFormatter = formatContractLabel;
        if (showYearUnderJan) {
            const maxLabels = 16;
            const step = Math.max(1, Math.ceil(labels.length / maxLabels));
            const labelTextByIndex = {};
            const seenYears = new Set();
            for (let i = 0; i < labels.length; i += step) {
                const parts = String(labels[i]).split(' ');
                const mon = parts[0];
                const yr = parts[1] || '';
                if (yr && !seenYears.has(yr)) {
                    seenYears.add(yr);
                    labelTextByIndex[i] = mon + '\n' + yr;
                } else {
                    labelTextByIndex[i] = mon;
                }
            }
            labelInterval = (index) => Object.prototype.hasOwnProperty.call(labelTextByIndex, index);
            labelFormatter = (value, index) => labelTextByIndex[index] || '';
        }

        const option = {
            color: series.map(s => s.color),
            toolbox: { show: false },
            textStyle: { fontFamily: 'Arial' },
            title: [{
                text: titleText,
                left: '3%',
                top: '10',
                textStyle: {
                    color: '#003A50',
                    fontWeight: 'bold',
                    fontSize: isTwoLine ? 21 : 24,
                    lineHeight: isTwoLine ? 24 : 28
                }
            }],
            legend: {
                top: legendTop,
                left: 'center',
                textStyle: {
                    fontFamily: 'Arial',
                    fontSize: 13,
                    color: '#000'
                },
                itemWidth: 30,
                itemHeight: 14,
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
                    top: dividerTop,
                    children: [{
                        type: 'rect',
                        z: 100,
                        left: 'center',
                        top: 'middle',
                        shape: { width: 700, height: 1.4 },
                        style: { fill: '#003A50' }
                    }]
                },
                {
                    type: 'text',
                    left: '3.5%',
                    bottom: '7%',
                    style: {
                        text: `{bold|Note:} ${this.customNote || this.getDefaultNote()}`,
                        font: '12px Arial',
                        rich: {
                            bold: {
                                fontWeight: 'bold',
                                fontSize: 12,
                                fontFamily: 'Arial'
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
                        text: `{bold|Source:} ${this.customSource || this.getDefaultSource()}`,
                        font: '14px Arial',
                        rich: {
                            bold: {
                                fontWeight: 'bold',
                                fontSize: 14,
                                fontFamily: 'Arial'
                            }
                        },
                        fill: '#000'
                    }
                },
                {
                    type: 'text',
                    left: '3%',
                    top: 'middle',
                    rotation: Math.PI / 2,
                    style: {
                        text: yAxisLabel,
                        font: 'bold 12px Arial',
                        fill: '#000'
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (!params || !params.length) return '';
                    let html = `<strong>${params[0].axisValueLabel}</strong>`;
                    params.forEach(p => {
                        if (p.value !== null && p.value !== undefined) {
                            html += `<br/><span style="display:inline-block;width:10px;height:10px;background:${p.color};margin-right:5px;border-radius:50%;"></span>${p.seriesName}: $${p.value.toFixed(3)}`;
                        }
                    });
                    return html;
                }
            },
            grid: {
                left: '5.5%',
                right: '4%',
                top: gridTop,
                bottom: ((compact ? 10 : 14) + (parseFloat(document.getElementById('xAxisPadding').value) || 0)) + '%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: labels,
                axisLabel: {
                    show: !(hideYear && hideMonth),
                    rotate: compact ? 0 : 45,
                    interval: labelInterval,
                    formatter: labelFormatter,
                    verticalAlign: showYearUnderJan ? 'top' : (compact ? 'middle' : 'top'),
                    align: compact ? 'center' : 'right',
                    margin: compact ? 14 : 8,
                    fontSize: compact ? 14 : 13,
                    lineHeight: showYearUnderJan ? 18 : undefined,
                    fontWeight: 510,
                    color: 'black'
                },
                axisLine: {
                    lineStyle: { color: '#D3D3D3' }
                },
                axisTick: {
                    alignWithLabel: true,
                    interval: labelInterval,
                    lineStyle: { color: '#D3D3D3' }
                }
            },
            yAxis: {
                type: 'value',
                min: adjustedMin,
                max: adjustedMax,
                interval: interval,
                axisLabel: {
                    formatter: function(value) {
                        if (value < 0) return `{red|$${value.toFixed(3)}}`;
                        return `$${value.toFixed(3)}`;
                    },
                    fontSize: 14,
                    fontWeight: 510,
                    color: 'black',
                    rich: {
                        red: {
                            color: 'red',
                            fontSize: 14,
                            fontWeight: 510
                        }
                    }
                },
                axisLine: {
                    lineStyle: { color: '#D3D3D3' }
                },
                axisTick: { show: false },
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

    rerenderChart: function() {
        if (!this.forwardData || !this.chart) return;
        this.renderChart();
    },

    calculateYAxisInterval: function(min, max) {
        const range = max - min;
        if (range > 100) return 20;
        if (range > 50) return 10;
        if (range > 20) return 5;
        if (range > 8) return 2;
        if (range > 4) return 1;
        if (range > 2) return 0.5;
        if (range > 0.8) return 0.25;
        return 0.1;
    },

    setupLegendEditor: function() {
        const container = document.getElementById('legendEditorContainer');
        container.innerHTML = '';

        this.forwardData.series.forEach(s => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.customLegendLabels[s.name] || s.name;
            input.dataset.originalName = s.name;
            input.className = 'px-1.5 py-0.5 border border-gray-300 text-xs bg-white w-64';
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyLegendLabels();
            });
            container.appendChild(input);
        });
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

    getDefaultNote: function() {
        const tradeDateFormatted = this.formatTradeDate(this.forwardData.tradeDate);
        const basis = this.forwardData.priceType === 'basis' ? 'Basis prices shown. ' : '';
        return `${basis}Forward Look data as of ${tradeDateFormatted}.`;
    },

    getDefaultSource: function() {
        return "NGI's Forward Look";
    },

    setupNoteSource: function() {
        document.getElementById('noteInput').value = this.customNote || this.getDefaultNote();
        document.getElementById('sourceInput').value = this.customSource || this.getDefaultSource();
    },

    applyNoteSource: function() {
        this.customNote = document.getElementById('noteInput').value.trim();
        this.customSource = document.getElementById('sourceInput').value.trim();
        this.rerenderChart();
        this.log('Note/Source updated.');
    },

    applyYAxisLabel: function() {
        this.rerenderChart();
        this.log('Y-axis label updated.');
    },

    applyYAxis: function() {
        const minVal = document.getElementById('yAxisMin').value;
        const maxVal = document.getElementById('yAxisMax').value;
        this.customYMin = minVal !== '' ? parseFloat(minVal) : null;
        this.customYMax = maxVal !== '' ? parseFloat(maxVal) : null;
        this.rerenderChart();
        this.log('Y-axis range updated.');
    },

    resetYAxis: function() {
        this.customYMin = null;
        this.customYMax = null;
        document.getElementById('yAxisMin').value = '';
        document.getElementById('yAxisMax').value = '';
        this.rerenderChart();
        this.log('Y-axis range reset to auto.');
    },

    downloadChart: function() {
        if (!this.chart) return;

        this.log('Preparing chart for download...');

        const fullChartBase64 = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 4,
            backgroundColor: '#fff'
        });

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Source image is 750*4=3000 x 400*4=1600
            const cropLeft = 40;
            const cropTop = 22;
            const cropWidth = 3000 - 40 - 38;
            const cropHeight = 1600 - 22;

            const targetWidth = 1656;
            const targetHeight = 894;
            const scaleX = targetWidth / cropWidth;
            const scaleY = targetHeight / cropHeight;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = Math.round(cropWidth * scale);
            const scaledHeight = Math.round(cropHeight * scale);

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const offsetX = (targetWidth - scaledWidth) / 2;
            const offsetY = (targetHeight - scaledHeight) / 2;

            ctx.drawImage(
                img,
                cropLeft, cropTop, cropWidth, cropHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                const tradeDate = this.forwardData ? this.forwardData.tradeDate : '';
                const filename = `NGI Forward Curves ${tradeDate}.webp`.replace(/\s+/g, ' ');

                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.log(`Chart downloaded as <strong>${filename}</strong> (1656×894px WebP)`);
            }, 'image/webp');
        };

        img.src = fullChartBase64;
    },

    exportColors: function() {
        if (!this.compareList.length) {
            alert('No color settings to export.');
            return;
        }
        const data = {
            preset: 'Forward Multi Colors',
            colors: this.compareList.map(item => ({ color: item.color, style: item.style }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'forward-multi-colors.json';
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
                data.colors.forEach((c, i) => {
                    if (i < this.compareList.length) {
                        if (c.color) this.compareList[i].color = c.color;
                        if (c.style) this.compareList[i].style = c.style;
                    }
                });
                this.renderCompareList();
                this.rerenderChart();
                this.log(`Imported color settings from <strong>${file.name}</strong>`);
            } catch (err) {
                alert('Could not read color file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => ForwardChartsMulti.init());
