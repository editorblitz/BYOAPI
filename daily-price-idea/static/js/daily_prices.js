
// NGI Daily Prices Pro - Frontend Logic

const App = {
    state: {
        mode: 'standard', // standard | seasonality | compare
        compareList: [],
        chartInstance: null,
        // Full Location Database
        locations: {
            'Favorites': [
                { name: 'National Avg.', value: 'USAVG' },
                { name: 'Henry Hub', value: 'SLAHH' },
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
        this.log('System initialized.');
        
        // Check session
        // Note: Real session check is handled by backend returns.
        // We'll optimistically check sessionStorage but verify via an API call in prod.
        const isLoggedIn = sessionStorage.getItem('ngi_auth');
        if(isLoggedIn) {
            document.getElementById('loginOverlay').classList.add('hidden');
        }
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
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];

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
    },

    setupLocations: function() {
        const regionSelect = document.getElementById('regionSelect');
        Object.keys(this.state.locations).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.text = r;
            regionSelect.appendChild(opt);
        });

        this.updateLocationDropdown();
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

    bindEvents: function() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const key = document.getElementById('loginKey').value;
            
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, apiKey: key})
                });
                const data = await res.json();
                
                if(data.success) {
                    sessionStorage.setItem('ngi_auth', 'true');
                    document.getElementById('loginOverlay').classList.add('hidden');
                    this.log(`Logged in as ${email}`);
                } else {
                    document.getElementById('loginError').textContent = data.error || 'Invalid credentials';
                    document.getElementById('loginError').classList.remove('hidden');
                }
            } catch(err) {
                console.error(err);
                alert("Login connection failed.");
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            fetch('/api/logout', {method:'POST'});
            sessionStorage.removeItem('ngi_auth');
            location.reload();
        });

        // Tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Region Change
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocationDropdown());

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

        // Copy Table
        document.getElementById('copyTableBtn').addEventListener('click', () => {
             const range = document.createRange();
             const tbl = document.querySelector('table');
             if(!tbl) return;
             range.selectNode(tbl);
             window.getSelection().removeAllRanges();
             window.getSelection().addRange(range);
             document.execCommand('copy');
             window.getSelection().removeAllRanges();
             this.log('Table data copied to clipboard.');
             alert('Copied!');
        });
    },

    setMode: function(mode) {
        this.state.mode = mode;
        this.log(`Switched to [${mode.toUpperCase()}] mode.`);

        // Update Tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            if(btn.dataset.mode === mode) {
                btn.className = 'mode-tab flex-1 py-3 text-xs font-bold uppercase tracking-wide text-brand-600 border-b-2 border-brand-600 bg-brand-50';
            } else {
                btn.className = 'mode-tab flex-1 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-50 transition-colors';
            }
        });

        // Toggle Inputs
        const dateSec = document.getElementById('dateSection');
        const seasonSec = document.getElementById('seasonalitySection');
        const compareSec = document.getElementById('compareListSection');
        const addBtn = document.getElementById('addToCompareBtn');
        const chartBadge = document.getElementById('chartBadge');

        chartBadge.textContent = `${mode} Mode`;

        if(mode === 'standard') {
            dateSec.classList.remove('hidden');
            seasonSec.classList.add('hidden');
            compareSec.classList.add('hidden');
            addBtn.classList.add('hidden');
        } else if(mode === 'seasonality') {
            dateSec.classList.add('hidden');
            seasonSec.classList.remove('hidden');
            compareSec.classList.add('hidden');
            addBtn.classList.add('hidden');
        } else if(mode === 'compare') {
            dateSec.classList.remove('hidden');
            seasonSec.classList.add('hidden');
            compareSec.classList.remove('hidden');
            addBtn.classList.remove('hidden');
        }
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
            container.innerHTML = '<p class="text-xs text-gray-400 italic">No locations added.</p>';
            return;
        }

        this.state.compareList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-white p-2 rounded border border-gray-200 shadow-sm text-sm';
            div.innerHTML = `
                <span class="truncate pr-2">${item.name}</span>
                <button class="text-gray-400 hover:text-red-500 font-bold px-1" onclick="App.removeFromCompare('${item.val}')">×</button>
            `;
            container.appendChild(div);
        });
    },

    analyze: async function() {
        const btn = document.getElementById('analyzeBtn');
        const statusDot = document.getElementById('statusDot');
        
        // Validation
        if(this.state.mode === 'compare' && this.state.compareList.length === 0) {
            alert('Please add at least one location to compare.');
            return;
        }

        // Loading State
        btn.textContent = 'Fetching...';
        btn.disabled = true;
        statusDot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';

        // Build Params
        const params = new URLSearchParams();
        params.append('mode', this.state.mode);
        params.append('startDate', document.getElementById('startDate').value);
        params.append('endDate', document.getElementById('endDate').value);
        
        if(this.state.mode === 'compare') {
            this.state.compareList.forEach(l => {
                params.append('locations[]', l.val);
                params.append('locationNames[]', l.name);
            });
        } else {
            params.append('location', document.getElementById('locationSelect').value);
        }

        if(this.state.mode === 'seasonality') {
            params.append('year', document.getElementById('analysisYear').value);
            params.append('showRange', document.getElementById('showFiveYear').checked);
        }

        try {
            this.log(`Requesting analysis: ${params.toString()}`);
            const res = await fetch(`/api/analyze?${params.toString()}`);
            
            // Handle HTTP Errors
            if(res.status === 401) {
                document.getElementById('loginOverlay').classList.remove('hidden');
                throw new Error("Session expired. Please log in.");
            }
            if(!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || `API Error ${res.status}`);
            }
            
            const data = await res.json();
            
            this.renderChart(data);
            this.renderTable(data);
            this.log(`Analysis complete. Received ${data.dates.length} points.`);

        } catch(err) {
            this.log(`Error: ${err.message}`);
            alert(err.message);
        } finally {
            btn.textContent = 'Submit';
            btn.disabled = false;
            statusDot.className = 'w-2 h-2 rounded-full bg-green-500';
        }
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chartContainer');
        if(!this.state.chartInstance) {
            this.state.chartInstance = echarts.init(chartDom);
            window.addEventListener('resize', () => this.state.chartInstance.resize());
        }

        // Process Series for Tooltip formatting
        const option = {
            animation: true,
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                textStyle: { color: '#1f2937', fontSize: 12 },
                formatter: function(params) {
                    let html = `<div class="font-bold mb-1">${params[0].axisValueLabel}</div>`;
                    params.forEach(p => {
                        if(p.seriesName.includes('5-Year Min') || p.seriesName.includes('5-Year Max')) return; // skip ranges in tooltip
                        const val = typeof p.value === 'number' ? `$${p.value.toFixed(3)}` : '-';
                        html += `
                        <div class="flex justify-between gap-4 text-xs">
                           <span><span style="color:${p.color}">●</span> ${p.seriesName}</span>
                           <span class="font-mono font-medium">${val}</span>
                        </div>`;
                    });
                    return html;
                }
            },
            legend: {
                show: true,
                top: 0,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { color: '#4b5563' },
                data: data.series.filter(s => !s.name.includes('5-Year')).map(s => s.name)
            },
            grid: { top: 40, right: 20, bottom: 20, left: 50, containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.dates,
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#6b7280' }
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: '#f3f4f6' } },
                axisLabel: { color: '#6b7280', formatter: (v) => `$${v.toFixed(2)}` }
            },
            series: data.series
        };

        this.state.chartInstance.setOption(option, true);
    },

    renderTable: function(data) {
        // Headers
        const headerRow = document.getElementById('tableHeaderRow');
        headerRow.innerHTML = '';
        data.table_columns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 border-b border-gray-100 bg-gray-50/95';
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
            tr.className = 'hover:bg-blue-50/30 transition-colors';

            // Get values in the correct order based on mode
            let values = [];
            if (mode === 'standard') {
                values = [row.date, row.avg, row.high, row.low, row.vol, row.deals];
            } else if (mode === 'seasonality') {
                values = [row.date, row.curr, row.prev, row.diff, row.pct];
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
                td.className = 'px-6 py-3 font-medium text-gray-600';

                if (val === null || val === undefined) {
                    td.textContent = '-';
                } else if (typeof val === 'number') {
                    // Format based on column type
                    const colName = data.table_columns[idx] || '';

                    if (colName.includes('%') || colName.toLowerCase().includes('pct')) {
                        // Percentage column
                        td.textContent = val.toFixed(2) + '%';
                        if (val > 0) {
                            td.classList.add('text-green-600');
                            td.textContent = '+' + td.textContent;
                        } else if (val < 0) {
                            td.classList.add('text-red-600');
                        }
                    } else if (colName.toLowerCase().includes('vol') || colName.toLowerCase().includes('deals')) {
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
                    } else {
                        // Price column
                        td.textContent = '$' + val.toFixed(3);
                    }
                } else {
                    td.textContent = val;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => App.init());
