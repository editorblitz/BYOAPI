/**
 * Spot + Forward Charts - Publication-ready NGI combined spot & forward charts
 * Shows daily spot prices (solid) transitioning to forward curve (dotted)
 * Generates charts at 750x400px, exports as 1656x894px WebP (2x resolution)
 */

const SpotForwardCharts = {
    chart: null,
    spotData: null,       // { dates: [], prices: [] }
    forwardData: null,    // { contracts: [], prices: [], tradeDate: '', displayDates: [] }
    customLegendLabels: {},
    customTitle: null, // { line1, line2 } or null for auto
    customNote: null,  // string or null for auto
    customSource: null, // string or null for auto
    customYMin: null,  // number or null for auto
    customYMax: null,  // number or null for auto

    // Default series names
    SPOT_NAME: 'Daily Spot',
    FWD_NAME: 'Forward Look',

    // SVG path icons for legend
    legendIcons: {
        solid:  'path://M0,5L40,5L40,7L0,7Z',
        dashed: 'path://M0,5L10,5L10,7L0,7Z M15,5L25,5L25,7L15,7Z M30,5L40,5L40,7L30,7Z',
        dotted: 'path://M0,5L4,5L4,7L0,7Z M8,5L12,5L12,7L8,7Z M16,5L20,5L20,7L16,7Z M24,5L28,5L28,7L24,7Z M32,5L36,5L36,7L32,7Z'
    },

    // Location data (full list)
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

    formatLocalDate: function(d) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    init: function() {
        this.setupDropdowns();
        this.bindEvents();
        this.setupLogToggle();
        this.log('Spot + Forward Charts system initialized.');
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

    getLocationName: function() {
        const sel = document.getElementById('locationSelect');
        return sel.options[sel.selectedIndex]?.text || 'Unknown';
    },

    bindEvents: function() {
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocations());
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
            if (this.spotData && this.forwardData && this.chart) this.rerenderChart();
        });
        document.getElementById('showYearUnderJanCheckbox').addEventListener('change', () => {
            if (this.spotData && this.forwardData && this.chart) this.rerenderChart();
        });
        document.getElementById('hideMonthCheckbox').addEventListener('change', () => {
            if (this.spotData && this.forwardData && this.chart) this.rerenderChart();
        });
        document.getElementById('xAxisPadding').addEventListener('input', () => {
            if (this.spotData && this.forwardData && this.chart) this.rerenderChart();
        });

        // Two-line title checkbox toggles second input
        document.getElementById('twoLineTitleCheckbox').addEventListener('change', (e) => {
            document.getElementById('titleLine2').classList.toggle('hidden', !e.target.checked);
            if (e.target.checked) {
                // Pre-fill line 2 if empty
                const line2 = document.getElementById('titleLine2');
                if (!line2.value) line2.value = 'Daily & Forward Natural Gas Prices';
            }
        });

        // Enter key in title inputs triggers apply
        ['titleLine1', 'titleLine2'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyTitle();
            });
        });

        // Live re-render on color/style changes
        ['spotColor', 'fwdColor', 'spotStyle', 'fwdStyle'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                if (this.spotData && this.forwardData && this.chart) this.rerenderChart();
            });
        });
    },

    handleGenerate: async function() {
        const location = document.getElementById('locationSelect').value;
        const historyPeriod = document.getElementById('spotHistorySelect').value;
        const locationName = this.getLocationName();

        this.log(`Generating chart for <strong>${locationName}</strong>...`);

        // Calculate spot date range
        const today = new Date();
        const startDate = new Date(today);
        if (historyPeriod === '3m') startDate.setMonth(startDate.getMonth() - 3);
        else if (historyPeriod === '6m') startDate.setMonth(startDate.getMonth() - 6);
        else if (historyPeriod === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
        else if (historyPeriod === '2y') startDate.setFullYear(startDate.getFullYear() - 2);
        else if (historyPeriod === '3y') startDate.setFullYear(startDate.getFullYear() - 3);
        else if (historyPeriod === '4y') startDate.setFullYear(startDate.getFullYear() - 4);
        else if (historyPeriod === '5y') startDate.setFullYear(startDate.getFullYear() - 5);

        const startStr = this.formatLocalDate(startDate);
        const endStr = this.formatLocalDate(today);

        try {
            // Fetch latest forward issue date
            this.log('Fetching latest forward issue date...');
            const latestResp = await fetch('/api/forward-latest-date');
            const latestData = await latestResp.json();

            if (!latestData.success || !latestData.latest_issue_date) {
                throw new Error('Could not determine latest forward issue date');
            }
            const latestIssueDate = latestData.latest_issue_date;
            this.log(`Latest forward issue date: <strong>${latestIssueDate}</strong>`);

            // Fetch spot and forward data in parallel
            this.log('Fetching spot prices and forward curve...');
            const [spotResp, fwdResp] = await Promise.all([
                fetch(`/api/daily-prices?mode=standard&location=${location}&start_date=${startStr}&end_date=${endStr}`),
                fetch(`/api/forward-prices?mode=single_price&location=${location}&issue_dates[]=${latestIssueDate}&price_type=fixed`)
            ]);

            const spotJson = await spotResp.json();
            const fwdJson = await fwdResp.json();

            if (spotJson.error) throw new Error('Spot data: ' + spotJson.error);
            if (fwdJson.error) throw new Error('Forward data: ' + fwdJson.error);

            if (!spotJson.dates || !spotJson.series || spotJson.series.length === 0) {
                throw new Error('No spot price data returned');
            }
            if (!fwdJson.raw_records || fwdJson.raw_records.length === 0) {
                throw new Error('No forward price data returned');
            }

            // Store data
            this.spotData = {
                dates: spotJson.dates,
                prices: spotJson.series[0].data
            };

            const rawFwd = fwdJson.raw_records[0];
            this.forwardData = {
                contracts: rawFwd.contracts,
                prices: rawFwd.prices,
                tradeDate: rawFwd.trade_date,
                displayDates: fwdJson.dates
            };

            this.log(`Spot: ${this.spotData.dates.length} daily prices | Forward: ${this.forwardData.contracts.length} contract months`);

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

            // Render
            this.renderChart();
            this.log(`Chart rendered: <strong>750\u00d7400px</strong> display \u2022 spot + forward series`);

        } catch (error) {
            console.error('Error:', error);
            this.log(`<span class="text-red-400">Error: ${error.message}</span>`);
            alert('Failed to load chart data. Please try again.');
        }
    },

    setupContractRangeDropdowns: function() {
        const fromSelect = document.getElementById('contractFrom');
        const toSelect = document.getElementById('contractTo');
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        this.forwardData.displayDates.forEach((label, idx) => {
            const contractVal = this.forwardData.contracts[idx];
            const optFrom = document.createElement('option');
            optFrom.value = contractVal;
            optFrom.textContent = label;
            fromSelect.appendChild(optFrom);

            const optTo = document.createElement('option');
            optTo.value = contractVal;
            optTo.textContent = label;
            toSelect.appendChild(optTo);
        });

        // Default: first and last
        fromSelect.value = this.forwardData.contracts[0];
        toSelect.value = this.forwardData.contracts[this.forwardData.contracts.length - 1];
    },

    getFilteredForwardData: function() {
        const fromVal = document.getElementById('contractFrom').value;
        const toVal = document.getElementById('contractTo').value;
        const fromIdx = this.forwardData.contracts.indexOf(fromVal);
        const toIdx = this.forwardData.contracts.indexOf(toVal);

        if (fromIdx !== -1 && toIdx !== -1 && fromIdx <= toIdx) {
            return {
                contracts: this.forwardData.contracts.slice(fromIdx, toIdx + 1),
                prices: this.forwardData.prices.slice(fromIdx, toIdx + 1),
                tradeDate: this.forwardData.tradeDate
            };
        }
        return this.forwardData;
    },

    getSeriesColors: function() {
        return {
            spotColor: document.getElementById('spotColor').value,
            spotStyle: document.getElementById('spotStyle').value,
            fwdColor: document.getElementById('fwdColor').value,
            fwdStyle: document.getElementById('fwdStyle').value
        };
    },

    getDefaultTitle: function() {
        const locationName = this.getLocationName();
        return `NGI's ${locationName} Daily & Forward Natural Gas Prices`;
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
        const parts = dateStr.split('-');
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        const year = parts[0];
        return `${day}-${month}-${year}`;
    },

    renderChart: function() {
        const chartDom = document.getElementById('chart');
        if (this.chart) this.chart.dispose();
        this.chart = echarts.init(chartDom);

        const hideYear = document.getElementById('hideYearCheckbox').checked;
        const hideMonth = document.getElementById('hideMonthCheckbox').checked;
        const showYearUnderJanEl = document.getElementById('showYearUnderJanCheckbox');
        const showYearUnderJan = hideYear && showYearUnderJanEl && showYearUnderJanEl.checked;
        const compact = hideYear || hideMonth; // any simplification = horizontal labels
        const colors = this.getSeriesColors();
        const fwd = this.getFilteredForwardData();
        const spot = this.spotData;
        const yAxisLabel = (document.getElementById('yAxisLabelInput').value || '').trim() || '$US/MMBtu';

        const titleText = this.getTitleText();
        const isTwoLine = titleText.includes('\n');
        const tradeDateFormatted = this.formatTradeDate(fwd.tradeDate);

        // Display names (with custom legend labels)
        const spotName = this.customLegendLabels[this.SPOT_NAME] || this.SPOT_NAME;
        const fwdName = this.customLegendLabels[this.FWD_NAME] || this.FWD_NAME;

        // Build time-series data
        const spotSeriesData = spot.dates.map((d, i) => {
            const price = spot.prices[i];
            return (price === null || price === undefined || isNaN(price)) ? [d, null] : [d, price];
        });

        const fwdSeriesData = fwd.contracts.map((d, i) => {
            const price = fwd.prices[i];
            return (price === null || price === undefined || isNaN(price)) ? [d, null] : [d, price];
        });

        // Y-axis bounds (use custom overrides if set)
        const allPrices = [
            ...spot.prices.filter(p => p !== null && p !== undefined && !isNaN(p)),
            ...fwd.prices.filter(p => p !== null && p !== undefined && !isNaN(p))
        ];
        const dataMin = Math.min(...allPrices);
        const dataMax = Math.max(...allPrices);
        const effectiveMin = this.customYMin !== null ? this.customYMin : dataMin;
        const effectiveMax = this.customYMax !== null ? this.customYMax : dataMax;
        const interval = this.calculateYAxisInterval(effectiveMin, effectiveMax);
        const adjustedMin = Math.floor(effectiveMin / interval) * interval;
        const adjustedMax = Math.ceil(effectiveMax / interval) * interval;

        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Layout offsets adjust for one-line vs two-line title
        const dividerTop = isTwoLine ? 73 : 63;
        const legendTop = isTwoLine ? 80 : 70;
        const gridTop = isTwoLine ? '28%' : '24%';

        const option = {
            color: [colors.spotColor, colors.fwdColor],
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
                data: [
                    { name: spotName, icon: this.getLegendIcon(colors.spotStyle), itemStyle: { color: colors.spotColor } },
                    { name: fwdName, icon: this.getLegendIcon(colors.fwdStyle), itemStyle: { color: colors.fwdColor } }
                ]
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
                    const ts = params[0].data[0];
                    const d = new Date(ts);
                    const day = d.getUTCDate();
                    const mon = months[d.getUTCMonth()];
                    const year = d.getUTCFullYear();
                    const dateStr = `${day}-${mon}-${year}`;

                    let html = `<strong>${dateStr}</strong>`;
                    params.forEach(p => {
                        if (p.data[1] !== null && p.data[1] !== undefined) {
                            html += `<br/><span style="display:inline-block;width:10px;height:10px;background:${p.color};margin-right:5px;border-radius:50%;"></span>${p.seriesName}: $${p.data[1].toFixed(3)}`;
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
                type: 'time',
                splitNumber: 12,
                minInterval: 30 * 24 * 3600 * 1000,  // ~1 month minimum between labels
                axisLabel: {
                    show: !(hideYear && hideMonth),
                    rotate: compact ? 0 : 45,
                    formatter: function(value) {
                        const d = new Date(value);
                        const mon = months[d.getUTCMonth()];
                        const yr = d.getUTCFullYear();
                        if (showYearUnderJan && d.getUTCMonth() === 0) return mon + '\n' + yr;
                        if (hideYear) return mon;
                        if (hideMonth) return yr.toString();
                        return mon + '-' + yr;
                    },
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
            series: [
                {
                    name: spotName,
                    type: 'line',
                    data: spotSeriesData,
                    color: colors.spotColor,
                    itemStyle: { color: colors.spotColor },
                    lineStyle: {
                        color: colors.spotColor,
                        width: 3,
                        type: this.styleToEcharts(colors.spotStyle)
                    },
                    symbol: 'none',
                    connectNulls: true
                },
                {
                    name: fwdName,
                    type: 'line',
                    data: fwdSeriesData,
                    color: colors.fwdColor,
                    itemStyle: { color: colors.fwdColor },
                    lineStyle: {
                        color: colors.fwdColor,
                        width: 3,
                        type: this.styleToEcharts(colors.fwdStyle)
                    },
                    symbol: 'none',
                    connectNulls: true
                }
            ]
        };

        this.chart.setOption(option);
    },

    rerenderChart: function() {
        if (!this.spotData || !this.forwardData) return;
        this.renderChart();
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

    setupLegendEditor: function() {
        const container = document.getElementById('legendEditorContainer');
        container.innerHTML = '';

        [this.SPOT_NAME, this.FWD_NAME].forEach(name => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.customLegendLabels[name] || name;
            input.dataset.originalName = name;
            input.className = 'px-1.5 py-0.5 border border-gray-300 text-xs bg-white w-32';
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
        return `Forward Look data as of ${tradeDateFormatted}.`;
    },

    getDefaultSource: function() {
        return "NGI's Daily Gas Price Index, NGI's Forward Look";
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

                const locationName = this.getLocationName();
                const filename = `NGI ${locationName} Spot+Forward.webp`;

                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.log(`Chart downloaded as <strong>${filename}</strong> (1656\u00d7894px WebP)`);
            }, 'image/webp');
        };

        img.src = fullChartBase64;
    },

    exportColors: function() {
        const colors = this.getSeriesColors();
        const data = {
            preset: 'Spot+Forward Colors',
            colors: [
                { color: colors.spotColor, style: colors.spotStyle },
                { color: colors.fwdColor, style: colors.fwdStyle }
            ]
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'spot-forward-colors.json';
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
                if (!data.colors || !Array.isArray(data.colors) || data.colors.length < 2) {
                    throw new Error('Invalid format: need colors array with 2 entries');
                }
                if (data.colors[0].color) document.getElementById('spotColor').value = data.colors[0].color;
                if (data.colors[0].style) document.getElementById('spotStyle').value = data.colors[0].style;
                if (data.colors[1].color) document.getElementById('fwdColor').value = data.colors[1].color;
                if (data.colors[1].style) document.getElementById('fwdStyle').value = data.colors[1].style;

                if (this.spotData && this.forwardData) this.rerenderChart();
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
document.addEventListener('DOMContentLoaded', () => SpotForwardCharts.init());
