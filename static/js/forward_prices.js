
// NGI Forward Prices - Frontend Logic

const App = {
    state: {
        mode: 'single_price',
        priceType: 'fixed',
        chartInstance: null,
        rawRecords: [],
        hiddenSeries: new Set(),
        yAxisZoomEnabled: false,

        // Single Price mode
        singleLocation: '',
        tradeDates: [],

        // Multi-Price mode
        multiTradeDate: '',
        multiLocations: [],

        // By Contract mode
        contractMonth: '',
        contractDateRange: {start: '', end: ''},
        contractLocations: [],

        // Location Database
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
                { name: 'Texas Eastern S. TX', value: 'STXTETCO' },
                { name: 'Transco Zone 1', value: 'STXST30' }
            ],
            'East Texas': [
                { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
                { name: 'Katy', value: 'ETXKATY' },
                { name: 'Transco Zone 2', value: 'ETXST45' }
            ],
            'West Texas': [
                { name: 'El Paso Permian', value: 'WTXEPP' },
                { name: 'Waha', value: 'WTXWAHA' }
            ],
            'Midwest': [
                { name: 'Chicago Citygate', value: 'MCWCCITY' },
                { name: 'Dawn', value: 'MCWDAWN' }
            ],
            'South Louisiana': [
                { name: 'Henry Hub', value: 'SLAHH' },
                { name: 'Southern Natural', value: 'SLASONAT' }
            ],
            'California': [
                { name: 'PG&E Citygate', value: 'CALPGCG' },
                { name: 'SoCal Citygate', value: 'CALSCG' }
            ],
            'Northeast': [
                { name: 'Algonquin Citygate', value: 'NEAALGCG' },
                { name: 'Transco Zone 6 NY', value: 'NEATZ6NY' }
            ]
        }
    },

    // --- INITIALIZATION ---
    init: async function() {
        this.setupLocations();
        await this.fetchLatestDateAndSetupDates();
        this.setupContractMonths();
        this.bindEvents();
        this.setMode(this.state.mode);
        this.setSystemStatus('ready');
        this.log('System initialized.');
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

    fetchLatestDateAndSetupDates: async function() {
        try {
            this.log('Fetching latest available issue date from API...');
            const res = await fetch('/api/forward-latest-date');
            const data = await res.json();

            if (data.success && data.latest_issue_date) {
                this.log(`Latest available issue date: ${data.latest_issue_date}`);
                this.setupDates(data.latest_issue_date);
            } else {
                this.log('Could not fetch latest issue date, using fallback defaults');
                this.setupDates(null);
            }
        } catch (err) {
            this.log(`Error fetching latest issue date: ${err.message}. Using fallback defaults.`);
            this.setupDates(null);
        }
    },

    setupDates: function(latestIssueDate = null) {
        let latestIssueDateObj;

        if (latestIssueDate) {
            // Use the API-provided latest issue date
            latestIssueDateObj = new Date(latestIssueDate + 'T00:00:00');
        } else {
            // Fallback to today if API call failed
            latestIssueDateObj = new Date();
        }

        const oneDayBefore = new Date(latestIssueDateObj);
        oneDayBefore.setDate(latestIssueDateObj.getDate() - 1);
        const twoDaysBefore = new Date(latestIssueDateObj);
        twoDaysBefore.setDate(latestIssueDateObj.getDate() - 2);
        const twoMonthsAgo = new Date(latestIssueDateObj);
        twoMonthsAgo.setMonth(latestIssueDateObj.getMonth() - 2);

        // Set default dates using the latest available issue date
        document.getElementById('tradeDateInput').value = latestIssueDateObj.toISOString().split('T')[0];
        document.getElementById('multiTradeDate').value = latestIssueDateObj.toISOString().split('T')[0];
        document.getElementById('contractEndDate').value = latestIssueDateObj.toISOString().split('T')[0];
        document.getElementById('contractStartDate').value = twoMonthsAgo.toISOString().split('T')[0];

        // Default issue dates for single price mode - use latest and 2 days before
        this.state.tradeDates = [
            twoDaysBefore.toISOString().split('T')[0],
            oneDayBefore.toISOString().split('T')[0],
            latestIssueDateObj.toISOString().split('T')[0]
        ];
        this.renderTradeDatesList();
    },

    setupContractMonths: function() {
        const contractSelect = document.getElementById('contractMonthSelect');
        contractSelect.innerHTML = '';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Generate contracts for next 5 years
        for (let yearOffset = 0; yearOffset < 6; yearOffset++) {
            const year = currentYear + yearOffset;
            const startMonth = yearOffset === 0 ? currentMonth : 0;

            for (let month = startMonth; month < 12; month++) {
                const contractValue = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const contractLabel = `${monthNames[month]} ${year}`;
                const opt = document.createElement('option');
                opt.value = contractValue;
                opt.text = contractLabel;
                contractSelect.appendChild(opt);
            }
        }

        // Set default to 6 months out
        if (contractSelect.options.length > 6) {
            contractSelect.selectedIndex = 6;
        }
    },

    setupLocations: function() {
        // Setup single location select
        const singleLocationSelect = document.getElementById('singleLocationSelect');
        singleLocationSelect.innerHTML = '';
        Object.entries(this.state.locations).forEach(([region, locs]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region;
            locs.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc.value;
                opt.text = loc.name;
                opt.dataset.name = loc.name;
                optgroup.appendChild(opt);
            });
            singleLocationSelect.appendChild(optgroup);
        });
        this.state.singleLocation = singleLocationSelect.value;

        // Setup multi-price region/location selects
        const regionSelectMulti = document.getElementById('regionSelectMulti');
        regionSelectMulti.innerHTML = '';
        Object.keys(this.state.locations).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.text = r;
            regionSelectMulti.appendChild(opt);
        });
        this.updateMultiLocationDropdown();

        // Setup by-contract region/location selects
        const regionSelectContract = document.getElementById('regionSelectContract');
        regionSelectContract.innerHTML = '';
        Object.keys(this.state.locations).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.text = r;
            regionSelectContract.appendChild(opt);
        });
        this.updateContractLocationDropdown();
    },

    updateMultiLocationDropdown: function() {
        const region = document.getElementById('regionSelectMulti').value;
        const locSelect = document.getElementById('locationSelectMulti');
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

    updateContractLocationDropdown: function() {
        const region = document.getElementById('regionSelectContract').value;
        const locSelect = document.getElementById('locationSelectContract');
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
        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Price type radio buttons
        document.querySelectorAll('input[name="priceType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.priceType = e.target.value;
                this.log(`Price type changed to: ${e.target.value}`);
            });
        });

        // Single Price mode
        document.getElementById('singleLocationSelect').addEventListener('change', (e) => {
            this.state.singleLocation = e.target.value;
        });

        document.getElementById('addTradeDateBtn').addEventListener('click', () => {
            const dateInput = document.getElementById('tradeDateInput');
            if (dateInput.value && !this.state.tradeDates.includes(dateInput.value)) {
                this.state.tradeDates.push(dateInput.value);
                this.renderTradeDatesList();
                this.log(`Added trade date: ${dateInput.value}`);
            }
        });

        // Multi-Price mode
        document.getElementById('regionSelectMulti').addEventListener('change', () => this.updateMultiLocationDropdown());

        document.getElementById('addLocationMultiBtn').addEventListener('click', () => {
            const sel = document.getElementById('locationSelectMulti');
            if (sel.selectedIndex >= 0) {
                const opt = sel.options[sel.selectedIndex];
                const existing = this.state.multiLocations.find(l => l.code === opt.value);
                if (!existing) {
                    this.state.multiLocations.push({code: opt.value, name: opt.dataset.name});
                    this.renderMultiLocationsList();
                    this.log(`Added location: ${opt.dataset.name}`);
                }
            }
        });

        // By Contract mode
        document.getElementById('regionSelectContract').addEventListener('change', () => this.updateContractLocationDropdown());

        document.getElementById('addLocationContractBtn').addEventListener('click', () => {
            const sel = document.getElementById('locationSelectContract');
            if (sel.selectedIndex >= 0) {
                const opt = sel.options[sel.selectedIndex];
                const existing = this.state.contractLocations.find(l => l.code === opt.value);
                if (!existing) {
                    this.state.contractLocations.push({code: opt.value, name: opt.dataset.name});
                    this.renderContractLocationsList();
                    this.log(`Added location: ${opt.dataset.name}`);
                }
            }
        });

        // Analyze
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());

        // Log drawer
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

        // Copy table
        document.getElementById('copyTableBtn').addEventListener('click', () => this.copyTable());

        // Y-Axis Zoom
        const yZoomToggle = document.getElementById('toggleYZoom');
        if(yZoomToggle) {
            yZoomToggle.addEventListener('change', (e) => this.toggleYAxisZoom(e.target.checked));
        }
    },

    setMode: function(mode) {
        this.state.mode = mode;
        this.state.hiddenSeries.clear();
        this.log(`Switched to [${mode.toUpperCase()}] mode.`);

        // Update tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            if(btn.dataset.mode === mode) {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-900 border-b-2 border-gray-900 bg-white';
            } else {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-600 hover:bg-gray-50';
            }
        });

        // Show/hide sections
        document.getElementById('singlePriceSection').classList.toggle('hidden', mode !== 'single_price');
        document.getElementById('multiPriceSection').classList.toggle('hidden', mode !== 'multi_price');
        document.getElementById('byContractSection').classList.toggle('hidden', mode !== 'by_contract');
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

    renderTradeDatesList: function() {
        const container = document.getElementById('tradeDatesList');
        const emptyMsg = document.getElementById('emptyDatesMsg');

        if (this.state.tradeDates.length === 0) {
            emptyMsg.classList.remove('hidden');
            Array.from(container.querySelectorAll('.date-item')).forEach(el => el.remove());
            return;
        }

        emptyMsg.classList.add('hidden');
        // Remove only the date items, not the entire container content
        Array.from(container.querySelectorAll('.date-item')).forEach(el => el.remove());

        this.state.tradeDates.forEach((date, index) => {
            const div = document.createElement('div');
            div.className = 'date-item flex justify-between items-center bg-white p-2 border border-gray-300 text-sm mb-1 cursor-move hover:bg-gray-50';
            div.draggable = true;
            div.dataset.index = index;

            // Drag and drop handlers
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', div.innerHTML);
                div.classList.add('opacity-50');
                this.draggedDateIndex = index;
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('opacity-50');
            });

            div.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                div.classList.add('border-blue-500', 'border-2');
            });

            div.addEventListener('dragleave', () => {
                div.classList.remove('border-blue-500', 'border-2');
            });

            div.addEventListener('drop', (e) => {
                e.preventDefault();
                div.classList.remove('border-blue-500', 'border-2');
                const dropIndex = parseInt(div.dataset.index);
                if (this.draggedDateIndex !== dropIndex) {
                    const dates = [...this.state.tradeDates];
                    const [movedDate] = dates.splice(this.draggedDateIndex, 1);
                    dates.splice(dropIndex, 0, movedDate);
                    this.state.tradeDates = dates;
                    this.renderTradeDatesList();
                    this.log(`Reordered trade dates`);
                }
            });

            const dragHandle = document.createElement('span');
            dragHandle.className = 'text-gray-400 mr-2 select-none';
            dragHandle.innerHTML = '&#8942;&#8942;';
            dragHandle.style.fontSize = '14px';

            const label = document.createElement('span');
            label.className = 'flex-1';
            label.textContent = date;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.state.tradeDates = this.state.tradeDates.filter(d => d !== date);
                this.renderTradeDatesList();
                this.log(`Removed trade date: ${date}`);
            });

            div.appendChild(dragHandle);
            div.appendChild(label);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    },

    renderMultiLocationsList: function() {
        const container = document.getElementById('multiLocationsList');
        const emptyMsg = document.getElementById('emptyMultiLocationsMsg');

        if (this.state.multiLocations.length === 0) {
            emptyMsg.classList.remove('hidden');
            Array.from(container.querySelectorAll('.location-item')).forEach(el => el.remove());
            return;
        }

        emptyMsg.classList.add('hidden');
        // Remove only the location items, not the entire container content
        Array.from(container.querySelectorAll('.location-item')).forEach(el => el.remove());

        this.state.multiLocations.forEach((loc, index) => {
            const div = document.createElement('div');
            div.className = 'location-item flex justify-between items-center bg-white p-2 border border-gray-300 text-sm mb-1 cursor-move hover:bg-gray-50';
            div.draggable = true;
            div.dataset.index = index;

            // Drag and drop handlers
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', div.innerHTML);
                div.classList.add('opacity-50');
                this.draggedMultiLocationIndex = index;
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('opacity-50');
            });

            div.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                div.classList.add('border-blue-500', 'border-2');
            });

            div.addEventListener('dragleave', () => {
                div.classList.remove('border-blue-500', 'border-2');
            });

            div.addEventListener('drop', (e) => {
                e.preventDefault();
                div.classList.remove('border-blue-500', 'border-2');
                const dropIndex = parseInt(div.dataset.index);
                if (this.draggedMultiLocationIndex !== dropIndex) {
                    const locations = [...this.state.multiLocations];
                    const [movedLocation] = locations.splice(this.draggedMultiLocationIndex, 1);
                    locations.splice(dropIndex, 0, movedLocation);
                    this.state.multiLocations = locations;
                    this.renderMultiLocationsList();
                    this.log(`Reordered locations`);
                }
            });

            const dragHandle = document.createElement('span');
            dragHandle.className = 'text-gray-400 mr-2 select-none';
            dragHandle.innerHTML = '&#8942;&#8942;';
            dragHandle.style.fontSize = '14px';

            const label = document.createElement('span');
            label.className = 'flex-1';
            label.textContent = loc.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.state.multiLocations = this.state.multiLocations.filter(l => l.code !== loc.code);
                this.renderMultiLocationsList();
                this.log(`Removed location: ${loc.name}`);
            });

            div.appendChild(dragHandle);
            div.appendChild(label);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    },

    renderContractLocationsList: function() {
        const container = document.getElementById('contractLocationsList');
        const emptyMsg = document.getElementById('emptyContractLocationsMsg');

        if (this.state.contractLocations.length === 0) {
            emptyMsg.classList.remove('hidden');
            Array.from(container.querySelectorAll('.location-item')).forEach(el => el.remove());
            return;
        }

        emptyMsg.classList.add('hidden');
        // Remove only the location items, not the entire container content
        Array.from(container.querySelectorAll('.location-item')).forEach(el => el.remove());

        this.state.contractLocations.forEach((loc, index) => {
            const div = document.createElement('div');
            div.className = 'location-item flex justify-between items-center bg-white p-2 border border-gray-300 text-sm mb-1 cursor-move hover:bg-gray-50';
            div.draggable = true;
            div.dataset.index = index;

            // Drag and drop handlers
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', div.innerHTML);
                div.classList.add('opacity-50');
                this.draggedContractLocationIndex = index;
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('opacity-50');
            });

            div.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                div.classList.add('border-blue-500', 'border-2');
            });

            div.addEventListener('dragleave', () => {
                div.classList.remove('border-blue-500', 'border-2');
            });

            div.addEventListener('drop', (e) => {
                e.preventDefault();
                div.classList.remove('border-blue-500', 'border-2');
                const dropIndex = parseInt(div.dataset.index);
                if (this.draggedContractLocationIndex !== dropIndex) {
                    const locations = [...this.state.contractLocations];
                    const [movedLocation] = locations.splice(this.draggedContractLocationIndex, 1);
                    locations.splice(dropIndex, 0, movedLocation);
                    this.state.contractLocations = locations;
                    this.renderContractLocationsList();
                    this.log(`Reordered locations`);
                }
            });

            const dragHandle = document.createElement('span');
            dragHandle.className = 'text-gray-400 mr-2 select-none';
            dragHandle.innerHTML = '&#8942;&#8942;';
            dragHandle.style.fontSize = '14px';

            const label = document.createElement('span');
            label.className = 'flex-1';
            label.textContent = loc.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-500 hover:text-red-600 font-bold px-1';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.state.contractLocations = this.state.contractLocations.filter(l => l.code !== loc.code);
                this.renderContractLocationsList();
                this.log(`Removed location: ${loc.name}`);
            });

            div.appendChild(dragHandle);
            div.appendChild(label);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    },

    analyze: async function() {
        const btn = document.getElementById('analyzeBtn');
        const mode = this.state.mode;
        const priceType = this.state.priceType;

        // Validation
        if (mode === 'single_price' && this.state.tradeDates.length === 0) {
            alert('Please add at least one trade date.');
            return;
        }
        if (mode === 'multi_price') {
            if (!document.getElementById('multiTradeDate').value) {
                alert('Please select a trade date.');
                return;
            }
            if (this.state.multiLocations.length === 0) {
                alert('Please add at least one location.');
                return;
            }
        }
        if (mode === 'by_contract') {
            if (!document.getElementById('contractStartDate').value || !document.getElementById('contractEndDate').value) {
                alert('Please select a date range.');
                return;
            }
            if (this.state.contractLocations.length === 0) {
                alert('Please add at least one location.');
                return;
            }
        }

        btn.textContent = 'Fetching...';
        btn.disabled = true;
        this.setSystemStatus('working');

        this.state.rawRecords = [];
        this.state.hiddenSeries.clear();

        const params = new URLSearchParams();
        params.append('mode', mode);
        params.append('price_type', priceType);

        if (mode === 'single_price') {
            params.append('location', this.state.singleLocation);
            this.state.tradeDates.forEach(date => {
                params.append('issue_dates[]', date);
            });
        } else if (mode === 'multi_price') {
            const tradeDate = document.getElementById('multiTradeDate').value;
            params.append('issue_date', tradeDate);
            this.state.multiLocations.forEach(loc => {
                params.append('locations[]', loc.code);
            });
        } else if (mode === 'by_contract') {
            params.append('contract', document.getElementById('contractMonthSelect').value);
            params.append('start_date', document.getElementById('contractStartDate').value);
            params.append('end_date', document.getElementById('contractEndDate').value);
            this.state.contractLocations.forEach(loc => {
                params.append('locations[]', loc.code);
            });
        }

        try {
            this.log(`Requesting analysis: ${params.toString()}`);
            const res = await fetch(`/api/forward-prices?${params.toString()}`);
            const text = await res.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch(parseErr) {
                throw new Error('Unexpected response from server. Please refresh your session.');
            }

            // Check for session expiration
            if (res.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...', 'error');
                window.location.href = '/auth';
                return;
            }

            if(!res.ok) {
                throw new Error(data.error || `API Error ${res.status}`);
            }

            this.state.rawRecords = Array.isArray(data.raw_records) ? data.raw_records : [];
            this.renderChart(data);
            this.renderTable(data);

            // Display warning if some dates failed
            if (data.metadata && data.metadata.warning) {
                this.log(`⚠️ Warning: ${data.metadata.warning}`);
            }

            this.log(`Analysis complete. Received ${(data.dates && data.dates.length) || 0} data points.`);

        } catch(err) {
            this.log(`Error: ${err.message}`);
            alert(err.message);
            this.setSystemStatus('error');
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

        this.state.chartInstance.clear();
        this.updateChartHeader(data);
        this.updateCustomLegend(data);

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
                    showDetail: false
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
                bottom: 80,
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
                    fontSize: 10,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    rotate: 45
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
                const seriesColor = s.color || s.itemStyle?.color || s.lineStyle?.color;
                return {
                    ...s,
                    color: seriesColor,
                    lineStyle: {
                        ...s.lineStyle,
                        color: seriesColor,
                        width: s.lineStyle?.width || 2,
                        opacity: isHidden ? 0 : (s.lineStyle?.opacity ?? 1)
                    },
                    itemStyle: {
                        ...s.itemStyle,
                        color: seriesColor,
                        opacity: isHidden ? 0 : (s.itemStyle?.opacity ?? 1)
                    },
                    smooth: false,
                    silent: isHidden
                };
            })
        };

        this.state.chartInstance.setOption(option, { notMerge: true, replaceMerge: ['series'] });
    },

    toggleYAxisZoom: function(enabled) {
        this.state.yAxisZoomEnabled = enabled;

        if (this.state.chartInstance) {
            const currentOption = this.state.chartInstance.getOption();
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
                        showDetail: false
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
                    bottom: 80,
                    top: 20,
                    containLabel: false
                }
            };

            this.state.chartInstance.setOption(newOption, { notMerge: true });
        }
    },

    updateChartHeader: function(data) {
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const mode = this.state.mode;
        const priceType = this.state.priceType;
        const priceLabel = priceType === 'fixed' ? 'Fixed Price' : 'Basis';

        let title = `Forward Prices - ${priceLabel}`;
        let subtitle = '';

        if (mode === 'single_price' && data.metadata) {
            title = `${data.metadata.location_name} - ${priceLabel} Forward Curve`;
            subtitle = `Comparing ${this.state.tradeDates.length} trade date${this.state.tradeDates.length > 1 ? 's' : ''}`;
        } else if (mode === 'multi_price' && data.metadata) {
            title = `${priceLabel} Forward Curves`;
            subtitle = `${this.state.multiLocations.length} locations on ${data.metadata.trade_date || data.metadata.issue_date}`;
        } else if (mode === 'by_contract' && data.metadata) {
            title = `${data.metadata.contract_month} Contract - ${priceLabel}`;
            subtitle = `Price evolution for ${this.state.contractLocations.length} location${this.state.contractLocations.length > 1 ? 's' : ''}`;
        }

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
    },

    updateCustomLegend: function(data) {
        const legendEl = document.getElementById('customLegend');
        legendEl.innerHTML = '';

        const visibleSeries = data.series.filter(s => s.name && s.name !== '');

        visibleSeries.forEach(series => {
            const seriesName = series.name;
            const isHidden = this.state.hiddenSeries.has(seriesName);

            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 cursor-pointer select-none hover:opacity-75 transition-opacity';

            item.addEventListener('click', () => this.toggleSeriesVisibility(seriesName));

            const line = document.createElement('div');
            line.className = 'h-0.5 w-5 transition-opacity';
            const color = series.color || series.itemStyle?.color || series.lineStyle?.color || '#000';
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

            this.state.chartInstance.setOption({
                series: updatedSeries
            });

            // Update legend styling
            const legendEl = document.getElementById('customLegend');
            const items = legendEl.querySelectorAll('div.flex');
            items.forEach(item => {
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

    renderTable: function(data) {
        const headerRow = document.getElementById('tableHeaderRow');
        headerRow.innerHTML = '';
        data.table_columns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300';
            th.textContent = col;
            headerRow.appendChild(th);
        });

        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        data.table_rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            data.table_columns.forEach((col, idx) => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 text-sm text-gray-700';

                let val = row[col] || row.contract || row.date;
                if (idx === 0) {
                    val = row.contract || row.date || Object.values(row)[0];
                } else {
                    val = row[col];
                }

                if (val === null || val === undefined) {
                    td.textContent = '-';
                } else if (typeof val === 'number') {
                    td.textContent = '$' + val.toFixed(3);
                } else {
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
