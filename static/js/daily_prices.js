
// NGI Daily Prices Pro - Frontend Logic

const App = {
    state: {
        mode: 'standard', // standard | seasonality | compare
        compareList: [],
        chartInstance: null,
        rawRecords: [],
        hiddenSeries: new Set(), // Track hidden series by name
        yAxisZoomEnabled: false, // Track y-axis zoom state
        // Full Location Database
        locations: {
            'Favorites': [
                { name: 'Henry Hub', value: 'SLAHH' },
                { name: 'National Avg.', value: 'USAVG' },
                { name: 'Waha', value: 'WTXWAHA' }
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
        }
    },

    // --- INITIALIZATION ---
    init: function() {
        this.setupLocations();
        this.setupDates();
        this.bindEvents();
        this.setMode(this.state.mode);
        this.setSystemStatus('ready');
        this.log('System initialized.');
        this.analyze();
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
        if(lastLog) lastLog.textContent = msg;
    },

    setupDates: function() {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = oneMonthAgo.toISOString().split('T')[0];

        // Set 1M as default active timeframe
        const oneMonthBtn = document.querySelector('.timeframe-btn[data-timeframe="1M"]');
        if(oneMonthBtn) {
            oneMonthBtn.classList.add('active');
        }

        // Populate Years
        const yearSelect = document.getElementById('analysisYear');
        const currentYear = today.getFullYear();
        for(let i=0; i<10; i++) {
            const yr = currentYear - i;
            const opt = document.createElement('option');
            opt.value = yr;
            opt.text = `${yr} vs ${yr-1}`;
            yearSelect.appendChild(opt);
        }

        yearSelect.value = currentYear;
    },

    setupLocations: function() {
        // Setup main location select (for standard/seasonality modes)
        const regionSelect = document.getElementById('regionSelect');
        regionSelect.innerHTML = '';
        Object.keys(this.state.locations).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.text = r;
            regionSelect.appendChild(opt);
        });

        if(regionSelect.options.length > 0) {
            regionSelect.value = regionSelect.options[0].value;
        }

        this.updateLocationDropdown();

        // Setup spreads location selects (Location 1 and Location 2)
        ['1', '2'].forEach(num => {
            const regionSelectSpread = document.getElementById(`regionSelect${num}`);
            if (regionSelectSpread) {
                regionSelectSpread.innerHTML = '';
                Object.keys(this.state.locations).forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.text = r;
                    regionSelectSpread.appendChild(opt);
                });

                if(regionSelectSpread.options.length > 0) {
                    regionSelectSpread.value = regionSelectSpread.options[0].value;
                }

                this.updateSpreadsLocationDropdown(num);
            }
        });
    },

    updateLocationDropdown: function() {
        const region = document.getElementById('regionSelect').value;
        const locSelect = document.getElementById('locationSelect');
        locSelect.innerHTML = '';

        const locs = this.state.locations[region] || [];
        locs.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.value;
            opt.text = l.name;
            opt.dataset.name = l.name;
            locSelect.appendChild(opt);
        });
    },

    updateSpreadsLocationDropdown: function(locationNum) {
        const regionSelect = document.getElementById(`regionSelect${locationNum}`);
        const locSelect = document.getElementById(`locationSelect${locationNum}`);
        if (!regionSelect || !locSelect) return;

        const region = regionSelect.value;
        locSelect.innerHTML = '';

        const locs = this.state.locations[region] || [];
        locs.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.value;
            opt.text = l.name;
            opt.dataset.name = l.name;
            locSelect.appendChild(opt);
        });
    },

    bindEvents: function() {
        // Tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTimeframe(e.target.dataset.timeframe);
            });
        });

        // Clear timeframe selection when dates are manually changed
        document.getElementById('startDate').addEventListener('change', () => {
            document.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
        });
        document.getElementById('endDate').addEventListener('change', () => {
            document.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
        });

        // Region Change
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocationDropdown());

        // Spreads region changes
        const regionSelect1 = document.getElementById('regionSelect1');
        const regionSelect2 = document.getElementById('regionSelect2');
        if (regionSelect1) {
            regionSelect1.addEventListener('change', () => this.updateSpreadsLocationDropdown('1'));
        }
        if (regionSelect2) {
            regionSelect2.addEventListener('change', () => this.updateSpreadsLocationDropdown('2'));
        }

        // Add to Compare
        document.getElementById('addToCompareBtn').addEventListener('click', () => {
            const sel = document.getElementById('locationSelect');
            if(sel.selectedIndex >= 0) {
                const opt = sel.options[sel.selectedIndex];
                this.addToCompare(opt.value, opt.dataset.name);
            }
        });

        // Analyze
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());

        // Log Drawer
        document.getElementById('logToggle').addEventListener('click', () => {
            const drawer = document.getElementById('logDrawer');
            const arrow = document.getElementById('logArrow');
            if(drawer.classList.contains('h-0')) {
                drawer.classList.remove('h-0');
                drawer.classList.add('h-64');
                arrow.classList.add('rotate-180');
            } else {
                drawer.classList.add('h-0');
                drawer.classList.remove('h-64');
                arrow.classList.remove('rotate-180');
            }
        });

        // Copy actions
        const copyTableBtn = document.getElementById('copyTableBtn');
        if(copyTableBtn) {
            copyTableBtn.addEventListener('click', () => this.copyTable());
        }

        const copyFlowBtn = document.getElementById('copyFlowBtn');
        if(copyFlowBtn) {
            copyFlowBtn.addEventListener('click', () => this.copyFlowSeries());
        }

        const copyTradeBtn = document.getElementById('copyTradeBtn');
        if(copyTradeBtn) {
            copyTradeBtn.addEventListener('click', () => this.copyTradeSeries());
        }

        // Y-Axis Zoom toggle
        const yZoomToggle = document.getElementById('toggleYZoom');
        if(yZoomToggle) {
            yZoomToggle.addEventListener('change', (e) => this.toggleYAxisZoom(e.target.checked));
        }
    },

    setMode: function(mode) {
        this.state.mode = mode;
        this.state.hiddenSeries.clear(); // Reset hidden series when changing modes
        this.log(`Switched to [${mode.toUpperCase()}] mode.`);

        // Update Tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            if(btn.dataset.mode === mode) {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-900 border-b-2 border-gray-900 bg-white';
            } else {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-600 hover:bg-gray-50';
            }
        });

        // Toggle Inputs
        const dateSec = document.getElementById('dateSection');
        const seasonSec = document.getElementById('seasonalitySection');
        const compareSec = document.getElementById('compareListSection');
        const addBtn = document.getElementById('addToCompareBtn');
        const singleLocationSec = document.getElementById('singleLocationSection');
        const spreadsLoc1Sec = document.getElementById('spreadsLocation1Section');
        const spreadsLoc2Sec = document.getElementById('spreadsLocation2Section');
        const timeframeSec = document.getElementById('timeframeSection');

        if(mode === 'standard') {
            dateSec.classList.remove('hidden');
            seasonSec.classList.add('hidden');
            compareSec.classList.add('hidden');
            addBtn.classList.add('hidden');
            singleLocationSec.classList.remove('hidden');
            spreadsLoc1Sec.classList.add('hidden');
            spreadsLoc2Sec.classList.add('hidden');
            timeframeSec.classList.remove('hidden');
        } else if(mode === 'seasonality') {
            dateSec.classList.add('hidden');
            seasonSec.classList.remove('hidden');
            compareSec.classList.add('hidden');
            addBtn.classList.add('hidden');
            singleLocationSec.classList.remove('hidden');
            spreadsLoc1Sec.classList.add('hidden');
            spreadsLoc2Sec.classList.add('hidden');
            timeframeSec.classList.add('hidden');
        } else if(mode === 'compare') {
            dateSec.classList.remove('hidden');
            seasonSec.classList.add('hidden');
            compareSec.classList.remove('hidden');
            addBtn.classList.remove('hidden');
            singleLocationSec.classList.remove('hidden');
            spreadsLoc1Sec.classList.add('hidden');
            spreadsLoc2Sec.classList.add('hidden');
            timeframeSec.classList.remove('hidden');
        } else if(mode === 'spreads') {
            dateSec.classList.remove('hidden');
            seasonSec.classList.add('hidden');
            compareSec.classList.add('hidden');
            addBtn.classList.add('hidden');
            singleLocationSec.classList.add('hidden');
            spreadsLoc1Sec.classList.remove('hidden');
            spreadsLoc2Sec.classList.remove('hidden');
            timeframeSec.classList.remove('hidden');
        }

        this.updateCopyButtons();
    },

    setTimeframe: function(timeframe) {
        const endDate = new Date();
        const startDate = new Date();

        // Calculate start date based on timeframe
        switch(timeframe) {
            case '1M':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case '2M':
                startDate.setMonth(endDate.getMonth() - 2);
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

        // Update date inputs
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];

        // Update button states
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            if(btn.dataset.timeframe === timeframe) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.log(`Timeframe set to ${timeframe}`);
    },

    setSystemStatus: function(state) {
        const dot = document.getElementById('statusDot');
        const label = document.getElementById('statusLabel');
        if(!dot || !label) return;

        const base = 'w-2 h-2 rounded-full';

        switch(state) {
            case 'working':
                dot.className = `${base} bg-yellow-500 animate-pulse`;
                label.textContent = 'Working';
                break;
            case 'error':
                dot.className = `${base} bg-red-500`;
                label.textContent = 'Attention Needed';
                break;
            default:
                dot.className = `${base} bg-green-500`;
                label.textContent = 'Ready';
        }
    },

    updateCopyButtons: function() {
        const disable = this.state.mode !== 'standard' || this.state.rawRecords.length === 0;
        ['copyFlowBtn', 'copyTradeBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if(!btn) return;
            btn.disabled = disable;
            btn.classList.toggle('opacity-40', disable);
            btn.classList.toggle('cursor-not-allowed', disable);
        });
    },

    addToCompare: function(val, name) {
        if(this.state.compareList.some(i => i.val === val)) return;
        
        this.state.compareList.push({val, name});
        this.renderCompareList();
        this.log(`Added ${name} to comparison.`);
    },

    removeFromCompare: function(val) {
        this.state.compareList = this.state.compareList.filter(i => i.val !== val);
        this.renderCompareList();
    },

    renderCompareList: function() {
        const container = document.getElementById('compareListContainer');
        container.innerHTML = '';

        if(this.state.compareList.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-500 italic">No locations added.</p>';
            return;
        }

        this.state.compareList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-white p-2 border border-gray-300 text-sm';

            const label = document.createElement('span');
            label.className = 'truncate pr-2';
            label.textContent = item.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => this.removeFromCompare(item.val));

            div.appendChild(label);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    },

    analyze: async function() {
        const btn = document.getElementById('analyzeBtn');
        const mode = this.state.mode;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const locationValue = document.getElementById('locationSelect').value;

        if(mode === 'compare' && this.state.compareList.length === 0) {
            alert('Please add at least one location to compare.');
            return;
        }

        if(mode !== 'seasonality' && (!startDate || !endDate)) {
            alert('Please choose a start and end date.');
            return;
        }

        if(mode === 'seasonality' && !document.getElementById('analysisYear').value) {
            alert('Select an analysis year.');
            return;
        }

        btn.textContent = 'Fetching...';
        btn.disabled = true;
        this.setSystemStatus('working');

        this.state.rawRecords = [];
        this.state.hiddenSeries.clear(); // Reset hidden series for new analysis
        this.updateCopyButtons();

        const params = new URLSearchParams();
        params.append('mode', mode);

        if(mode === 'seasonality') {
            params.append('location', locationValue);
            params.append('year', document.getElementById('analysisYear').value);
            params.append('showRange', document.getElementById('showFiveYear').checked);
        } else if(mode === 'spreads') {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
            params.append('location1', document.getElementById('locationSelect1').value);
            params.append('location2', document.getElementById('locationSelect2').value);
        } else {
            params.append('start_date', startDate);
            params.append('end_date', endDate);

            if(mode === 'compare') {
                this.state.compareList.forEach(l => {
                    params.append('locations[]', l.val);
                    params.append('locationNames[]', l.name);
                });
            } else {
                params.append('location', locationValue);
            }
        }

        try {
            this.log(`Requesting analysis: ${params.toString()}`);
            const res = await fetch(`/api/daily-prices?${params.toString()}`);
            const text = await res.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch(parseErr) {
                throw new Error('Unexpected response from server. Please refresh your session.');
            }

            if(!res.ok) {
                throw new Error(data.error || `API Error ${res.status}`);
            }

            this.state.rawRecords = Array.isArray(data.raw_records) ? data.raw_records : [];
            this.renderChart(data);
            this.renderTable(data);
            this.updateCopyButtons();
            this.log(`Analysis complete. Received ${(data.dates && data.dates.length) || 0} data points.`);

        } catch(err) {
            this.log(`Error: ${err.message}`);
            alert(err.message);
        } finally {
            btn.textContent = 'Submit';
            btn.disabled = false;
            this.setSystemStatus('ready');
        }
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chartContainer');
        if(!this.state.chartInstance) {
            this.state.chartInstance = echarts.init(chartDom);
            window.addEventListener('resize', () => this.state.chartInstance.resize());
        }

        // Update chart title and subtitle
        this.updateChartHeader(data);

        // Update custom legend
        this.updateCustomLegend(data);

        // Bloomberg-style chart options
        const option = {
            animation: true,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: 'transparent',
                textStyle: { color: '#fff', fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' },
                formatter: function(params) {
                    let html = `<div style="font-weight: 600; margin-bottom: 4px;">${params[0].axisValueLabel}</div>`;
                    params.forEach(p => {
                        if(!p.seriesName || p.seriesName === '') return;
                        const val = typeof p.value === 'number' ? `$${p.value.toFixed(3)}` : '-';
                        html += `<div style="margin: 2px 0;"><span style="color:${p.color}">●</span> ${p.seriesName}: ${val}</div>`;
                    });
                    return html;
                }
            },
            legend: {
                show: false
            },
            dataZoom: this.state.yAxisZoomEnabled ? [
                {
                    type: 'slider',
                    yAxisIndex: 0,
                    filterMode: 'none',
                    width: 18,
                    right: 5,
                    top: 20,
                    bottom: 50,
                    showDetail: false,
                    borderColor: '#ccc',
                    fillerColor: 'rgba(107, 114, 128, 0.2)',
                    handleStyle: {
                        color: '#666',
                        borderColor: '#999'
                    }
                },
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    filterMode: 'none'
                }
            ] : undefined,
            grid: {
                left: 50,
                right: this.state.yAxisZoomEnabled ? 130 : 60,
                bottom: 50,
                top: 20,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.dates,
                axisLine: {
                    lineStyle: { color: '#e6e6e6', width: 1 }
                },
                axisTick: { show: false },
                axisLabel: {
                    color: '#666',
                    fontSize: 11,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'right',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#666',
                    fontSize: 11,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    formatter: (v) => `$${v.toFixed(2)}`,
                    align: 'left',
                    margin: 10
                },
                splitLine: {
                    lineStyle: { color: '#f0f0f0', width: 1, type: 'solid' }
                }
            },
            series: data.series.map(s => {
                const isHidden = s.name && this.state.hiddenSeries.has(s.name);
                return {
                    ...s,
                    lineStyle: {
                        ...s.lineStyle,
                        width: s.lineStyle?.width || 3,
                        opacity: isHidden ? 0 : (s.lineStyle?.opacity ?? 1)
                    },
                    itemStyle: {
                        ...s.itemStyle,
                        opacity: isHidden ? 0 : (s.itemStyle?.opacity ?? 1)
                    },
                    smooth: false,
                    silent: isHidden
                };
            })
        };

        this.state.chartInstance.setOption(option, true);
    },

    toggleYAxisZoom: function(enabled) {
        this.state.yAxisZoomEnabled = enabled;

        if (this.state.chartInstance) {
            // Get the current option to preserve series data
            const currentOption = this.state.chartInstance.getOption();

            // Build new option - use notMerge to fully replace
            const newOption = {
                ...currentOption,
                dataZoom: enabled ? [
                    {
                        type: 'slider',
                        yAxisIndex: 0,
                        filterMode: 'none',
                        width: 18,
                        right: 5,
                        top: 20,
                        bottom: 50,
                        showDetail: false,
                        borderColor: '#ccc',
                        fillerColor: 'rgba(107, 114, 128, 0.2)',
                        handleStyle: {
                            color: '#666',
                            borderColor: '#999'
                        }
                    },
                    {
                        type: 'inside',
                        yAxisIndex: 0,
                        filterMode: 'none'
                    }
                ] : undefined,
                grid: {
                    left: 50,
                    right: enabled ? 130 : 60,
                    bottom: 50,
                    top: 20,
                    containLabel: false
                }
            };

            // Use notMerge: true to ensure dataZoom is completely replaced/removed
            this.state.chartInstance.setOption(newOption, { notMerge: true });
        }
    },

    updateChartHeader: function(data) {
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const mode = this.state.mode;

        let title = 'NGI Daily Spot Prices';
        let subtitle = '';

        if (mode === 'standard' && data.raw_records && data.raw_records.length > 0) {
            const locationName = data.raw_records[0].location_name || 'Unknown Location';
            title = locationName;
            const startDate = data.dates[0] || '';
            const endDate = data.dates[data.dates.length - 1] || '';
            subtitle = `Daily spot prices from ${startDate} to ${endDate}`;
        } else if (mode === 'seasonality') {
            // Extract year from table columns (e.g., "2025 Price")
            let year = new Date().getFullYear();
            if (data.table_columns && data.table_columns.length > 1) {
                const yearMatch = data.table_columns[1].match(/(\d{4})/);
                if (yearMatch) year = yearMatch[1];
            }
            const locationName = this.getSelectedLocationName();
            title = locationName;
            const showRange = document.getElementById('showFiveYear')?.checked;
            subtitle = showRange ?
                `Seasonal patterns with 5-year historical range (${year})` :
                `Seasonal price comparison (${year} vs ${year - 1})`;
        } else if (mode === 'compare') {
            title = 'NGI Daily Spot Prices';
            const startDate = data.dates[0] || '';
            const endDate = data.dates[data.dates.length - 1] || '';
            subtitle = `Multi-location comparison from ${startDate} to ${endDate}`;
        } else if (mode === 'spreads') {
            const loc1Name = this.getSpreadsLocationName(1);
            const loc2Name = this.getSpreadsLocationName(2);
            title = `Spread: ${loc1Name} - ${loc2Name}`;
            const startDate = data.dates[0] || '';
            const endDate = data.dates[data.dates.length - 1] || '';
            subtitle = `Price spread from ${startDate} to ${endDate}`;
        }

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
    },

    updateCustomLegend: function(data) {
        const legendEl = document.getElementById('customLegend');
        legendEl.innerHTML = '';

        // Filter out invisible series
        const visibleSeries = data.series.filter(s => s.name && s.name !== '');

        visibleSeries.forEach(series => {
            const seriesName = series.name;
            const isHidden = this.state.hiddenSeries.has(seriesName);

            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 cursor-pointer select-none hover:opacity-75 transition-opacity';

            // Add click handler to toggle series visibility
            item.addEventListener('click', () => this.toggleSeriesVisibility(seriesName));

            const line = document.createElement('div');
            line.className = 'h-0.5 w-5 transition-opacity';
            const color = series.itemStyle?.color || series.lineStyle?.color || '#000';
            line.style.backgroundColor = color;
            if (isHidden) {
                line.style.opacity = '0.3';
            }

            const label = document.createElement('span');
            label.textContent = seriesName;
            label.className = 'text-gray-700 transition-opacity';
            if (isHidden) {
                label.style.opacity = '0.3';
                label.style.textDecoration = 'line-through';
            }

            item.appendChild(line);
            item.appendChild(label);
            legendEl.appendChild(item);
        });
    },

    toggleSeriesVisibility: function(seriesName) {
        if (this.state.hiddenSeries.has(seriesName)) {
            this.state.hiddenSeries.delete(seriesName);
        } else {
            this.state.hiddenSeries.add(seriesName);
        }

        // Re-render the chart with updated visibility
        if (this.state.chartInstance) {
            const option = this.state.chartInstance.getOption();
            const updatedSeries = option.series.map(s => {
                if (s.name && s.name !== '') {
                    return {
                        ...s,
                        lineStyle: {
                            ...s.lineStyle,
                            opacity: this.state.hiddenSeries.has(s.name) ? 0 : 1
                        },
                        itemStyle: {
                            ...s.itemStyle,
                            opacity: this.state.hiddenSeries.has(s.name) ? 0 : 1
                        },
                        silent: this.state.hiddenSeries.has(s.name)
                    };
                }
                return s;
            });

            // Calculate new y-axis range based on visible series
            let minVal = Infinity;
            let maxVal = -Infinity;

            updatedSeries.forEach(s => {
                // Skip hidden series and series without names
                if (!s.name || s.name === '' || this.state.hiddenSeries.has(s.name)) {
                    return;
                }

                // Get data for this series
                const data = s.data || [];
                data.forEach(val => {
                    if (val !== null && val !== undefined && typeof val === 'number') {
                        minVal = Math.min(minVal, val);
                        maxVal = Math.max(maxVal, val);
                    }
                });
            });

            // Add padding to the range (5% on each side)
            if (minVal !== Infinity && maxVal !== -Infinity) {
                const range = maxVal - minVal;
                const padding = range * 0.05;
                minVal = minVal - padding; // Allow negative values for natural gas prices
                maxVal = maxVal + padding;
            } else {
                // If no visible data, reset to auto scale
                minVal = undefined;
                maxVal = undefined;
            }

            this.state.chartInstance.setOption({
                series: updatedSeries,
                yAxis: {
                    min: minVal,
                    max: maxVal,
                    scale: true
                }
            });

            // Update legend styling
            const legendEl = document.getElementById('customLegend');
            const items = legendEl.querySelectorAll('div.flex');
            items.forEach((item, idx) => {
                const line = item.querySelector('div.h-0\\.5');
                const label = item.querySelector('span');
                const seriesNameFromLabel = label.textContent;
                const isHidden = this.state.hiddenSeries.has(seriesNameFromLabel);

                if (isHidden) {
                    line.style.opacity = '0.3';
                    label.style.opacity = '0.3';
                    label.style.textDecoration = 'line-through';
                } else {
                    line.style.opacity = '1';
                    label.style.opacity = '1';
                    label.style.textDecoration = 'none';
                }
            });
        }
    },

    getSelectedLocationName: function() {
        const locationSelect = document.getElementById('locationSelect');
        if (locationSelect.selectedIndex >= 0) {
            return locationSelect.options[locationSelect.selectedIndex].dataset.name ||
                   locationSelect.options[locationSelect.selectedIndex].text;
        }
        return 'Unknown Location';
    },

    getSpreadsLocationName: function(locationNum) {
        const locationSelect = document.getElementById(`locationSelect${locationNum}`);
        if (locationSelect && locationSelect.selectedIndex >= 0) {
            return locationSelect.options[locationSelect.selectedIndex].dataset.name ||
                   locationSelect.options[locationSelect.selectedIndex].text;
        }
        return 'Unknown Location';
    },

    renderTable: function(data) {
        // Headers
        const headerRow = document.getElementById('tableHeaderRow');
        headerRow.innerHTML = '';
        data.table_columns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300';
            th.textContent = col;
            headerRow.appendChild(th);
        });

        // Body
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        // Determine row keys based on mode for proper column ordering
        const mode = this.state.mode;

        data.table_rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            // Get values in the correct order based on mode
            let values = [];
            if (mode === 'standard') {
                values = [
                    row.index, row.pointcode, row.issue_date, row.trade_date,
                    row.region_name, row.location_name, row.low, row.high,
                    row.average, row.volume, row.deals, row.flow_start_date, row.flow_end_date
                ];
            } else if (mode === 'seasonality') {
                values = [row.date, row.curr, row.prev, row.diff, row.pct];
            } else if (mode === 'spreads') {
                values = [row.date, row.location1, row.location2, row.spread];
            } else if (mode === 'compare') {
                // For compare mode, first column is date, then each location
                values = [row.date];
                data.table_columns.slice(1).forEach(col => {
                    values.push(row[col]);
                });
            } else {
                // Fallback to Object.values
                values = Object.values(row);
            }

            values.forEach((val, idx) => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 text-sm text-gray-700';

                if (val === null || val === undefined) {
                    td.textContent = '';
                } else if (typeof val === 'number') {
                    // Format based on column type
                    const colName = data.table_columns[idx] || '';

                    if (colName === 'Index') {
                        // Index column - just the number
                        td.textContent = val;
                    } else if (colName.includes('%') || colName.toLowerCase().includes('pct')) {
                        // Percentage column
                        td.textContent = val.toFixed(2) + '%';
                        if (val > 0) {
                            td.classList.add('text-green-600');
                            td.textContent = '+' + td.textContent;
                        } else if (val < 0) {
                            td.classList.add('text-red-600');
                        }
                    } else if (colName.toLowerCase().includes('volume') || colName.toLowerCase().includes('deals')) {
                        // Volume/Deals - integer format with commas
                        td.textContent = Math.round(val).toLocaleString();
                    } else if (colName.includes('Diff') && !colName.includes('%')) {
                        // Dollar diff column
                        td.textContent = '$' + val.toFixed(3);
                        if (val > 0) {
                            td.classList.add('text-green-600');
                            td.textContent = '+' + td.textContent;
                        } else if (val < 0) {
                            td.classList.add('text-red-600');
                        }
                    } else if (colName === 'Spread' || colName.toLowerCase().includes('spread')) {
                        // Spread column - show with color and sign
                        td.textContent = '$' + val.toFixed(3);
                        if (val > 0) {
                            td.classList.add('text-green-600');
                            td.textContent = '+' + td.textContent;
                        } else if (val < 0) {
                            td.classList.add('text-red-600');
                        }
                    } else {
                        // Price column (Low, High, Average)
                        td.textContent = '$' + val.toFixed(3);
                    }
                } else {
                    // Text columns (dates, codes, names)
                    td.textContent = val;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    },

    copyTable: function() {
        const table = document.querySelector('.daily-prices-pro-container table');
        if(!table) {
            alert('No table data to copy.');
            return;
        }

        const lines = [];
        for(const row of table.rows) {
            const cols = [];
            for(const cell of row.cells) {
                cols.push(cell.innerText.trim());
            }
            lines.push(cols.join('\t'));
        }

        const payload = lines.join('\n');
        if(!payload) {
            alert('Nothing to copy.');
            return;
        }

        this.copyToClipboard(payload)
            .then(() => {
                this.log('Table data copied to clipboard.');
                alert('Copied table data.');
            })
            .catch(err => {
                this.log(`Copy failed: ${err.message}`);
                alert('Unable to copy table data.');
            });
    },

    copyFlowSeries: function() {
        if(this.state.mode !== 'standard') {
            alert('Flow data is only available in Standard mode.');
            return;
        }

        const rows = this.state.rawRecords || [];
        if(!rows.length) {
            alert('No flow data to copy. Run an analysis first.');
            return;
        }

        const validRows = rows.filter(row =>
            row.flow_start_date && row.flow_end_date && typeof row.average === 'number'
        );

        if(!validRows.length) {
            alert('No rows with flow ranges available.');
            return;
        }

        const dateToPrice = new Map();
        for(let i = validRows.length - 1; i >= 0; i--) {
            const row = validRows[i];
            const range = this.getDatesInRange(row.flow_start_date, row.flow_end_date);
            range.forEach(dateStr => {
                if(!dateToPrice.has(dateStr)) {
                    dateToPrice.set(dateStr, row.average);
                }
            });
        }

        if(dateToPrice.size === 0) {
            alert('No flow dates to copy.');
            return;
        }

        const sortedDates = Array.from(dateToPrice.keys()).sort();
        const payload = sortedDates
            .map(date => `${date}\t${dateToPrice.get(date).toFixed(3)}`)
            .join('\n');

        this.copyToClipboard(payload)
            .then(() => {
                this.log('Copied prices by flow date.');
                alert('Copied flow-date series.');
            })
            .catch(err => {
                this.log(`Copy failed: ${err.message}`);
                alert('Unable to copy flow-date series.');
            });
    },

    copyTradeSeries: function() {
        if(this.state.mode !== 'standard') {
            alert('Trade-date export is only available in Standard mode.');
            return;
        }

        const rows = this.state.rawRecords || [];
        if(!rows.length) {
            alert('No trade data to copy. Run an analysis first.');
            return;
        }

        const payload = rows
            .filter(row => row.trade_date && typeof row.average === 'number')
            .map(row => `${row.trade_date}\t${row.average.toFixed(3)}`)
            .sort()
            .join('\n');

        if(!payload) {
            alert('No trade-date rows available.');
            return;
        }

        this.copyToClipboard(payload)
            .then(() => {
                this.log('Copied prices by trade date.');
                alert('Copied trade-date series.');
            })
            .catch(err => {
                this.log(`Copy failed: ${err.message}`);
                alert('Unable to copy trade-date series.');
            });
    },

    getDatesInRange: function(startDate, endDate) {
        const dates = [];
        if(!startDate || !endDate) return dates;

        const current = new Date(startDate + 'T00:00:00Z');
        const end = new Date(endDate + 'T00:00:00Z');
        if(isNaN(current.getTime()) || isNaN(end.getTime())) return dates;

        while(current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return dates;
    },

    copyToClipboard: function(text) {
        if(navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise((resolve, reject) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            try {
                document.execCommand('copy');
                resolve();
            } catch(err) {
                reject(err);
            } finally {
                document.body.removeChild(textarea);
            }
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
