/**
 * Strip Calculator - Frontend Logic
 * Calculates seasonal strip prices from forward curves.
 */

const StripCalculator = {
    // =====================================================================
    // STATE
    // =====================================================================
    state: {
        cancelled: false,
        lastCalculation: null
    },

    // =====================================================================
    // LOCATION DATA
    // =====================================================================
    LOCATIONS: {
        'Favorites': [
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Transco Zone 5', value: 'NEATRANZ5' },
            { name: 'Texas Eastern M-2, 30 Receipt', value: 'NEATETM2REC' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' },
            { name: 'PG&E Citygate', value: 'CALPGCG' },
            { name: 'SoCal Citygate', value: 'CALSCG' }
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
        'West Texas/SE New Mexico': [
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'Transwestern', value: 'WTXTW' },
            { name: 'Waha', value: 'WTXWAHA' }
        ],
        'Midwest': [
            { name: 'Alliance', value: 'MCWALL' },
            { name: 'ANR ML7', value: 'MCWML7' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Consumers Energy', value: 'MCWCONS' },
            { name: 'Dawn', value: 'MCWDAWN' },
            { name: 'Michigan Consolidated', value: 'MCWMCON' },
            { name: 'NGPL Midcontinent', value: 'MCWNGPL' }
        ],
        'Midcontinent': [
            { name: 'ANR SW', value: 'MCWANR' },
            { name: 'Enable East', value: 'MCWNORE' },
            { name: 'NGPL Midcontinent', value: 'MCWNGPL' },
            { name: 'Northern Natural Demarc', value: 'MCWDMARK' },
            { name: 'OGT', value: 'MCWONG' },
            { name: 'Panhandle Eastern', value: 'MCWPEPL' },
            { name: 'Southern Star', value: 'MCWWILL' }
        ],
        'North Louisiana/Arkansas': [
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
        'Appalachia': [
            { name: 'Columbia Gas', value: 'NEATCO' },
            { name: 'Eastern Gas South', value: 'NEACNG' },
            { name: 'Tennessee Zn 4 Marcellus', value: 'NEATENN4MAR' },
            { name: 'Texas Eastern M-2, 30 Receipt', value: 'NEATETM2REC' },
            { name: 'Texas Eastern M-3, Delivery', value: 'NEATETM3DEL' },
            { name: 'Transco-Leidy Line', value: 'NEALEIDYT' }
        ],
        'Northeast': [
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Algonquin Receipts', value: 'NEAALGIN' },
            { name: 'Dracut', value: 'NEADRACUT' },
            { name: 'Iroquois Zone 2', value: 'NEAIRO' },
            { name: 'Niagara', value: 'MCWNIAGR' },
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

    // =====================================================================
    // STRIP DEFINITIONS
    // =====================================================================
    STRIP_DEFINITIONS: {
        winter: ['11', '12', '01', '02', '03'],  // Nov-Mar
        summer: ['04', '05', '06', '07', '08', '09', '10']  // Apr-Oct
    },

    // =====================================================================
    // INITIALIZATION
    // =====================================================================
    init: function() {
        this.bindEvents();
        this.updateLocations();
        this.setDefaultDates();
        this.setSystemStatus('ready');
        this.log('System initialized.');
    },

    // =====================================================================
    // LOGGING
    // =====================================================================
    log: function(msg, type = 'info') {
        const time = new Date().toLocaleTimeString();
        let colorClass = 'text-gray-300';
        if (type === 'error') colorClass = 'text-red-400';
        else if (type === 'success') colorClass = 'text-green-400';
        else if (type === 'warn') colorClass = 'text-yellow-400';

        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800 ${colorClass}"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if (logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if (lastLog) lastLog.textContent = msg;
    },

    setSystemStatus: function(state) {
        const dot = document.getElementById('statusDot');
        const label = document.getElementById('statusLabel');
        if (!dot || !label) return;

        const base = 'w-2 h-2 rounded-full';
        switch (state) {
            case 'working':
                dot.className = `${base} bg-yellow-500 animate-pulse`;
                label.textContent = 'Working';
                break;
            case 'error':
                dot.className = `${base} bg-red-500`;
                label.textContent = 'Error';
                break;
            default:
                dot.className = `${base} bg-green-500`;
                label.textContent = 'Ready';
        }
    },

    // =====================================================================
    // UI HELPERS
    // =====================================================================
    showToast: function(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    updateProgress: function(current, total) {
        const pct = total > 0 ? (current / total) * 100 : 0;
        document.getElementById('progressBarFill').style.width = pct + '%';
        document.getElementById('progressCount').textContent = `${current} / ${total}`;
    },

    setDefaultDates: function() {
        const now = new Date();
        const easternToday = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        const today = new Date(easternToday + 'T00:00:00');

        // End date = yesterday, Start date = 30 days before that
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const thirtyDaysAgo = new Date(yesterday);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        document.getElementById('endDate').value = yesterday.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    },

    updateLocations: function() {
        const region = document.getElementById('region').value;
        const locationSelect = document.getElementById('location');
        locationSelect.innerHTML = '';

        this.LOCATIONS[region].forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.name;
            option.textContent = loc.name;
            locationSelect.appendChild(option);
        });
    },

    // =====================================================================
    // EVENT BINDING
    // =====================================================================
    bindEvents: function() {
        document.getElementById('region').addEventListener('change', () => this.updateLocations());
        document.getElementById('stripForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelCalculation());
        document.getElementById('copyTableBtn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadExcelBtn').addEventListener('click', () => this.downloadExcel());

        // Log drawer toggle
        document.getElementById('logToggle').addEventListener('click', () => {
            const drawer = document.getElementById('logDrawer');
            const arrow = document.getElementById('logArrow');
            if (drawer.classList.contains('h-0')) {
                drawer.classList.remove('h-0');
                drawer.classList.add('h-80');
                arrow.classList.add('rotate-180');
            } else {
                drawer.classList.add('h-0');
                drawer.classList.remove('h-80');
                arrow.classList.remove('rotate-180');
            }
        });
    },

    // =====================================================================
    // DATE UTILITIES
    // =====================================================================
    parseDate: function(dateStr) {
        return new Date(dateStr + 'T00:00:00');
    },

    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    addBusinessDays: function(dateStr, days) {
        const date = this.parseDate(dateStr);
        let daysToAdd = days;

        while (daysToAdd !== 0) {
            date.setDate(date.getDate() + (daysToAdd > 0 ? 1 : -1));
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                daysToAdd += (daysToAdd > 0 ? -1 : 1);
            }
        }
        return this.formatDate(date);
    },

    generateBusinessDates: function(startDate, endDate) {
        const dates = [];
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);
        let current = new Date(start);

        while (current <= end) {
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                dates.push(this.formatDate(current));
            }
            current.setDate(current.getDate() + 1);
        }
        return dates;
    },

    // =====================================================================
    // STRIP CALCULATION LOGIC
    // =====================================================================
    getSeasonForDate: function(tradeDate) {
        const date = this.parseDate(tradeDate);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        if (month >= 11) {
            return { season: 'winter', year: year };
        } else if (month <= 3) {
            return { season: 'winter', year: year - 1 };
        } else {
            return { season: 'summer', year: year };
        }
    },

    getActiveStrips: function(tradeDate, numStrips = 5) {
        const { season, year } = this.getSeasonForDate(tradeDate);
        const strips = [];

        if (season === 'winter') {
            strips.push({ name: `Winter ${year}/${year + 1}`, type: 'winter', year: year, balance_of: true });
            for (let i = 0; i < Math.ceil(numStrips / 2); i++) {
                strips.push({ name: `Summer ${year + 1 + i}`, type: 'summer', year: year + 1 + i, balance_of: false });
                strips.push({ name: `Winter ${year + 1 + i}/${year + 2 + i}`, type: 'winter', year: year + 1 + i, balance_of: false });
            }
        } else {
            strips.push({ name: `Summer ${year}`, type: 'summer', year: year, balance_of: true });
            for (let i = 0; i < Math.ceil(numStrips / 2); i++) {
                strips.push({ name: `Winter ${year + i}/${year + 1 + i}`, type: 'winter', year: year + i, balance_of: false });
                strips.push({ name: `Summer ${year + 1 + i}`, type: 'summer', year: year + 1 + i, balance_of: false });
            }
        }

        return strips.slice(0, numStrips);
    },

    getPromptContract: function(contracts, prices, tradeDate) {
        const tradeDateObj = this.parseDate(tradeDate);
        const forwardContracts = [];

        for (let i = 0; i < contracts.length; i++) {
            const contract = contracts[i];
            try {
                const parts = contract.split('-');
                const contractYear = parseInt(parts[0]);
                const contractMonth = parseInt(parts[1]);
                const contractDate = new Date(contractYear, contractMonth - 1, 1);

                if (contractDate > tradeDateObj) {
                    forwardContracts.push({ date: contractDate, name: contract, price: prices[i] });
                }
            } catch (e) { continue; }
        }

        if (forwardContracts.length === 0) return { contract: null, price: null };

        forwardContracts.sort((a, b) => a.date - b.date);
        return { contract: forwardContracts[0].name, price: forwardContracts[0].price };
    },

    calculateStripPrice: function(contracts, prices, stripDef, tradeDate) {
        const stripMonths = this.STRIP_DEFINITIONS[stripDef.type];
        const tradeDateObj = this.parseDate(tradeDate);
        const relevantPrices = [];

        for (let i = 0; i < contracts.length; i++) {
            const contract = contracts[i];
            try {
                const parts = contract.split('-');
                const contractYear = parseInt(parts[0]);
                const contractMonth = String(parseInt(parts[1])).padStart(2, '0');
                const contractDate = new Date(contractYear, parseInt(contractMonth) - 1, 1);

                if (contractDate <= tradeDateObj) continue;
                if (!stripMonths.includes(contractMonth)) continue;

                let contractStripYear;
                if (stripDef.type === 'winter') {
                    contractStripYear = (contractMonth === '11' || contractMonth === '12') ? contractYear : contractYear - 1;
                } else {
                    contractStripYear = contractYear;
                }

                if (contractStripYear !== stripDef.year) continue;

                relevantPrices.push(prices[i]);
            } catch (e) { continue; }
        }

        if (relevantPrices.length === 0) return null;
        return relevantPrices.reduce((a, b) => a + b, 0) / relevantPrices.length;
    },

    getStripDetails: function(contracts, prices, stripDef, tradeDate) {
        const stripMonths = this.STRIP_DEFINITIONS[stripDef.type];
        const tradeDateObj = this.parseDate(tradeDate);
        const details = [];

        for (let i = 0; i < contracts.length; i++) {
            const contract = contracts[i];
            try {
                const parts = contract.split('-');
                const contractYear = parseInt(parts[0]);
                const contractMonth = String(parseInt(parts[1])).padStart(2, '0');
                const contractDate = new Date(contractYear, parseInt(contractMonth) - 1, 1);

                if (contractDate <= tradeDateObj) continue;
                if (!stripMonths.includes(contractMonth)) continue;

                let contractStripYear;
                if (stripDef.type === 'winter') {
                    contractStripYear = (contractMonth === '11' || contractMonth === '12') ? contractYear : contractYear - 1;
                } else {
                    contractStripYear = contractYear;
                }

                if (contractStripYear !== stripDef.year) continue;

                details.push({ contract, price: prices[i] });
            } catch (e) { continue; }
        }

        return details;
    },

    // =====================================================================
    // MAIN CALCULATION
    // =====================================================================
    async handleSubmit(e) {
        e.preventDefault();
        this.state.cancelled = false;

        const locationName = document.getElementById('location').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const priceType = document.querySelector('input[name="priceType"]:checked').value;
        const numStrips = parseInt(document.getElementById('numStrips').value);

        if (!locationName || !startDate || !endDate) {
            alert('Please fill in all required fields');
            return;
        }

        // UI setup
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('cancelBtn').classList.remove('hidden');
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultsContainer').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');

        this.setSystemStatus('working');
        this.log('Starting strip calculation...');
        this.log(`Location: ${locationName}, Price Type: ${priceType}, Strips: ${numStrips}`);

        try {
            // Convert trade dates to issue dates
            const issueStartDate = this.addBusinessDays(startDate, 1);
            const issueEndDate = this.addBusinessDays(endDate, 1);
            this.log(`Trade date range: ${startDate} to ${endDate}`);
            this.log(`Issue date range: ${issueStartDate} to ${issueEndDate}`);

            // Generate issue dates
            const issueDates = this.generateBusinessDates(issueStartDate, issueEndDate);
            this.log(`Processing ${issueDates.length} business days...`);

            const results = [];
            const detailedData = [];
            let skipped = 0;

            // Process each issue date
            for (let i = 0; i < issueDates.length; i++) {
                if (this.state.cancelled) {
                    this.log('Calculation cancelled by user.', 'warn');
                    break;
                }

                const issueDate = issueDates[i];
                const tradeDate = this.addBusinessDays(issueDate, -1);
                this.updateProgress(i + 1, issueDates.length);

                try {
                    this.log(`[${i + 1}/${issueDates.length}] Fetching issue date ${issueDate} (trade ${tradeDate})...`);

                    const response = await fetch(`/api/forward-location?issue_date=${issueDate}&location=${encodeURIComponent(locationName)}`);

                    // Check for authentication errors
                    if (response.status === 401) {
                        this.log('Session expired. Redirecting to login...', 'error');
                        this.setSystemStatus('error');
                        window.location.href = '/auth';
                        return;
                    }

                    // Check content type to avoid parsing HTML as JSON
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        skipped++;
                        this.log(`[${i + 1}/${issueDates.length}] ${issueDate} - Invalid response (not JSON)`, 'warn');
                        continue;
                    }

                    const data = await response.json();

                    // Check for auth_required flag
                    if (data.auth_required) {
                        this.log('Session expired. Redirecting to login...', 'error');
                        this.setSystemStatus('error');
                        window.location.href = '/auth';
                        return;
                    }

                    if (!response.ok || !data.success) {
                        skipped++;
                        this.log(`[${i + 1}/${issueDates.length}] ${issueDate} - No data (weekend/holiday)`, 'warn');
                        continue;
                    }

                    const contracts = data.contracts || [];
                    const prices = priceType === 'basis' ? data.basis_prices : data.fixed_prices;

                    // Get prompt contract
                    const { contract: promptContract, price: promptPrice } = this.getPromptContract(contracts, prices, issueDate);

                    // Get active strips and calculate
                    const activeStrips = this.getActiveStrips(issueDate, numStrips);
                    const stripPrices = {};
                    const stripDetails = {};

                    for (const stripDef of activeStrips) {
                        const price = this.calculateStripPrice(contracts, prices, stripDef, issueDate);
                        if (price !== null) {
                            stripPrices[stripDef.name] = Math.round(price * 1000) / 1000;
                            stripDetails[stripDef.name] = this.getStripDetails(contracts, prices, stripDef, issueDate);
                        }
                    }

                    if (Object.keys(stripPrices).length > 0 || promptPrice !== null) {
                        const resultEntry = { trade_date: tradeDate, strips: stripPrices };
                        if (promptPrice !== null) {
                            resultEntry.prompt_contract = promptContract;
                            resultEntry.prompt_price = Math.round(promptPrice * 1000) / 1000;
                        }
                        results.push(resultEntry);

                        detailedData.push({
                            trade_date: tradeDate,
                            prompt_contract: promptContract,
                            prompt_price: promptPrice !== null ? Math.round(promptPrice * 1000) / 1000 : null,
                            strip_details: stripDetails
                        });

                        this.log(`[${i + 1}/${issueDates.length}] ${tradeDate} - ${Object.keys(stripPrices).length} strips calculated`, 'success');
                    }

                } catch (error) {
                    skipped++;
                    this.log(`[${i + 1}/${issueDates.length}] ${issueDate} - Error: ${error.message}`, 'error');
                }
            }

            if (this.state.cancelled) {
                this.setSystemStatus('ready');
                return;
            }

            if (results.length === 0) {
                throw new Error('No data found for the selected date range and location.');
            }

            // Get unique strip names
            const stripNames = [];
            for (const result of results) {
                for (const stripName of Object.keys(result.strips)) {
                    if (!stripNames.includes(stripName)) stripNames.push(stripName);
                }
            }

            // Store for Excel export
            this.state.lastCalculation = {
                location_name: locationName,
                price_type: priceType,
                start_date: startDate,
                end_date: endDate,
                strip_names: stripNames,
                detailed_data: detailedData
            };

            // Display results
            this.displayResults({
                location: locationName,
                price_type: priceType,
                dates_processed: results.length,
                dates_skipped: skipped,
                strip_names: stripNames,
                data: results
            });

            this.log(`Completed! Processed ${results.length} dates, skipped ${skipped}.`, 'success');
            this.setSystemStatus('ready');

        } catch (error) {
            this.log(`Error: ${error.message}`, 'error');
            this.setSystemStatus('error');
            document.getElementById('errorText').textContent = error.message;
            document.getElementById('errorMessage').classList.remove('hidden');
        } finally {
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('cancelBtn').classList.add('hidden');
            document.getElementById('progressSection').classList.add('hidden');
        }
    },

    cancelCalculation: function() {
        this.state.cancelled = true;
        this.log('Cancelling...', 'warn');
    },

    // =====================================================================
    // DISPLAY RESULTS
    // =====================================================================
    displayResults: function(data) {
        document.getElementById('resultsContainer').classList.remove('hidden');

        // Update metadata
        document.getElementById('resultLocation').textContent = data.location;
        document.getElementById('resultPriceType').textContent = data.price_type === 'basis' ? 'Basis' : 'Fixed';
        document.getElementById('resultDatesProcessed').textContent = `${data.dates_processed} (${data.dates_skipped} skipped)`;

        // Build table
        this.buildTable(data);

        // Render chart
        this.renderChart(data);
    },

    buildTable: function(data) {
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Header row
        const headerRow = document.createElement('tr');
        ['Trade Date', 'Prompt', ...data.strip_names].forEach(text => {
            const th = document.createElement('th');
            th.className = 'px-3 py-2 text-sm';
            th.textContent = text;
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Data rows
        data.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            // Trade date
            const tdDate = document.createElement('td');
            tdDate.className = 'px-3 py-2 text-sm';
            tdDate.textContent = row.trade_date;
            tr.appendChild(tdDate);

            // Prompt
            const tdPrompt = document.createElement('td');
            tdPrompt.className = 'px-3 py-2 text-sm text-center';
            tdPrompt.textContent = row.prompt_price !== undefined ? row.prompt_price.toFixed(3) : '';
            tdPrompt.title = row.prompt_contract || '';
            tr.appendChild(tdPrompt);

            // Strips
            data.strip_names.forEach(stripName => {
                const td = document.createElement('td');
                td.className = 'px-3 py-2 text-sm text-center';
                const price = row.strips[stripName];
                td.textContent = price !== undefined ? price.toFixed(3) : '';
                tr.appendChild(td);
            });

            tableBody.appendChild(tr);
        });
    },

    // =====================================================================
    // CHART RENDERING
    // =====================================================================
    renderChart: function(data) {
        const chartContainer = document.getElementById('chartContainer');
        if (echarts.getInstanceByDom(chartContainer)) {
            echarts.getInstanceByDom(chartContainer).dispose();
        }

        const chart = echarts.init(chartContainer);
        const dates = data.data.map(row => row.trade_date);

        const colorPalette = [
            '#2c3e50', '#9b59b6', '#3498db', '#16a085', '#95a5a6',
            '#e74c3c', '#f39c12', '#27ae60', '#8e44ad', '#2980b9'
        ];

        const series = [];

        // Prompt series
        const promptPrices = data.data.map(row => row.prompt_price !== undefined ? row.prompt_price : null);
        if (promptPrices.some(p => p !== null)) {
            series.push({
                name: 'Prompt',
                type: 'line',
                data: promptPrices,
                smooth: false,
                symbol: 'none',
                lineStyle: { width: 2, color: colorPalette[0] },
                itemStyle: { color: colorPalette[0] },
                connectNulls: true
            });
        }

        // Strip series
        data.strip_names.forEach((stripName, index) => {
            const stripPrices = data.data.map(row => row.strips[stripName] !== undefined ? row.strips[stripName] : null);
            const colorIndex = (series.length) % colorPalette.length;
            series.push({
                name: stripName,
                type: 'line',
                data: stripPrices,
                smooth: false,
                symbol: 'none',
                lineStyle: { width: 2, color: colorPalette[colorIndex] },
                itemStyle: { color: colorPalette[colorIndex] },
                connectNulls: true
            });
        });

        const option = {
            title: {
                text: `${data.location} ${data.price_type === 'basis' ? 'Basis' : 'Fixed'} Seasonal Strips`,
                left: 'center',
                top: 10,
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#ccc',
                borderWidth: 1,
                textStyle: { color: '#000', fontSize: 12 }
            },
            legend: {
                data: series.map(s => s.name),
                top: 40,
                left: 'center',
                textStyle: { fontSize: 11 }
            },
            grid: { left: 60, right: 40, bottom: 40, top: 90 },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: { fontSize: 11, interval: Math.floor(dates.length / 8) || 0 }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: val => '$' + val.toFixed(2),
                    fontSize: 11
                }
            },
            series: series
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    },

    // =====================================================================
    // COPY TO CLIPBOARD
    // =====================================================================
    copyToClipboard: function() {
        const table = document.getElementById('resultsTable');
        let text = '';

        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell, i) => {
            text += cell.textContent;
            if (i < headerCells.length - 1) text += '\t';
        });
        text += '\n';

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, i) => {
                text += cell.textContent;
                if (i < cells.length - 1) text += '\t';
            });
            text += '\n';
        });

        navigator.clipboard.writeText(text)
            .then(() => this.showToast('Copied to clipboard'))
            .catch(err => alert('Error copying: ' + err));

        this.log('Copied table to clipboard.');
    },

    // =====================================================================
    // EXCEL EXPORT
    // =====================================================================
    downloadExcel: function() {
        if (!this.state.lastCalculation) {
            alert('No calculation data available. Please run a calculation first.');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const calc = this.state.lastCalculation;

            // Summary sheet
            const summaryData = [
                ['Location:', calc.location_name],
                ['Price Type:', calc.price_type],
                ['Start Date:', calc.start_date],
                ['End Date:', calc.end_date],
                [],
                ['Trade Date', 'Prompt Contract', 'Prompt Price', ...calc.strip_names]
            ];

            calc.detailed_data.forEach(entry => {
                const row = [
                    entry.trade_date,
                    entry.prompt_contract || '',
                    entry.prompt_price !== null ? entry.prompt_price : ''
                ];

                calc.strip_names.forEach(stripName => {
                    const details = entry.strip_details[stripName] || [];
                    if (details.length > 0) {
                        const sum = details.reduce((a, b) => a + b.price, 0);
                        row.push(Math.round((sum / details.length) * 1000) / 1000);
                    } else {
                        row.push('');
                    }
                });

                summaryData.push(row);
            });

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Sheet for each strip
            calc.strip_names.forEach(stripName => {
                const allContracts = new Set();
                calc.detailed_data.forEach(entry => {
                    (entry.strip_details[stripName] || []).forEach(detail => allContracts.add(detail.contract));
                });

                const sortedContracts = Array.from(allContracts).sort();
                const sheetData = [['Trade Date', ...sortedContracts, 'Average']];

                calc.detailed_data.forEach(entry => {
                    const row = [entry.trade_date];
                    const details = entry.strip_details[stripName] || [];
                    const detailDict = {};
                    details.forEach(d => detailDict[d.contract] = d.price);

                    const prices = [];
                    sortedContracts.forEach(contract => {
                        if (detailDict[contract] !== undefined) {
                            row.push(Math.round(detailDict[contract] * 1000) / 1000);
                            prices.push(detailDict[contract]);
                        } else {
                            row.push('');
                        }
                    });

                    row.push(prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 1000) / 1000 : '');
                    sheetData.push(row);
                });

                const sheetName = stripName.substring(0, 31).replace(/\//g, '-');
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), sheetName);
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const filename = `strip_details_${calc.location_name.replace(/ /g, '_')}_${timestamp}.xlsx`;
            XLSX.writeFile(wb, filename);

            this.log(`Downloaded Excel file: ${filename}`);
            this.showToast('Excel file downloaded');

        } catch (error) {
            this.log(`Error creating Excel: ${error.message}`, 'error');
            alert('Error creating Excel file: ' + error.message);
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => StripCalculator.init());
